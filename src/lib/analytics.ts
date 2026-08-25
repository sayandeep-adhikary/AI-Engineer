import type { LearningMode } from "@/data/curriculum";
import { skills, unitById } from "@/data/curriculum";
import type { UserProgress } from "@/state/types";
import { isTopicCompleted } from "./selectors";

// Range-aware analytics. Cumulative state metrics (CORE %, category %, skill
// distribution) live in selectors.ts; this module handles time-sensitive views.

export type Range = "7d" | "30d" | "90d" | "all";

export const RANGE_DAYS: Record<Range, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

const DAY_MS = 86400000;

export function rangeCutoff(range: Range): number | null {
  const days = RANGE_DAYS[range];
  return days === null ? null : Date.now() - days * DAY_MS;
}

function inRange(iso: string, cutoff: number | null): boolean {
  return cutoff === null || new Date(iso).getTime() >= cutoff;
}

export function eventsInRange(progress: UserProgress, range: Range) {
  const cutoff = rangeCutoff(range);
  return progress.events.filter((e) => inRange(e.timestamp, cutoff));
}

export interface TimeInvested {
  minutes: number;
  sessionCount: number;
  tracked: boolean;
}

/** Explicitly logged time only — never inferred from activity. */
export function timeInvested(progress: UserProgress, range: Range): TimeInvested {
  const cutoff = rangeCutoff(range);
  const sessions = progress.sessions.filter((s) => s.endedAt && inRange(s.endedAt, cutoff));
  const minutes = sessions.reduce((acc, s) => {
    const start = new Date(s.startedAt).getTime();
    const end = new Date(s.endedAt as string).getTime();
    return acc + Math.max(0, Math.round((end - start) / 60000));
  }, 0);
  return { minutes, sessionCount: sessions.length, tracked: sessions.length > 0 };
}

export function unitsCompletedInRange(progress: UserProgress, range: Range): number {
  const cutoff = rangeCutoff(range);
  return Object.values(progress.completedUnits).filter((iso) => inRange(iso, cutoff)).length;
}

export interface DayCell {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Per-day event counts for the last N days (fixed 30-day contribution grid). */
export function activityByDay(progress: UserProgress, days = 30): DayCell[] {
  const counts = new Map<string, number>();
  for (const e of progress.events) {
    const key = new Date(e.timestamp).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cells: DayCell[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return cells;
}

export function activeDaysInWindow(progress: UserProgress, days = 30): number {
  return activityByDay(progress, days).filter((c) => c.count > 0).length;
}

export interface VelocitySeries {
  points: number[];
  labels: string[];
  total: number;
  unit: "day" | "week";
}

/** Units completed per bucket over the range (learning velocity). */
export function velocitySeries(progress: UserProgress, range: Range): VelocitySeries {
  const completions = Object.values(progress.completedUnits).map((iso) => new Date(iso).getTime());
  const now = Date.now();

  const daily = range === "7d" ? 7 : range === "30d" ? 30 : 0;
  if (daily > 0) {
    const points: number[] = [];
    const labels: string[] = [];
    for (let i = daily - 1; i >= 0; i--) {
      const start = now - (i + 1) * DAY_MS;
      const end = now - i * DAY_MS;
      const count = completions.filter((t) => t > start && t <= end).length;
      points.push(count);
      labels.push(new Date(end).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    }
    return { points, labels, total: points.reduce((a, b) => a + b, 0), unit: "day" };
  }

  // Weekly buckets for 90d / all.
  const weeks = range === "90d" ? 13 : 26;
  const points: number[] = [];
  const labels: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = now - (i + 1) * 7 * DAY_MS;
    const end = now - i * 7 * DAY_MS;
    const count = completions.filter((t) => t > start && t <= end).length;
    points.push(count);
    labels.push(new Date(end).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  }
  return { points, labels, total: points.reduce((a, b) => a + b, 0), unit: "week" };
}

export interface ModeBalance {
  counts: Record<LearningMode, number>;
  total: number;
}

/** Completed activity by learning mode within the range (reading vs building). */
export function modeBalance(progress: UserProgress, range: Range): ModeBalance {
  const cutoff = rangeCutoff(range);
  const counts: Record<LearningMode, number> = {
    learn: 0,
    practice: 0,
    build: 0,
    review: 0,
    project: 0,
  };
  for (const [id, iso] of Object.entries(progress.completedUnits)) {
    if (!inRange(iso, cutoff)) continue;
    const unit = unitById.get(id);
    if (unit) counts[unit.mode] += 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total };
}

export interface SkillCoverage {
  id: string;
  name: string;
  completed: number;
  total: number;
  ratio: number;
}

/** Cumulative skill coverage from completed topics (where am I strong / thin). */
export function skillDistribution(progress: UserProgress): SkillCoverage[] {
  return skills
    .map((s) => {
      const total = s.relatedTopicIds.length;
      const completed = s.relatedTopicIds.filter((tid) => isTopicCompleted(progress, tid)).length;
      return { id: s.id, name: s.name, completed, total, ratio: total === 0 ? 0 : completed / total };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.ratio - a.ratio || b.completed - a.completed || a.name.localeCompare(b.name));
}
