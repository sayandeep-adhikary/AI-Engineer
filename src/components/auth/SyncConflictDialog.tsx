import { useSyncStore } from "@/state/syncStore";
import { relativeTime } from "@/lib/format";
import styles from "./syncconflict.module.css";

export function SyncConflictDialog() {
  const conflict = useSyncStore((s) => s.conflict);
  const status = useSyncStore((s) => s.status);
  const resolveConflict = useSyncStore((s) => s.resolveConflict);

  if (status !== "conflict" || !conflict) return null;

  const { localSummary: local, cloudSummary: cloud } = conflict;

  return (
    <div className={styles.backdrop} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-conflict-title"
        aria-describedby="sync-conflict-desc"
      >
        <div className={styles.head}>
          <span className={styles.overline}>Cloud sync</span>
          <h2 id="sync-conflict-title" className={styles.title}>
            Two versions of your progress
          </h2>
          <p id="sync-conflict-desc" className={styles.desc}>
            This account already has saved progress that differs from what's on this device. Choose
            which one to keep — nothing is overwritten until you decide.
          </p>
        </div>

        <div className={styles.options}>
          <section className={styles.card}>
            <header className={styles.cardHead}>
              <span className={styles.cardGlyph} aria-hidden="true">
                ☁
              </span>
              <div>
                <h3 className={styles.cardTitle}>Cloud progress</h3>
                <p className={styles.cardMeta}>
                  {cloud.lastActivity ? `Updated ${relativeTime(cloud.lastActivity)}` : "No recent activity"}
                </p>
              </div>
            </header>
            <dl className={styles.stats}>
              <Stat label="Units" value={cloud.completedUnits} />
              <Stat label="Milestones" value={cloud.milestones} />
              <Stat label="Notes" value={cloud.notes} />
              <Stat label="Events" value={cloud.events} />
            </dl>
            <button
              type="button"
              className={styles.primary}
              onClick={() => void resolveConflict("cloud")}
            >
              Use cloud progress
            </button>
          </section>

          <section className={styles.card}>
            <header className={styles.cardHead}>
              <span className={styles.cardGlyph} aria-hidden="true">
                ▤
              </span>
              <div>
                <h3 className={styles.cardTitle}>This device</h3>
                <p className={styles.cardMeta}>
                  {local.lastActivity ? `Updated ${relativeTime(local.lastActivity)}` : "No recent activity"}
                </p>
              </div>
            </header>
            <dl className={styles.stats}>
              <Stat label="Units" value={local.completedUnits} />
              <Stat label="Milestones" value={local.milestones} />
              <Stat label="Notes" value={local.notes} />
              <Stat label="Events" value={local.events} />
            </dl>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => void resolveConflict("local")}
            >
              Keep this device
            </button>
          </section>
        </div>

        <p className={styles.foot}>
          The version you choose becomes the source of truth and is saved to both this device and the
          cloud.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue}>{value}</dd>
    </div>
  );
}
