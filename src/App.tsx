import { useEffect, useMemo, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import type { Update } from "@tauri-apps/plugin-updater";
import { bucketsForWindow, eventsInRange, formatUsd, MAX_BUCKETS, modelTotals, uniqueModels } from "./aggregation";
import { fetchUsageEvents, hasSessionToken } from "./api";
import { formatRangeLabel, todayRange } from "./dates";
import { ModelBreakdown } from "./ModelBreakdown";
import { RangePicker } from "./RangePicker";
import { Settings } from "./Settings";
import { SpendChart } from "./SpendChart";
import { UpdateDialog } from "./UpdateDialog";
import { checkForAppUpdate, downloadPercent, installAppUpdate } from "./updates";
import { useZoom } from "./zoom";
import type { BucketSize, UsageEvent, ViewRange } from "./types";
import "./App.css";

const BUCKETS: { id: BucketSize; label: string }[] = [
  { id: "15m", label: "15 minutes" },
  { id: "1h", label: "1 hour" },
  { id: "1d", label: "1 day" },
  { id: "1w", label: "1 week" },
  { id: "1mo", label: "1 month" },
];

function App() {
  useZoom();
  const [range, setRange] = useState<ViewRange>(() => todayRange());
  const [bucket, setBucket] = useState<BucketSize>("1h");
  const [modelFilter, setModelFilter] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const rangeWrapRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loadedSince, setLoadedSince] = useState<number | null | undefined>(undefined);
  const [hasToken, setHasToken] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const rangedEvents = useMemo(() => eventsInRange(events, range), [events, range]);
  const models = useMemo(() => uniqueModels(rangedEvents), [rangedEvents]);
  const visibleEvents = useMemo(
    () => (modelFilter ? rangedEvents.filter((event) => event.model === modelFilter) : rangedEvents),
    [rangedEvents, modelFilter],
  );
  const result = useMemo(() => bucketsForWindow(visibleEvents, range, bucket), [visibleEvents, range, bucket]);
  const spend = useMemo(
    () => result.buckets.reduce((sum, item) => sum + item.spend, 0),
    [result.buckets],
  );
  const breakdown = useMemo(() => modelTotals(visibleEvents), [visibleEvents]);

  useEffect(() => {
    if (modelFilter && !models.includes(modelFilter)) setModelFilter("");
  }, [modelFilter, models]);

  useEffect(() => {
    void getVersion().then(setVersion);
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    function handle(event: MouseEvent) {
      if (rangeWrapRef.current && !rangeWrapRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [pickerOpen]);

  async function bootstrap() {
    await refreshTokenState();
    await loadUsage(todayRange(), true);
    await checkUpdates(false);
  }

  async function refreshTokenState() {
    const present = await hasSessionToken();
    setHasToken(present);
    if (!present) setSettingsOpen(true);
    return present;
  }

  async function loadUsage(nextRange: ViewRange = range, force = false) {
    const needed = nextRange.start ? nextRange.start.getTime() : null;
    if (
      !force &&
      loadedSince !== undefined &&
      (loadedSince === null || (needed !== null && loadedSince <= needed))
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const present = await hasSessionToken();
      setHasToken(present);
      if (!present) {
        setEvents([]);
        setLoadedSince(undefined);
        setSettingsOpen(true);
        return;
      }
      setEvents(await fetchUsageEvents(needed));
      setLoadedSince(needed);
    } catch (caught) {
      setEvents([]);
      setLoadedSince(undefined);
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }

  async function applyRange(next: ViewRange) {
    setRange(next);
    await loadUsage(next);
  }

  async function checkUpdates(fromSettings: boolean) {
    setCheckingUpdate(true);
    if (fromSettings) setUpdateMessage(null);
    try {
      const update = await checkForAppUpdate();
      if (update) {
        setPendingUpdate(update);
        setUpdateMessage(`Version ${update.version} is available.`);
      } else if (fromSettings) {
        setUpdateMessage(`You are on the latest version (${version || "current"}).`);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      if (fromSettings) setUpdateMessage(message);
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function installUpdate() {
    if (!pendingUpdate) return;
    setInstalling(true);
    setUpdateError(null);
    let downloaded = 0;
    let total: number | undefined;
    try {
      await installAppUpdate(pendingUpdate, (event) => {
        if (event.event === "Started") {
          downloaded = 0;
          total = event.data.contentLength;
          setDownloadPct(downloadPercent(0, total));
        }
        if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setDownloadPct(downloadPercent(downloaded, total));
        }
        if (event.event === "Finished") setDownloadPct(100);
      });
    } catch (caught) {
      setUpdateError(caught instanceof Error ? caught.message : String(caught));
      setInstalling(false);
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>Cursor Cost</h1>
          <p className="muted">Personal Cursor spend, no admin access needed.</p>
        </div>
        <div className="topbar-right">
          <div className="total">
            <span className="muted">{formatRangeLabel(range)}</span>
            <strong>{formatUsd(spend)}</strong>
          </div>
          <ModelBreakdown items={breakdown} total={spend} />
          <button type="button" className="ghost" onClick={() => void loadUsage(range, true)} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>

      <div className="controls">
        <label className="control-inline">
          <span>Bucket</span>
          <select value={bucket} onChange={(event) => setBucket(event.target.value as BucketSize)}>
            {BUCKETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="control-inline range-wrap" ref={rangeWrapRef}>
          <span>Date range</span>
          <button type="button" className="ghost range-button" onClick={() => setPickerOpen((open) => !open)}>
            {formatRangeLabel(range)}
          </button>
          <RangePicker
            open={pickerOpen}
            range={range}
            onClose={() => setPickerOpen(false)}
            onChange={(next) => void applyRange(next)}
          />
        </div>
        <label className="control-inline">
          <span>Model</span>
          <select value={modelFilter} onChange={(event) => setModelFilter(event.target.value)}>
            <option value="">All models</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="banner error">{error}</p> : null}
      {!hasToken && !loading ? (
        <p className="banner">Paste your Cursor session token in Settings to load spend data.</p>
      ) : null}
      {result.tooMany ? (
        <p className="banner">
          That range would make {result.tooMany.toLocaleString()} bars (max {MAX_BUCKETS}). Pick a
          larger bucket or a shorter range.
        </p>
      ) : null}

      <section className="chart-card">
        {loading ? (
          <p className="empty">Loading usage…</p>
        ) : result.tooMany ? (
          <p className="empty">Choose a larger bucket to see this range.</p>
        ) : (
          <SpendChart buckets={result.buckets} />
        )}
      </section>

      <Settings
        open={settingsOpen}
        hasToken={hasToken}
        version={version}
        updateMessage={updateMessage}
        checkingUpdate={checkingUpdate}
        onClose={() => setSettingsOpen(false)}
        onSaved={async () => {
          setSettingsOpen(false);
          await loadUsage(range, true);
        }}
        onCleared={async () => {
          setEvents([]);
          setLoadedSince(undefined);
          await refreshTokenState();
        }}
        onCheckUpdate={() => checkUpdates(true)}
      />

      <UpdateDialog
        update={pendingUpdate}
        installing={installing}
        percent={downloadPct}
        error={updateError}
        onInstall={() => void installUpdate()}
        onLater={() => setPendingUpdate(null)}
      />
    </main>
  );
}

export default App;
