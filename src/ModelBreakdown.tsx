import { useEffect, useRef, useState } from "react";
import { formatPct, formatUsd } from "./aggregation";
import type { ModelTotal } from "./types";

type ModelBreakdownProps = {
  items: ModelTotal[];
  total: number;
};

export function ModelBreakdown({ items, total }: ModelBreakdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="breakdown-wrap" ref={wrapRef}>
      <button type="button" className="ghost breakdown-button" onClick={() => setOpen((value) => !value)}>
        By model
      </button>
      {open ? (
        <div className="breakdown-panel">
          {items.length === 0 ? (
            <p className="muted">No model spend in this view.</p>
          ) : (
            <ul className="breakdown-list">
              {items.map((item) => (
                <li key={item.model}>
                  <span className="breakdown-model" title={item.model}>
                    {item.model}
                  </span>
                  <span className="breakdown-pct">{formatPct(item.spend, total)}</span>
                  <strong>{formatUsd(item.spend)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
