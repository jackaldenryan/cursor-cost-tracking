import type { Update } from "@tauri-apps/plugin-updater";

type UpdateDialogProps = {
  update: Update | null;
  installing: boolean;
  percent: number | null;
  error: string | null;
  onInstall: () => void;
  onLater: () => void;
};

export function UpdateDialog({
  update,
  installing,
  percent,
  error,
  onInstall,
  onLater,
}: UpdateDialogProps) {
  if (!update) return null;

  return (
    <div className="modal-backdrop">
      <section className="modal compact">
        <header className="modal-header">
          <h2>Update available</h2>
        </header>
        <div className="modal-body">
          <p>
            Version {update.version} is ready. You are on {update.currentVersion}.
          </p>
          {update.body ? <p className="muted notes">{update.body}</p> : null}
          {installing ? (
            <p className="muted">
              {percent === null ? "Downloading update…" : `Downloading update… ${percent}%`}
            </p>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          <div className="actions">
            <button type="button" onClick={onInstall} disabled={installing}>
              {installing ? "Updating…" : "Update now"}
            </button>
            <button type="button" className="ghost" onClick={onLater} disabled={installing}>
              Later
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
