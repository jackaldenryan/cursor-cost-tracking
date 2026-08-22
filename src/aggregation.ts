import type { RangeTab, SpendBucket, UsageEvent } from "./types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function bucketsForRange(events: UsageEvent[], tab: RangeTab, now = new Date()): SpendBucket[] {
  if (tab === "hourly") return hourlyBuckets(events, now);
  if (tab === "daily") return dailyBuckets(events, 14, now);
  if (tab === "month") return dailyBuckets(events, 30, now);
  if (tab === "months3") return weeklyBuckets(events, 13, now);
  if (tab === "months6") return weeklyBuckets(events, 26, now);
  if (tab === "months12") return monthlyBuckets(events, 12, now);
  return monthlyBucketsFromOldest(events, now);
}

export function sinceMsForRange(tab: RangeTab, now = Date.now()): number | null {
  if (tab === "hourly") return now - 2 * DAY_MS;
  if (tab === "daily") return now - 15 * DAY_MS;
  if (tab === "month") return now - 32 * DAY_MS;
  if (tab === "months3") return now - 95 * DAY_MS;
  if (tab === "months6") return now - 190 * DAY_MS;
  if (tab === "months12") return now - 370 * DAY_MS;
  return null;
}

export function hourlyBuckets(events: UsageEvent[], now = new Date()): SpendBucket[] {
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);
  const start = currentHour.getTime() - 23 * HOUR_MS;
  return buildFixedBuckets(events, 24, start, HOUR_MS, (index, bucketStart) => ({
    key: `h-${index}`,
    label: formatHour(new Date(bucketStart)),
  }));
}

export function dailyBuckets(events: UsageEvent[], days: number, now = new Date()): SpendBucket[] {
  const today = startOfLocalDay(now);
  const start = today.getTime() - (days - 1) * DAY_MS;
  return buildFixedBuckets(events, days, start, DAY_MS, (index, bucketStart) => ({
    key: `d-${days}-${index}`,
    label: formatDay(new Date(bucketStart)),
  }));
}

export function weeklyBuckets(events: UsageEvent[], weeks: number, now = new Date()): SpendBucket[] {
  const thisWeek = startOfLocalWeek(now);
  const start = thisWeek.getTime() - (weeks - 1) * WEEK_MS;
  return buildFixedBuckets(events, weeks, start, WEEK_MS, (index, bucketStart) => ({
    key: `w-${weeks}-${index}`,
    label: formatDay(new Date(bucketStart)),
  }));
}

export function monthlyBuckets(events: UsageEvent[], months: number, now = new Date()): SpendBucket[] {
  const starts = monthStarts(months, now);
  return fillMonthBuckets(events, starts);
}

export function monthlyBucketsFromOldest(events: UsageEvent[], now = new Date()): SpendBucket[] {
  if (events.length === 0) return monthlyBuckets(events, 12, now);
  const oldest = events.reduce((min, event) => Math.min(min, event.timestamp), events[0].timestamp);
  const first = new Date(oldest);
  const start = new Date(first.getFullYear(), first.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  const starts = Array.from({ length: Math.max(count, 1) }, (_, index) => {
    return new Date(start.getFullYear(), start.getMonth() + index, 1).getTime();
  });
  return fillMonthBuckets(events, starts);
}

function monthStarts(months: number, now: Date): number[] {
  const cursor = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  return Array.from({ length: months }, (_, index) => {
    return new Date(cursor.getFullYear(), cursor.getMonth() + index, 1).getTime();
  });
}

function fillMonthBuckets(events: UsageEvent[], starts: number[]): SpendBucket[] {
  const buckets = starts.map((start, index) => ({
    key: `m-${start}`,
    label: formatMonth(new Date(start)),
    spend: 0,
    start,
    end: starts[index + 1] ?? Number.POSITIVE_INFINITY,
  }));

  for (const event of events) {
    const bucket = buckets.find((item) => event.timestamp >= item.start && event.timestamp < item.end);
    if (bucket) bucket.spend += event.costUsd;
  }

  return buckets.map(({ key, label, spend }) => ({ key, label, spend }));
}

function buildFixedBuckets(
  events: UsageEvent[],
  count: number,
  start: number,
  width: number,
  label: (index: number, bucketStart: number) => { key: string; label: string },
): SpendBucket[] {
  const buckets = Array.from({ length: count }, (_, index) => {
    const meta = label(index, start + index * width);
    return { ...meta, spend: 0 };
  });

  for (const event of events) {
    const index = Math.floor((event.timestamp - start) / width);
    if (index < 0 || index >= count) continue;
    buckets[index].spend += event.costUsd;
  }

  return buckets;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLocalWeek(date: Date): Date {
  const day = startOfLocalDay(date);
  const weekday = day.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + mondayOffset);
  return day;
}

function formatHour(date: Date): string {
  const hours = date.getHours();
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}${suffix}`;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
