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
    <aside className="update-toast" role="status">
      <p className="update-toast-title">Update available</p>
      <p>
        Version {update.version} is ready. Restart and update now?
      </p>
      {installing ? (
        <p className="muted">
          {percent === null ? "Downloading update…" : `Downloading update… ${percent}%`}
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="actions">
        <button type="button" onClick={onInstall} disabled={installing}>
          {installing ? "Updating…" : "Restart and update"}
        </button>
        <button type="button" className="ghost" onClick={onLater} disabled={installing}>
          Later
        </button>
      </div>
    </aside>
  );
}
