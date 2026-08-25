// Authentication state — deliberately SEPARATE from progressStore and curriculum.
// Not persisted: Firebase Auth owns its own credential/session lifecycle, so we
// never write the user or tokens into localStorage.
import { create } from "zustand";
import type { User } from "firebase/auth";
import {
  describeAuthError,
  mapAuthUser,
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  type AuthUser,
} from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { ensureUserProfile } from "@/lib/firebase/userService";

// Three-state machine: we must distinguish "not yet determined" from "logged out".
export type AuthStatus = "initializing" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  configured: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  initAuth: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "initializing",
  user: null,
  configured: isFirebaseConfigured,
  error: null,
  unsubscribe: null,

  initAuth: () => {
    if (get().unsubscribe) return; // guard against double-subscription (StrictMode)

    if (!isFirebaseConfigured) {
      set({ status: "unauthenticated", user: null, configured: false });
      return;
    }

    const unsubscribe = subscribeToAuth((firebaseUser: User | null) => {
      if (!firebaseUser) {
        set({ status: "unauthenticated", user: null });
        return;
      }
      const user = mapAuthUser(firebaseUser);
      set({ status: "authenticated", user, error: null });
      // Profile lifecycle is best-effort: a Firestore failure must not log the user out.
      void ensureUserProfile(user).catch((error) => {
        if (import.meta.env.DEV) console.error("[firebase] ensureUserProfile failed", error);
        set({ error: "Signed in, but your profile could not be synced." });
      });
    });

    set({ unsubscribe });
  },

  signIn: async () => {
    set({ error: null });
    try {
      await signInWithGoogle();
    } catch (error) {
      set({ error: describeAuthError(error) });
    }
  },

  signOut: async () => {
    set({ error: null });
    try {
      await signOutUser();
    } catch {
      set({ error: "Sign-out failed. Please try again." });
    }
  },

  clearError: () => set({ error: null }),
}));
