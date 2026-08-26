import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Stage, LearningMode } from "@/data/curriculum";
import { unitById, unitsForTopic, milestoneById, milestonesForProject } from "@/data/curriculum";
import { createPersistStorage } from "./storage";
import {
  createInitialProgress,
  PROGRESS_VERSION,
  type ActivityEvent,
  type ActivityEventType,
  type LearningSession,
  type ProjectStatus,
  type UserNote,
  type UserProgress,
} from "./types";

const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const nowIso = (): string => new Date().toISOString();

// Derive a topic's stage from unit completion: the stage of the earliest
// incomplete unit, or 'completed' when every unit is done.
function deriveStage(topicId: string, completedUnits: Record<string, string>): Stage | null {
  const units = unitsForTopic(topicId);
  if (units.length === 0) return null;
  const incomplete = units.find((u) => !completedUnits[u.id]);
  return incomplete ? incomplete.stage : "completed";
}

interface ProgressActions {
  startTopic: (topicId: string) => void;
  setTopicStage: (topicId: string, stage: Stage) => void;
  startUnit: (unitId: string) => void;
  completeUnit: (unitId: string) => void;
  uncompleteUnit: (unitId: string) => void;
  setProjectStatus: (projectId: string, status: ProjectStatus) => void;
  completeMilestone: (milestoneId: string) => void;
  uncompleteMilestone: (milestoneId: string) => void;
  addNote: (parentType: UserNote["parentType"], parentId: string, body: string) => void;
  updateNote: (noteId: string, body: string) => void;
  deleteNote: (noteId: string) => void;
  logSession: (input: { topicId?: string; projectId?: string; mode?: LearningMode; minutes: number }) => void;
  setTheme: (theme: "dark" | "light") => void;
  replaceProgress: (next: UserProgress) => void;
  resetProgress: () => void;
}

export type ProgressStore = UserProgress & ProgressActions;

function pushEvent(
  events: ActivityEvent[],
  type: ActivityEventType,
  refType: ActivityEvent["refType"],
  refId: string,
  payload?: ActivityEvent["payload"]
): ActivityEvent[] {
  return [{ id: uid(), type, timestamp: nowIso(), refType, refId, payload }, ...events];
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...createInitialProgress(),

      startTopic: (topicId) => {
        const state = get();
        if (state.topicStages[topicId] && state.topicStages[topicId] !== "not-started") return;
        set({
          topicStages: { ...state.topicStages, [topicId]: "learning" },
          settings: { ...state.settings, currentGoalTopicId: topicId },
          events: pushEvent(state.events, "topic-started", "topic", topicId),
        });
      },

      setTopicStage: (topicId, stage) => {
        const state = get();
        if (state.topicStages[topicId] === stage) return;
        set({
          topicStages: { ...state.topicStages, [topicId]: stage },
          events: pushEvent(state.events, "stage-advanced", "topic", topicId, { stage }),
        });
      },

      startUnit: (unitId) => {
        const state = get();
        if (state.completedUnits[unitId] || state.startedUnits[unitId]) return;
        const unit = unitById.get(unitId);
        let events = pushEvent(state.events, "unit-started", "unit", unitId);
        const topicStages = { ...state.topicStages };
        // Advance out of not-started on first activity (advisory, non-blocking).
        if (unit && (!topicStages[unit.topicId] || topicStages[unit.topicId] === "not-started")) {
          topicStages[unit.topicId] = unit.stage;
          events = pushEvent(events, "topic-started", "topic", unit.topicId);
        }
        set({ startedUnits: { ...state.startedUnits, [unitId]: nowIso() }, topicStages, events });
      },

      completeUnit: (unitId) => {
        const state = get();
        if (state.completedUnits[unitId]) return;
        const unit = unitById.get(unitId);
        const completedUnits = { ...state.completedUnits, [unitId]: nowIso() };
        const startedUnits = { ...state.startedUnits };
        delete startedUnits[unitId];
        let events = pushEvent(state.events, "unit-completed", "unit", unitId);
        const topicStages = { ...state.topicStages };
        if (unit) {
          const derived = deriveStage(unit.topicId, completedUnits);
          if (derived && topicStages[unit.topicId] !== derived) {
            topicStages[unit.topicId] = derived;
            events = pushEvent(events, "stage-advanced", "topic", unit.topicId, { stage: derived });
          }
        }
        set({ completedUnits, startedUnits, topicStages, events });
      },

      uncompleteUnit: (unitId) => {
        const state = get();
        if (!state.completedUnits[unitId]) return;
        const completedUnits = { ...state.completedUnits };
        delete completedUnits[unitId];
        const unit = unitById.get(unitId);
        const topicStages = { ...state.topicStages };
        if (unit) {
          const derived = deriveStage(unit.topicId, completedUnits);
          if (derived && topicStages[unit.topicId] !== derived) {
            topicStages[unit.topicId] = derived;
          }
        }
        set({ completedUnits, topicStages });
      },

      setProjectStatus: (projectId, status) => {
        const state = get();
        const type: ActivityEventType =
          status === "completed" ? "project-completed" : "project-started";
        set({
          projectStatus: { ...state.projectStatus, [projectId]: status },
          events:
            status === "planned"
              ? state.events
              : pushEvent(state.events, type, "project", projectId, { status }),
        });
      },

      completeMilestone: (milestoneId) => {
        const state = get();
        if (state.completedMilestones[milestoneId]) return;
        const milestone = milestoneById.get(milestoneId);
        const completedMilestones = { ...state.completedMilestones, [milestoneId]: nowIso() };
        let events = pushEvent(state.events, "milestone-completed", "milestone", milestoneId);
        const projectStatus = { ...state.projectStatus };
        if (milestone) {
          const pid = milestone.projectId;
          const ms = milestonesForProject(pid);
          const done = ms.filter((m) => completedMilestones[m.id]).length;
          if (ms.length > 0 && done === ms.length) {
            if (projectStatus[pid] !== "completed") {
              projectStatus[pid] = "completed";
              events = pushEvent(events, "project-completed", "project", pid);
            }
          } else if (projectStatus[pid] !== "in-progress" && projectStatus[pid] !== "completed") {
            projectStatus[pid] = "in-progress";
            events = pushEvent(events, "project-started", "project", pid);
          }
        }
        set({ completedMilestones, projectStatus, events });
      },

      uncompleteMilestone: (milestoneId) => {
        const state = get();
        if (!state.completedMilestones[milestoneId]) return;
        const milestone = milestoneById.get(milestoneId);
        const completedMilestones = { ...state.completedMilestones };
        delete completedMilestones[milestoneId];
        const projectStatus = { ...state.projectStatus };
        if (milestone) {
          const pid = milestone.projectId;
          const ms = milestonesForProject(pid);
          const done = ms.filter((m) => completedMilestones[m.id]).length;
          projectStatus[pid] = done === 0 ? "planned" : "in-progress";
        }
        set({ completedMilestones, projectStatus });
      },

      addNote: (parentType, parentId, body) => {
        const state = get();
        const note: UserNote = {
          id: uid(),
          parentType,
          parentId,
          body,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set({
          notes: [note, ...state.notes],
          events: pushEvent(state.events, "note-added", "note", note.id, { parentId }),
        });
      },

      updateNote: (noteId, body) => {
        const state = get();
        const existing = state.notes.find((n) => n.id === noteId);
        if (!existing || existing.body === body) return;
        set({
          notes: state.notes.map((n) =>
            n.id === noteId ? { ...n, body, updatedAt: nowIso() } : n
          ),
        });
      },

      deleteNote: (noteId) => {
        const state = get();
        if (!state.notes.some((n) => n.id === noteId)) return;
        set({ notes: state.notes.filter((n) => n.id !== noteId) });
      },

      setTheme: (theme) => {
        const state = get();
        set({ settings: { ...state.settings, theme } });
      },

      logSession: ({ topicId, projectId, mode, minutes }) => {
        const state = get();
        const endedAt = nowIso();
        const startedAt = new Date(Date.now() - Math.max(0, minutes) * 60000).toISOString();
        const session: LearningSession = {
          id: uid(),
          topicId,
          projectId,
          mode,
          startedAt,
          endedAt,
          source: "manual",
        };
        set({
          sessions: [session, ...state.sessions],
          events: pushEvent(state.events, "session-logged", "session", session.id, {
            minutes,
            ...(topicId ? { topicId } : {}),
          }),
        });
      },

      // Replace the entire user-progress state (e.g. JSON import). Only known
      // fields are set, so curriculum data and actions are never touched.
      replaceProgress: (p) =>
        set({
          version: p.version,
          topicStages: p.topicStages,
          completedUnits: p.completedUnits,
          startedUnits: p.startedUnits,
          projectStatus: p.projectStatus,
          completedMilestones: p.completedMilestones,
          notes: p.notes,
          sessions: p.sessions,
          timeLog: p.timeLog,
          events: p.events,
          settings: p.settings,
        }),

      // Reset user progress but keep the theme preference (not learning progress).
      resetProgress: () => {
        const theme = get().settings.theme;
        set({ ...createInitialProgress(), settings: { theme } });
      },
    }),
    {
      name: "epoch.progress.v1",
      version: PROGRESS_VERSION,
      storage: createPersistStorage<UserProgress>(),
      // Persist only serializable progress data, never the action functions.
      partialize: (s) => ({
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
      }),
      migrate: (persisted) => persisted as ProgressStore,
    }
  )
);
