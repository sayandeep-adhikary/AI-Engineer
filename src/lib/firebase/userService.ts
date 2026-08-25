// Firestore service boundary for the user profile document. Callers use these
// functions without knowing Firestore details. Scope for this milestone:
// account metadata only — NO progress data is written here.
import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firestore";
import type { AuthUser } from "./auth";

const USERS_COLLECTION = "users";

/** Shape of `users/{uid}`. Account metadata only — never the progress model. */
export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

function profileRef(uid: string) {
  if (!db) throw new Error("firestore/not-configured");
  return doc(db, USERS_COLLECTION, uid);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    displayName: data.displayName ?? null,
    email: data.email ?? null,
    photoURL: data.photoURL ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/**
 * Create the profile on first sign-in, or refresh provider metadata on return.
 * `createdAt` is written once and never overwritten; `updatedAt` uses a server
 * timestamp on every call. Returns null in local mode.
 */
export async function ensureUserProfile(user: AuthUser): Promise<UserProfile | null> {
  if (!db) return null;
  const ref = profileRef(user.uid);
  const snap = await getDoc(ref);
  const identity = {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      ...identity,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Merge refreshes identity + updatedAt but leaves createdAt untouched.
    await setDoc(ref, { ...identity, updatedAt: serverTimestamp() }, { merge: true });
  }

  return getUserProfile(user.uid);
}
