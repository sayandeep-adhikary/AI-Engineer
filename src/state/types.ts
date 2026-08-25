import type { Stage, LearningMode } from "@/data/curriculum";

// USER PROGRESS STATE — kept entirely separate from curriculum definition data.

export type ProjectStatus = "planned" | "in-progress" | "completed";

export type ActivityEventType =
  | "topic-started"
  | "unit-started"
  | "unit-completed"
  | "milestone-completed"
  | "project-started"
  | "project-completed"
  | "note-added"
  | "session-logged"
  | "stage-advanced";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: string; // ISO
  refType: "topic" | "unit" | "project" | "milestone" | "note" | "session";
  refId: string;
  payload?: Record<string, string | number>;
}

export interface UserNote {
  id: string;
  parentType: "topic" | "project";
  parentId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningSession {
  id: string;
  topicId?: string;
  projectId?: string;
  mode?: LearningMode;
  startedAt: string;
  endedAt?: string;
  source: "timer" | "manual";
}

export interface TimeLogEntry {
  id: string;
  topicId?: string;
  projectId?: string;
  minutes: number;
  note?: string;
  loggedAt: string;
}

export interface UserProgress {
  version: number;
  topicStages: Record<string, Stage>;
  completedUnits: Record<string, string>; // unitId -> ISO completedAt
  startedUnits: Record<string, string>; // unitId -> ISO startedAt (in-progress)
  projectStatus: Record<string, ProjectStatus>;
  completedMilestones: Record<string, string>; // milestoneId -> ISO
  notes: UserNote[];
  sessions: LearningSession[];
  timeLog: TimeLogEntry[];
  events: ActivityEvent[]; // append-only
  settings: {
    theme: "dark" | "light";
    currentGoalTopicId?: string;
  };
}

export const PROGRESS_VERSION = 1;

export function createInitialProgress(): UserProgress {
  return {
    version: PROGRESS_VERSION,
    topicStages: {},
    completedUnits: {},
    startedUnits: {},
    projectStatus: {},
    completedMilestones: {},
    notes: [],
    sessions: [],
    timeLog: [],
    events: [],
    settings: { theme: "dark" },
  };
}
