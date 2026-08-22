import type { ViewRange } from "./types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

export function clampEnd(date: Date, now = new Date()): Date {
  return date.getTime() > now.getTime() ? now : date;
}

export function calendarDays(days: number, now = new Date()): ViewRange {
  const today = startOfLocalDay(now);
  return {
    start: startOfLocalDay(addDays(today, -(days - 1))),
    end: clampEnd(endOfLocalDay(today), now),
    preset: `${days}d`,
  };
}

export function calendarMonths(months: number, now = new Date()): ViewRange {
  const today = startOfLocalDay(now);
  return {
    start: startOfLocalDay(addMonths(today, -months)),
    end: clampEnd(endOfLocalDay(today), now),
    preset: `${months}mo`,
  };
}

export function rolling(ms: number, preset: string, now = new Date()): ViewRange {
  return {
    start: new Date(now.getTime() - ms),
    end: now,
    preset,
  };
}

export function allTimeRange(now = new Date()): ViewRange {
  return { start: null, end: now, preset: "all" };
}

export function pastDay(now = new Date()): ViewRange {
  return rolling(DAY_MS, "past-day", now);
}

export function customCalendarRange(from: Date, to: Date, now = new Date()): ViewRange {
  const start = startOfLocalDay(from);
  const endDay = startOfLocalDay(to);
  const end = endDay.getTime() === startOfLocalDay(now).getTime() ? now : endOfLocalDay(to);
  return { start, end: clampEnd(end, now), preset: null };
}

export function formatRangeLabel(range: ViewRange): string {
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

export { DAY_MS, HOUR_MS };
