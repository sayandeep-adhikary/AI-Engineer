import { useAuthStore } from "@/state/authStore";
import { SyncStatus } from "./SyncStatus";
import styles from "./authmenu.module.css";

interface AuthMenuProps {
  /** Collapsed sidebar shows only the avatar/status glyph. */
  collapsed?: boolean;
}

function initialOf(user: { displayName: string | null; email: string | null }): string {
  const source = user.displayName || user.email || "?";
  return source.trim().charAt(0).toUpperCase() || "?";
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AuthMenu({ collapsed = false }: AuthMenuProps) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const configured = useAuthStore((s) => s.configured);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);

  if (status === "initializing") {
    return (
      <div className={`${styles.root} ${styles.muted}`} aria-busy="true">
        <span className={styles.dot} data-state="pending" aria-hidden="true" />
        {!collapsed && <span className={styles.label}>Connecting…</span>}
      </div>
    );
  }

  // Firebase not configured — Epoch runs locally, so we surface an honest badge.
  if (!configured) {
    return (
      <div className={`${styles.root} ${styles.muted}`} title="Cloud sync unavailable — running locally">
        <span className={styles.dot} data-state="local" aria-hidden="true" />
        {!collapsed && <span className={styles.label}>Local mode</span>}
      </div>
    );
  }

  if (status === "authenticated" && user) {
    return (
      <div className={styles.authed}>
        <div className={styles.account}>
          <div className={styles.identity} title={user.email ?? user.displayName ?? "Signed in"}>
            {user.photoURL ? (
              <img className={styles.avatar} src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className={styles.avatarFallback} aria-hidden="true">
                {initialOf(user)}
              </span>
            )}
            {!collapsed && (
              <span className={styles.identityText}>
                <span className={styles.name}>{user.displayName ?? "Signed in"}</span>
                {user.email && <span className={styles.email}>{user.email}</span>}
              </span>
            )}
          </div>
          <button
            type="button"
            className={styles.signOut}
            onClick={() => void signOut()}
            aria-label="Sign out"
            title="Sign out"
          >
            {collapsed ? "⇥" : "Sign out"}
          </button>
        </div>
        {!collapsed && <SyncStatus />}
      </div>
    );
  }

  // Unauthenticated + configured.
  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.signIn}
        onClick={() => void signIn()}
        aria-label="Sign in with Google"
      >
        <GoogleLogo className={styles.googleGlyph} />
        {!collapsed && <span>Sign in</span>}
      </button>
      {!collapsed && error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
