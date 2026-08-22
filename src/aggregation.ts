import { startOfLocalDay, startOfLocalWeek } from "./dates";
import type { BucketSize, ModelTotal, SpendBucket, SpendSegment, UsageEvent, ViewRange } from "./types";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
export const MAX_BUCKETS = 2000;
export const MAX_MODELS_PER_BAR = 20;
export const OTHER_MODEL = "Other";

type DraftBucket = {
  key: string;
  label: string;
  spend: number;
  byModel: Map<string, number>;
};

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export function modelTotals(events: UsageEvent[]): ModelTotal[] {
  const map = new Map<string, number>();
  for (const event of events) {
    map.set(event.model, (map.get(event.model) ?? 0) + event.costUsd);
  }
  return [...map.entries()]
    .map(([model, spend]) => ({ model, spend }))
    .sort((a, b) => b.spend - a.spend || a.model.localeCompare(b.model));
}

export function uniqueModels(events: UsageEvent[]): string[] {
  return [...new Set(events.map((event) => event.model))].sort((a, b) => a.localeCompare(b));
}

export function eventsInRange(events: UsageEvent[], range: ViewRange): UsageEvent[] {
  const start = range.start?.getTime() ?? Number.NEGATIVE_INFINITY;
  const end = range.end.getTime();
  return events.filter((event) => event.timestamp >= start && event.timestamp <= end);
}

export function bucketsForWindow(
  events: UsageEvent[],
  range: ViewRange,
  bucket: BucketSize,
): { buckets: SpendBucket[]; tooMany: number | null } {
  const end = range.end.getTime();
  const start = range.start?.getTime() ?? oldestOr(events, end - DAY_MS);
  if (bucket === "1w") return weekBuckets(events, start, end);
  if (bucket === "1mo") return monthBuckets(events, start, end);
  const width = bucketWidth(bucket);
  const alignedStart = Math.floor(start / width) * width;
  const alignedEnd = Math.ceil(end / width) * width;
  const count = Math.max(1, Math.round((alignedEnd - alignedStart) / width));
  if (count > MAX_BUCKETS) return { buckets: [], tooMany: count };
  return {
    tooMany: null,
    buckets: buildFixedBuckets(events, count, alignedStart, width, (bucketStart) => ({
      key: `${bucket}-${bucketStart}`,
      label: labelForBucket(bucket, new Date(bucketStart), start, end),
    })),
  };
}

function weekBuckets(events: UsageEvent[], start: number, end: number): { buckets: SpendBucket[]; tooMany: number | null } {
  const first = startOfLocalWeek(new Date(start)).getTime();
  const starts: number[] = [];
  for (let cursor = first; cursor <= end; cursor += WEEK_MS) starts.push(cursor);
  if (starts.length > MAX_BUCKETS) return { buckets: [], tooMany: starts.length };
  return { tooMany: null, buckets: fillVariableBuckets(events, starts, end, (value) => formatDay(new Date(value))) };
}

function monthBuckets(events: UsageEvent[], start: number, end: number): { buckets: SpendBucket[]; tooMany: number | null } {
  const first = new Date(start);
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  const starts: number[] = [];
  while (cursor.getTime() <= end) {
    starts.push(cursor.getTime());
    cursor.setMonth(cursor.getMonth() + 1);
  }
  if (starts.length === 0) starts.push(new Date(first.getFullYear(), first.getMonth(), 1).getTime());
  if (starts.length > MAX_BUCKETS) return { buckets: [], tooMany: starts.length };
  return { tooMany: null, buckets: fillVariableBuckets(events, starts, end, (value) => formatMonth(new Date(value))) };
}

function fillVariableBuckets(
  events: UsageEvent[],
  starts: number[],
  rangeEnd: number,
  label: (start: number) => string,
): SpendBucket[] {
  const buckets = starts.map((start, index) =>
    emptyBucket(`v-${start}`, label(start), start, starts[index + 1] ?? rangeEnd + 1),
  );
  for (const event of events) {
    const match = buckets.find((item) => event.timestamp >= item.start && event.timestamp < item.end);
    if (match) addSpend(match, event);
  }
  return buckets.map(finishBucket);
}

function buildFixedBuckets(
  events: UsageEvent[],
  count: number,
  start: number,
  width: number,
  label: (bucketStart: number) => { key: string; label: string },
): SpendBucket[] {
  const buckets = Array.from({ length: count }, (_, index) => {
    const meta = label(start + index * width);
    return emptyBucket(meta.key, meta.label);
  });
  for (const event of events) {
    const index = Math.floor((event.timestamp - start) / width);
    if (index < 0 || index >= count) continue;
    addSpend(buckets[index], event);
  }
  return buckets.map(finishBucket);
}

function emptyBucket(key: string, label: string, start = 0, end = 0): DraftBucket & { start: number; end: number } {
  return { key, label, spend: 0, byModel: new Map(), start, end };
}

function addSpend(bucket: DraftBucket, event: UsageEvent) {
  bucket.spend += event.costUsd;
  bucket.byModel.set(event.model, (bucket.byModel.get(event.model) ?? 0) + event.costUsd);
}

function finishBucket(bucket: DraftBucket): SpendBucket {
  return {
    key: bucket.key,
    label: bucket.label,
    spend: bucket.spend,
    segments: finalizeSegments(bucket.byModel),
  };
}

function finalizeSegments(byModel: Map<string, number>): SpendSegment[] {
  const items = [...byModel.entries()]
    .map(([model, spend]) => ({ model, spend }))
    .sort((a, b) => b.spend - a.spend || a.model.localeCompare(b.model));
  if (items.length <= MAX_MODELS_PER_BAR) return items;
  const head = items.slice(0, MAX_MODELS_PER_BAR - 1);
  const other = items.slice(MAX_MODELS_PER_BAR - 1).reduce((sum, item) => sum + item.spend, 0);
  return [...head, { model: OTHER_MODEL, spend: other }];
}

function bucketWidth(bucket: Exclude<BucketSize, "1w" | "1mo">): number {
  if (bucket === "15m") return 15 * MINUTE_MS;
  if (bucket === "1h") return HOUR_MS;
  return DAY_MS;
}

function labelForBucket(bucket: BucketSize, date: Date, rangeStart: number, rangeEnd: number): string {
  const spansDays = startOfLocalDay(new Date(rangeStart)).getTime() !== startOfLocalDay(new Date(rangeEnd)).getTime();
  if (bucket === "15m") {
    return spansDays ? `${formatDay(date)} ${formatClock(date, true)}` : formatClock(date, true);
  }
  if (bucket === "1h") {
    return spansDays ? `${formatDay(date)} ${formatClock(date, false)}` : formatClock(date, false);
  }
  return formatDay(date);
}

function formatClock(date: Date, withMinutes: boolean): string {
  const hours = date.getHours();
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  if (!withMinutes) return `${hour12}${suffix}`;
  return `${hour12}:${String(date.getMinutes()).padStart(2, "0")}${suffix}`;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function oldestOr(events: UsageEvent[], fallback: number): number {
  if (events.length === 0) return fallback;
  return events.reduce((min, event) => Math.min(min, event.timestamp), events[0].timestamp);
}
