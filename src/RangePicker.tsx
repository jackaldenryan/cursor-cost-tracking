import { useEffect, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import {
  allTimeRange,
  customCalendarRange,
  DAY_MS,
  monthToDate,
  rolling,
  todayRange,
  weekToDate,
  yearToDate,
} from "./dates";
import type { ViewRange } from "./types";
import "react-day-picker/style.css";

type Preset = { id: string; label: string; range: () => ViewRange };

const TO_DATE_PRESETS: Preset[] = [
  { id: "today", label: "Today", range: () => todayRange() },
  { id: "wtd", label: "Week to date", range: () => weekToDate() },
  { id: "mtd", label: "Month to date", range: () => monthToDate() },
  { id: "ytd", label: "Year to date", range: () => yearToDate() },
];

const ROLLING_PRESETS: Preset[] = [
  { id: "24h", label: "24 hours", range: () => rolling(DAY_MS, "24h") },
  { id: "48h", label: "48 hours", range: () => rolling(2 * DAY_MS, "48h") },
  { id: "1w", label: "1 week", range: () => rolling(7 * DAY_MS, "1w") },
  { id: "2w", label: "2 weeks", range: () => rolling(14 * DAY_MS, "2w") },
  { id: "1mo", label: "1 month", range: () => rolling(30 * DAY_MS, "1mo") },
  { id: "6mo", label: "6 months", range: () => rolling(180 * DAY_MS, "6mo") },
  { id: "1y", label: "1 year", range: () => rolling(365 * DAY_MS, "1y") },
  { id: "all", label: "All time", range: () => allTimeRange() },
];

type RangePickerProps = {
  open: boolean;
  range: ViewRange;
  onClose: () => void;
  onChange: (range: ViewRange) => void;
};

export function RangePicker({ open, range, onClose, onChange }: RangePickerProps) {
  const [draft, setDraft] = useState<DateRange>(() => selectedFromRange(range));

  useEffect(() => {
    if (open) setDraft(selectedFromRange(range));
  }, [open, range]);

  if (!open) return null;

  function applyDraft() {
    if (!draft.from) return;
    onChange(customCalendarRange(draft.from, draft.to ?? draft.from));
    onClose();
  }

  function applyPreset(preset: Preset) {
    onChange({ ...preset.range(), preset: preset.id });
    onClose();
  }

  return (
    <div className="range-panel">
      <div className="range-presets">
        <p className="range-heading">To date</p>
        {TO_DATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={range.preset === preset.id ? "preset active" : "preset"}
            onClick={() => applyPreset(preset)}
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
            onClick={() => applyPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="range-calendar">
        <DayPicker
          mode="range"
          numberOfMonths={1}
          selected={draft}
          onSelect={(next) => {
            if (!next) return;
            setDraft(next);
          }}
          disabled={{ after: new Date() }}
        />
        <div className="range-apply">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={applyDraft} disabled={!draft.from}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function selectedFromRange(range: ViewRange): DateRange {
  return {
    from: range.start ?? undefined,
    to: range.end,
  };
}
