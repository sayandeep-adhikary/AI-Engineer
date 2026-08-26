// Cloud progress persistence — the ONLY module that reads/writes the user's
// progress document in Firestore. The rest of Epoch goes through syncStore.
//
// Schema:  users/{uid}/progress/current
//   { schemaVersion, progressVersion, progress: UserProgress, updatedAt }
//
// The whole progress object is stored in one document (Option A): the serialized
// state is far below Firestore's 1 MiB limit, keeps writes atomic, and makes
// security rules and recovery trivial. Curriculum data is NEVER stored here.
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "./firestore";
import { validateImportedProgress } from "@/lib/progressIO";
import { PROGRESS_VERSION, type UserProgress } from "@/state/types";

/** Cloud sync schema version — independent from the app's PROGRESS_VERSION. */
export const CLOUD_SCHEMA_VERSION = 1 as const;

const PROGRESS_COLLECTION = "progress";
const PROGRESS_DOC = "current";

export type CloudLoadResult =
  | { kind: "absent" }
  | { kind: "ok"; progress: UserProgress; schemaVersion: number }
  | { kind: "unsupported"; schemaVersion: number }
  | { kind: "invalid"; error: string };

function progressRef(uid: string): DocumentReference {
  if (!db) throw new Error("firestore/not-configured");
  return doc(db, "users", uid, PROGRESS_COLLECTION, PROGRESS_DOC);
}

/** Drop `undefined` values (Firestore rejects them) and any non-JSON data. */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function loadCloudProgress(uid: string): Promise<CloudLoadResult> {
  const snap = await getDoc(progressRef(uid));
  if (!snap.exists()) return { kind: "absent" };

  const data = snap.data();
  const schemaVersion = typeof data.schemaVersion === "number" ? data.schemaVersion : 0;

  // Fail safe on a newer, unknown schema — never corrupt forward-written data.
  if (schemaVersion > CLOUD_SCHEMA_VERSION) {
    return { kind: "unsupported", schemaVersion };
  }

  // Reuse the import validator to sanitize cloud data into a clean UserProgress.
  const result = validateImportedProgress(data.progress);
  if (!result.ok) return { kind: "invalid", error: result.error };

  return { kind: "ok", progress: result.progress, schemaVersion };
}

export async function saveCloudProgress(uid: string, progress: UserProgress): Promise<void> {
  await setDoc(progressRef(uid), {
    schemaVersion: CLOUD_SCHEMA_VERSION,
    progressVersion: progress.version ?? PROGRESS_VERSION,
    progress: toPlain(progress),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCloudProgress(uid: string): Promise<void> {
  await deleteDoc(progressRef(uid));
}
