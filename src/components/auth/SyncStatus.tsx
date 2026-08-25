import { useSyncStore, type SyncStatus as Status } from "@/state/syncStore";
import { relativeTime } from "@/lib/format";
import styles from "./authmenu.module.css";

const META: Record<Status, { dot: string; label: string }> = {
  idle: { dot: "local", label: "Local only" },
  initializing: { dot: "sync", label: "Syncing…" },
  syncing: { dot: "sync", label: "Syncing…" },
  synced: { dot: "ok", label: "Synced" },
  conflict: { dot: "warn", label: "Sync conflict" },
  error: { dot: "err", label: "Sync error" },
};

export function SyncStatus() {
  const status = useSyncStore((s) => s.status);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const retry = useSyncStore((s) => s.retry);

  if (status === "idle") return null; // unauthenticated / local-only — stay quiet

  const meta = META[status];
  return (
    <div className={styles.sync} role="status" aria-live="polite">
      <span className={styles.syncDot} data-state={meta.dot} aria-hidden="true" />
      <span className={styles.syncLabel}>
        {meta.label}
        {status === "synced" && lastSyncedAt ? ` · ${relativeTime(lastSyncedAt)}` : ""}
      </span>
      {status === "error" && (
        <button type="button" className={styles.syncRetry} onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}
