import { DayPicker, type DateRange } from "react-day-picker";
import {
  allTimeRange,
  calendarDays,
  calendarMonths,
  customCalendarRange,
  pastDay,
  rolling,
  DAY_MS,
} from "./dates";
import type { ViewRange } from "./types";
import "react-day-picker/style.css";

type Preset = { id: string; label: string; range: () => ViewRange };

const CALENDAR_PRESETS: Preset[] = [
  { id: "1d", label: "1 day", range: () => calendarDays(1) },
  { id: "2d", label: "2 days", range: () => calendarDays(2) },
  { id: "3d", label: "3 days", range: () => calendarDays(3) },
  { id: "1w", label: "1 week", range: () => calendarDays(7) },
  { id: "2w", label: "2 weeks", range: () => calendarDays(14) },
  { id: "1mo", label: "1 month", range: () => calendarMonths(1) },
  { id: "3mo", label: "3 months", range: () => calendarMonths(3) },
  { id: "6mo", label: "6 months", range: () => calendarMonths(6) },
  { id: "1y", label: "1 year", range: () => calendarMonths(12) },
  { id: "all", label: "All time", range: () => allTimeRange() },
];

const ROLLING_PRESETS: Preset[] = [
  { id: "past-day", label: "Past day", range: () => pastDay() },
  { id: "past-week", label: "Past week", range: () => rolling(7 * DAY_MS, "past-week") },
  { id: "past-month", label: "Past month", range: () => rolling(30 * DAY_MS, "past-month") },
  { id: "past-year", label: "Past year", range: () => rolling(365 * DAY_MS, "past-year") },
];

type RangePickerProps = {
  open: boolean;
  range: ViewRange;
  onClose: () => void;
  onChange: (range: ViewRange) => void;
};

export function RangePicker({ open, range, onClose, onChange }: RangePickerProps) {
  if (!open) return null;

  const selected: DateRange = {
    from: range.start ?? undefined,
    to: range.end,
  };

  return (
    <div className="range-panel">
      <div className="range-presets">
        <p className="range-heading">Calendar</p>
        {CALENDAR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={range.preset === preset.id ? "preset active" : "preset"}
            onClick={() => {
              onChange({ ...preset.range(), preset: preset.id });
              onClose();
            }}
          >
            {preset.label}
          </button>
        ))}
        <p className="range-heading">Rolling</p>
        {ROLLING_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={range.preset === preset.id ? "preset active" : "preset"}
            onClick={() => {
              onChange({ ...preset.range(), preset: preset.id });
              onClose();
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="range-calendar">
        <DayPicker
          mode="range"
          numberOfMonths={2}
          selected={selected}
          onSelect={(next) => {
            if (!next?.from || !next.to) return;
            onChange(customCalendarRange(next.from, next.to));
            onClose();
          }}
          disabled={{ after: new Date() }}
        />
      </div>
    </div>
  );
}
