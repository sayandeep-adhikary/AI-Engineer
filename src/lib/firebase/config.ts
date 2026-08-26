// Firebase Web configuration, sourced entirely from Vite environment variables.
// These are public client identifiers (safe to ship), but we keep them
// environment-driven so the repository never hard-codes a specific project.
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const REQUIRED_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

function readConfig(): FirebaseConfig | null {
  const env = import.meta.env;
  const missing = REQUIRED_KEYS.filter((key) => !env[key] || String(env[key]).trim() === "");
  if (missing.length > 0) {
    if (import.meta.env.DEV) {
      // Not an error — Epoch runs fully in local mode without Firebase.
      console.info(
        `[firebase] Cloud features disabled — missing env: ${missing.join(", ")}. ` +
          "Copy .env.example to .env to enable authentication."
      );
    }
    return null;
  }
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
}

export const firebaseConfig: FirebaseConfig | null = readConfig();

/** True when every required Firebase variable is present. Drives graceful local mode. */
export const isFirebaseConfigured = firebaseConfig !== null;
