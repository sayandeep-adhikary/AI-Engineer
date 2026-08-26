// Auth service boundary. The rest of Epoch talks to these functions, never to
// the Firebase Auth SDK directly. Google Sign-In is the only provider: it is the
// least code for a premium single-user tool (no password/reset/verification UI).
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";
import { firebaseApp } from "./app";

/** Minimal, safe projection of a Firebase user. We never store the raw User. */
export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

const googleProvider = new GoogleAuthProvider();

export function mapAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

/** Subscribe to auth changes. Returns an unsubscribe; a no-op in local mode. */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) throw new Error("auth/not-configured");
  await setPersistence(auth, browserLocalPersistence);
  await signInWithPopup(auth, googleProvider);
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

/** Map a Firebase auth error code to a concise, user-safe message. */
export function describeAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/not-configured":
      return "Cloud sign-in is not configured in this environment.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for sign-in.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
