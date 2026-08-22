import { useEffect, useMemo, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import type { Update } from "@tauri-apps/plugin-updater";
import { dailyBuckets, formatUsd, hourlyBuckets, weeklyBuckets } from "./aggregation";
import { fetchUsageEvents, hasSessionToken } from "./api";
import { Settings } from "./Settings";
import { SpendChart } from "./SpendChart";
import { UpdateDialog } from "./UpdateDialog";
import { checkForAppUpdate, downloadPercent, installAppUpdate } from "./updates";
import type { RangeTab, UsageEvent } from "./types";
import "./App.css";

const TABS: { id: RangeTab; label: string }[] = [
  { id: "hourly", label: "Hourly · 24h" },
  { id: "daily", label: "Daily · 14d" },
  { id: "weekly", label: "Weekly · 13w" },
];

function App() {
  const [tab, setTab] = useState<RangeTab>("hourly");
  const [events, setEvents] = useState<UsageEvent[]>([]);
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

  const buckets = useMemo(() => {
    if (tab === "hourly") return hourlyBuckets(events);
    if (tab === "daily") return dailyBuckets(events);
    return weeklyBuckets(events);
  }, [events, tab]);

  const spend = useMemo(() => buckets.reduce((sum, bucket) => sum + bucket.spend, 0), [buckets]);

  useEffect(() => {
    void getVersion().then(setVersion);
    void bootstrap();
  }, []);

  async function bootstrap() {
    await refreshTokenState();
    await loadUsage();
    await checkUpdates(false);
  }

  async function refreshTokenState() {
    const present = await hasSessionToken();
    setHasToken(present);
    if (!present) setSettingsOpen(true);
    return present;
  }

  async function loadUsage() {
    setLoading(true);
    setError(null);
    try {
      const present = await hasSessionToken();
      setHasToken(present);
      if (!present) {
        setEvents([]);
        setSettingsOpen(true);
        return;
      }
      setEvents(await fetchUsageEvents());
    } catch (caught) {
      setEvents([]);
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
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
            <span className="muted">{rangeCaption(tab)}</span>
            <strong>{formatUsd(spend)}</strong>
          </div>
          <button type="button" className="ghost" onClick={() => void loadUsage()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === tab ? "tab active" : "tab"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {error ? <p className="banner error">{error}</p> : null}
      {!hasToken && !loading ? (
        <p className="banner">Paste your Cursor session token in Settings to load spend data.</p>
      ) : null}

      <section className="chart-card">
        {loading ? <p className="empty">Loading usage…</p> : <SpendChart buckets={buckets} />}
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
          await loadUsage();
        }}
        onCleared={async () => {
          setEvents([]);
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

function rangeCaption(tab: RangeTab): string {
  if (tab === "hourly") return "Last 24 hours";
  if (tab === "daily") return "Last 14 days";
  return "Last 13 weeks";
}

export default App;
