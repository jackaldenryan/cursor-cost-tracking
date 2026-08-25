import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { clearSessionToken, saveSessionToken } from "./api";

type SettingsProps = {
  open: boolean;
  hasToken: boolean;
  version: string;
  updateMessage: string | null;
  checkingUpdate: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onCleared: () => Promise<void>;
  onCheckUpdate: () => Promise<void>;
};

export function Settings({
  open,
  hasToken,
  version,
  updateMessage,
  checkingUpdate,
  onClose,
  onSaved,
  onCleared,
  onCheckUpdate,
}: SettingsProps) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveSessionToken(token);
      setToken("");
      await onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setError(null);
    try {
      await clearSessionToken();
      setToken("");
      await onCleared();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>Settings</h2>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="modal-body">
          <h3>Session token</h3>
          <p>
            {hasToken
              ? "A session token is saved on this Mac. Paste a new one to replace it."
              : "Paste your Cursor session token to load spend data."}
          </p>

          <ol className="steps">
            <li>
              Open Chrome, Safari, or Arc and go to{" "}
              <button type="button" className="link" onClick={() => void openUrl("https://cursor.com")}>
                cursor.com
              </button>
              . Sign in if needed.
            </li>
            <li>Open Developer Tools with F12 or Cmd+Option+I.</li>
            <li>Open Application or Storage, then Cookies.</li>
            <li>
              Find the cookie named <code>WorkosCursorSessionToken</code>, copy its value, and
              paste it below.
            </li>
          </ol>

          <textarea
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste WorkosCursorSessionToken here"
            spellCheck={false}
            rows={4}
          />

          {error ? <p className="error">{error}</p> : null}

          <div className="actions">
            <button type="button" onClick={() => void handleSave()} disabled={saving || !token.trim()}>
              {saving ? "Saving…" : "Save token"}
            </button>
            {hasToken ? (
              <button type="button" className="ghost" onClick={() => void handleClear()} disabled={saving}>
                Clear token
              </button>
            ) : null}
          </div>

          <h3>Updates</h3>
          <p>Current version {version}. The app checks for updates when it opens and every hour after that.</p>
          <div className="actions">
            <button type="button" className="ghost" onClick={() => void onCheckUpdate()} disabled={checkingUpdate}>
              {checkingUpdate ? "Checking…" : "Check for updates"}
            </button>
          </div>
          {updateMessage ? <p className="muted">{updateMessage}</p> : null}
        </div>
      </section>
    </div>
  );
}
