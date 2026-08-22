import type { SpendBucket, UsageEvent } from "./types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function hourlyBuckets(events: UsageEvent[], now = new Date()): SpendBucket[] {
  const currentHour = new Date(now);
  currentHour.setMinutes(0, 0, 0);
  const start = currentHour.getTime() - 23 * HOUR_MS;
  return buildBuckets(events, 24, start, HOUR_MS, (index, bucketStart) => ({
    key: `h-${index}`,
    label: formatHour(new Date(bucketStart)),
  }));
}

export function dailyBuckets(events: UsageEvent[], now = new Date()): SpendBucket[] {
  const today = startOfLocalDay(now);
  const start = today.getTime() - 13 * DAY_MS;
  return buildBuckets(events, 14, start, DAY_MS, (index, bucketStart) => ({
    key: `d-${index}`,
    label: formatDay(new Date(bucketStart)),
  }));
}

export function weeklyBuckets(events: UsageEvent[], now = new Date()): SpendBucket[] {
  const thisWeek = startOfLocalWeek(now);
  const weekMs = 7 * DAY_MS;
  const start = thisWeek.getTime() - 12 * weekMs;
  return buildBuckets(events, 13, start, weekMs, (index, bucketStart) => ({
    key: `w-${index}`,
    label: formatWeek(new Date(bucketStart)),
  }));
}

function buildBuckets(
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

function formatWeek(date: Date): string {
  return formatDay(date);
}
