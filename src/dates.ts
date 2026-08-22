import type { ViewRange } from "./types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const PRESET_LABELS: Record<string, string> = {
  today: "Today",
  wtd: "Week to date",
  mtd: "Month to date",
  ytd: "Year to date",
  "24h": "24 hours",
  "48h": "48 hours",
  "1w": "1 week",
  "2w": "2 weeks",
  "1mo": "1 month",
  "6mo": "6 months",
  "1y": "1 year",
  all: "All time",
};

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function startOfLocalWeek(date: Date): Date {
  const day = startOfLocalDay(date);
  const weekday = day.getDay();
  day.setDate(day.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return day;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function clampEnd(date: Date, now = new Date()): Date {
  return date.getTime() > now.getTime() ? now : date;
}

export function rolling(ms: number, preset: string, now = new Date()): ViewRange {
  return {
    start: new Date(now.getTime() - ms),
    end: now,
    preset,
  };
}

export function todayRange(now = new Date()): ViewRange {
  return { start: startOfLocalDay(now), end: now, preset: "today" };
}

export function weekToDate(now = new Date()): ViewRange {
  return { start: startOfLocalWeek(now), end: now, preset: "wtd" };
}

export function monthToDate(now = new Date()): ViewRange {
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, preset: "mtd" };
}

export function yearToDate(now = new Date()): ViewRange {
  return { start: new Date(now.getFullYear(), 0, 1), end: now, preset: "ytd" };
}

export function allTimeRange(now = new Date()): ViewRange {
  return { start: null, end: now, preset: "all" };
}

export function customCalendarRange(from: Date, to: Date, now = new Date()): ViewRange {
  const start = startOfLocalDay(from);
  const endDay = startOfLocalDay(to);
  const end = endDay.getTime() === startOfLocalDay(now).getTime() ? now : endOfLocalDay(to);
  return { start, end: clampEnd(end, now), preset: null };
}

export function formatRangeLabel(range: ViewRange): string {
  if (range.preset && PRESET_LABELS[range.preset]) return PRESET_LABELS[range.preset];
  if (range.start === null) return "All time";
  return `${formatRangePoint(range.start)} – ${formatRangePoint(range.end)}`;
}

function formatRangePoint(date: Date): string {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    hour: date.getHours() === 0 && date.getMinutes() === 0 ? undefined : "numeric",
    minute: date.getHours() === 0 && date.getMinutes() === 0 ? undefined : "2-digit",
  });
}

export { DAY_MS, HOUR_MS, PRESET_LABELS };
