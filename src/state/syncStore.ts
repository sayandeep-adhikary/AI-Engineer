// Cloud synchronization orchestrator. Coordinates authStore (who) with
// progressStore (what) and progressService (where). Firestore is never touched
// outside progressService, and pages/components never touch this directly except
// to read status / resolve a conflict.
//
// Startup-race safety: the write-subscription is started ONLY AFTER the initial
// hydration decision, so local rehydration can never overwrite cloud data before
// it is loaded. All writes are captured against the authenticated UID.
import { create } from "zustand";
import { useAuthStore } from "./authStore";
import { useProgressStore } from "./progressStore";
import { createInitialProgress, type UserProgress } from "./types";
import {
  loadCloudProgress,
  saveCloudProgress,
  type CloudLoadResult,
} from "@/lib/firebase/progressService";

const WRITE_DEBOUNCE_MS = 1200;
const RETRY_BASE_MS = 4000;
const MAX_AUTO_RETRIES = 3;

export type SyncStatus =
  | "idle" // no authenticated user — local-only
  | "initializing" // loading cloud state
  | "syncing" // a cloud write is pending/in-flight
  | "synced" // local and cloud are in agreement
  | "conflict" // first-login local/cloud divergence awaiting user choice
  | "error"; // a cloud operation failed; local state is intact

export interface ProgressSummary {
  completedUnits: number;
  notes: number;
  milestones: number;
  events: number;
  lastActivity: string | null;
}

export interface SyncConflict {
  uid: string;
  cloud: UserProgress;
  localSummary: ProgressSummary;
  cloudSummary: ProgressSummary;
}

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  conflict: SyncConflict | null;
  activeUid: string | null;
  initSync: () => void;
  resolveConflict: (choice: "local" | "cloud") => Promise<void>;
  retry: () => void;
}

// ── Pure decision helpers (unit-testable, no side effects) ──────────────────
const RECORD_FIELDS = [
  "topicStages",
  "completedUnits",
  "startedUnits",
  "projectStatus",
  "completedMilestones",
] as const;
const ARRAY_FIELDS = ["notes", "sessions", "timeLog", "events"] as const;

/** True when the user has any meaningful progress (ignores theme/version). */
export function hasProgress(p: UserProgress): boolean {
  return (
    RECORD_FIELDS.some((f) => Object.keys(p[f] ?? {}).length > 0) ||
    ARRAY_FIELDS.some((f) => (p[f] ?? []).length > 0)
  );
}

/** Structural equality of the meaningful progress (ignores settings/theme). */
export function progressEqual(a: UserProgress, b: UserProgress): boolean {
  const pick = (p: UserProgress) =>
    JSON.stringify({
      topicStages: p.topicStages,
      completedUnits: p.completedUnits,
      startedUnits: p.startedUnits,
      projectStatus: p.projectStatus,
      completedMilestones: p.completedMilestones,
      notes: p.notes,
      sessions: p.sessions,
      timeLog: p.timeLog,
      events: p.events,
    });
  return pick(a) === pick(b);
}

export type FirstLoginDecision = "upload" | "adopt-cloud" | "conflict";

/** Deterministic first-login strategy — never silently loses data. */
export function decideFirstLogin(
  local: UserProgress,
  cloud: UserProgress | null
): FirstLoginDecision {
  if (!cloud) return "upload"; // no cloud yet → preserve local by uploading it
  if (!hasProgress(local)) return "adopt-cloud"; // nothing local worth keeping
  if (progressEqual(local, cloud)) return "adopt-cloud"; // identical → no choice needed
  return "conflict"; // real divergence → ask the user
}

export function summarize(p: UserProgress): ProgressSummary {
  const lastActivity = p.events.reduce<string | null>(
    (latest, e) => (!latest || e.timestamp > latest ? e.timestamp : latest),
    null
  );
  return {
    completedUnits: Object.keys(p.completedUnits ?? {}).length,
    notes: (p.notes ?? []).length,
    milestones: Object.keys(p.completedMilestones ?? {}).length,
    events: (p.events ?? []).length,
    lastActivity,
  };
}

// ── Non-reactive orchestration state (kept out of the store to avoid renders) ─
let started = false;
let unsubProgress: (() => void) | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;
let transitionChain: Promise<void> = Promise.resolve();

function snapshotProgress(): UserProgress {
  const s = useProgressStore.getState();
  return {
    version: s.version,
    topicStages: s.topicStages,
    completedUnits: s.completedUnits,
    startedUnits: s.startedUnits,
    projectStatus: s.projectStatus,
    completedMilestones: s.completedMilestones,
    notes: s.notes,
    sessions: s.sessions,
    timeLog: s.timeLog,
    events: s.events,
    settings: s.settings,
  };
}

export const useSyncStore = create<SyncState>((set, get) => {
  function clearWriteTimer() {
    if (writeTimer) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
  }
  function clearRetryTimer() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  /** Persist the latest snapshot for `uid`, guarding against stale/other-user writes. */
  async function flush(uid: string): Promise<void> {
    clearWriteTimer();
    if (get().activeUid !== uid) return; // signed out / switched — abort
    const progress = snapshotProgress();
    set({ status: "syncing" });
    try {
      await saveCloudProgress(uid, progress);
      if (get().activeUid !== uid) return; // changed during the await
      retryCount = 0;
      set({ status: "synced", lastSyncedAt: new Date().toISOString(), error: null });
    } catch {
      if (get().activeUid !== uid) return;
      set({ status: "error", error: "Cloud sync failed. Your progress is safe locally." });
      scheduleRetry(uid);
    }
  }

  function scheduleSave(uid: string) {
    if (get().activeUid !== uid) return;
    clearWriteTimer();
    set({ status: "syncing" });
    writeTimer = setTimeout(() => void flush(uid), WRITE_DEBOUNCE_MS);
  }

  function scheduleRetry(uid: string) {
    if (retryCount >= MAX_AUTO_RETRIES) return; // stop the loop; manual retry remains
    clearRetryTimer();
    retryCount += 1;
    retryTimer = setTimeout(() => {
      if (get().activeUid === uid) void flush(uid);
    }, RETRY_BASE_MS * retryCount);
  }

  /** Begin writing local mutations to the cloud. Started only after hydration. */
  function startWriteSubscription(uid: string) {
    if (unsubProgress) return;
    unsubProgress = useProgressStore.subscribe(() => {
      if (get().activeUid === uid) scheduleSave(uid);
    });
  }

  function stopWriteSubscription() {
    if (unsubProgress) {
      unsubProgress();
      unsubProgress = null;
    }
  }

  function hydrate(progress: UserProgress) {
    // Reuses the same path as JSON import; also writes through to local persist.
    useProgressStore.getState().replaceProgress(progress);
  }

  async function beginForUser(uid: string): Promise<void> {
    set({ status: "initializing", activeUid: uid, error: null, conflict: null });
    let result: CloudLoadResult;
    try {
      result = await loadCloudProgress(uid);
    } catch {
      // Could not read the cloud — keep local intact and DO NOT start writing
      // (writing now could clobber cloud state we simply failed to read).
      if (get().activeUid === uid) {
        set({ status: "error", error: "Couldn't reach the cloud. Working locally." });
        scheduleRetry(uid);
      }
      return;
    }
    if (get().activeUid !== uid) return; // switched away during load

    if (result.kind === "unsupported") {
      set({
        status: "error",
        error: `Cloud data uses a newer format (v${result.schemaVersion}). Update Signal to sync.`,
      });
      return; // do not overwrite forward-written data
    }
    if (result.kind === "invalid") {
      set({ status: "error", error: "Cloud progress was unreadable; keeping local progress." });
      return;
    }

    const local = snapshotProgress();
    const cloud = result.kind === "ok" ? result.progress : null;
    const decision = decideFirstLogin(local, cloud);

    if (decision === "conflict" && cloud) {
      set({
        status: "conflict",
        conflict: {
          uid,
          cloud,
          localSummary: summarize(local),
          cloudSummary: summarize(cloud),
        },
      });
      return; // wait for resolveConflict — no writes yet
    }

    try {
      if (decision === "adopt-cloud" && cloud) {
        hydrate(cloud);
      } else {
        // 'upload' — establish the cloud document from local state.
        await saveCloudProgress(uid, local);
      }
      if (get().activeUid !== uid) return;
      retryCount = 0;
      set({ status: "synced", lastSyncedAt: new Date().toISOString(), error: null });
      startWriteSubscription(uid);
    } catch {
      if (get().activeUid === uid) {
        set({ status: "error", error: "Cloud sync failed. Your progress is safe locally." });
        scheduleRetry(uid);
      }
    }
  }

  async function teardown(uid: string): Promise<void> {
    clearRetryTimer();
    retryCount = 0;
    // Flush any pending write to the CORRECT (old) uid before detaching.
    if (writeTimer) {
      clearWriteTimer();
      try {
        await saveCloudProgress(uid, snapshotProgress());
      } catch {
        /* best effort on teardown */
      }
    }
    stopWriteSubscription();
    set({ status: "idle", activeUid: null, conflict: null, error: null });
  }

  /** Serialize auth transitions so teardown(A) always completes before begin(B). */
  function onAuthUid(nextUid: string | null) {
    const current = get().activeUid;
    if (nextUid === current) return;
    transitionChain = transitionChain
      .then(async () => {
        const active = get().activeUid;
        if (active && active !== nextUid) await teardown(active);
        if (nextUid) await beginForUser(nextUid);
      })
      .catch(() => {
        /* never let the chain break */
      });
  }

  return {
    status: "idle",
    lastSyncedAt: null,
    error: null,
    conflict: null,
    activeUid: null,

    initSync: () => {
      if (started) return;
      started = true;
      const uidFromAuth = () => {
        const a = useAuthStore.getState();
        return a.status === "authenticated" ? a.user?.uid ?? null : null;
      };
      onAuthUid(uidFromAuth());
      // App-lifetime subscription — never torn down.
      useAuthStore.subscribe(() => onAuthUid(uidFromAuth()));

      if (typeof window !== "undefined") {
        window.addEventListener("online", () => {
          const { status, activeUid } = get();
          if (status === "error" && activeUid) {
            retryCount = 0;
            void flush(activeUid);
          }
        });
      }
    },

    resolveConflict: async (choice) => {
      const conflict = get().conflict;
      if (!conflict) return;
      const { uid } = conflict;
      if (get().activeUid !== uid) {
        set({ conflict: null });
        return;
      }
      set({ status: "initializing", conflict: null });
      try {
        if (choice === "cloud") {
          hydrate(conflict.cloud);
        } else {
          await saveCloudProgress(uid, snapshotProgress());
        }
        if (get().activeUid !== uid) return;
        retryCount = 0;
        set({ status: "synced", lastSyncedAt: new Date().toISOString(), error: null });
        startWriteSubscription(uid);
      } catch {
        if (get().activeUid === uid) {
          set({ status: "error", error: "Cloud sync failed. Your progress is safe locally." });
          scheduleRetry(uid);
        }
      }
    },

    retry: () => {
      const uid = get().activeUid;
      if (!uid) return;
      retryCount = 0;
      clearRetryTimer();
      // If we never got past hydration, re-run it; otherwise just re-flush.
      if (unsubProgress) void flush(uid);
      else void beginForUser(uid);
    },
  };
});

// DEV-only diagnostics for verifying the pure decision logic in the browser.
declare global {
  interface Window {
    __signalSync?: {
      hasProgress: typeof hasProgress;
      progressEqual: typeof progressEqual;
      decideFirstLogin: typeof decideFirstLogin;
      summarize: typeof summarize;
      makeInitial: () => UserProgress;
      store: typeof useSyncStore;
    };
  }
}
if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__signalSync = {
    hasProgress,
    progressEqual,
    decideFirstLogin,
    summarize,
    makeInitial: createInitialProgress,
    store: useSyncStore,
  };
}
