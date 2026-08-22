import { useEffect, useState } from "react";

const STORAGE_KEY = "cursor-cost-zoom";
const MIN = 0.8;
const MAX = 1.6;
const STEP = 0.1;
const DEFAULT = 1;

function clamp(value: number): number {
  return Math.min(MAX, Math.max(MIN, Math.round(value * 10) / 10));
}

function readZoom(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  const value = raw ? Number(raw) : DEFAULT;
  return Number.isFinite(value) ? clamp(value) : DEFAULT;
}

function applyZoom(zoom: number) {
  document.documentElement.style.setProperty("--app-zoom", String(zoom));
}

export function useZoom() {
  const [zoom, setZoom] = useState(readZoom);

  useEffect(() => {
    applyZoom(zoom);
    localStorage.setItem(STORAGE_KEY, String(zoom));
  }, [zoom]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        setZoom((current) => clamp(current + STEP));
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setZoom((current) => clamp(current - STEP));
      } else if (event.key === "0") {
        event.preventDefault();
        setZoom(DEFAULT);
      }
    }

    function onWheel(event: WheelEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -STEP : STEP;
      setZoom((current) => clamp(current + direction));
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  return zoom;
}
