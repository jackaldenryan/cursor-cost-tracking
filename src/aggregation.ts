import { startOfLocalDay } from "./dates";
import type { BucketSize, SpendBucket, UsageEvent, ViewRange } from "./types";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
export const MAX_BUCKETS = 400;

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const buckets = starts.map((start, index) => ({
    key: `v-${start}`,
    label: label(start),
    spend: 0,
    start,
    end: starts[index + 1] ?? rangeEnd + 1,
  }));
  for (const event of events) {
    const match = buckets.find((item) => event.timestamp >= item.start && event.timestamp < item.end);
    if (match) match.spend += event.costUsd;
  }
  return buckets.map(({ key, label: name, spend }) => ({ key, label: name, spend }));
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
    return { ...meta, spend: 0 };
  });
  for (const event of events) {
    const index = Math.floor((event.timestamp - start) / width);
    if (index < 0 || index >= count) continue;
    buckets[index].spend += event.costUsd;
  }
  return buckets;
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

function startOfLocalWeek(date: Date): Date {
  const day = startOfLocalDay(date);
  const weekday = day.getDay();
  day.setDate(day.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return day;
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
