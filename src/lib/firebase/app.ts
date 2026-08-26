// Single Firebase app instance. HMR-safe: reuses the existing app on hot reload
// instead of throwing "Firebase App named '[DEFAULT]' already exists".
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { firebaseConfig } from "./config";

function resolveApp(): FirebaseApp | null {
  if (!firebaseConfig) return null;
  try {
    return getApps().length ? getApp() : initializeApp(firebaseConfig);
  } catch (error) {
    if (import.meta.env.DEV) console.error("[firebase] Failed to initialize app", error);
    return null;
  }
}

/** The initialized Firebase app, or null when Epoch is running in local mode. */
export const firebaseApp: FirebaseApp | null = resolveApp();
