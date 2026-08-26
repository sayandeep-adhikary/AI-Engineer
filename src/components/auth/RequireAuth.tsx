import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/state/authStore";

interface RequireAuthProps {
  children: ReactNode;
  /** Where to send unauthenticated users. Defaults to the dashboard. */
  redirectTo?: string;
  /** Rendered while auth is still initializing. */
  fallback?: ReactNode;
}

/**
 * Auth guard for FUTURE protected routes. Intentionally NOT applied to any route
 * yet — Epoch stays fully usable without signing in. It exists so a later
 * milestone can wrap authenticated-only surfaces without re-inventing the gate.
 */
export function RequireAuth({ children, redirectTo = "/", fallback = null }: RequireAuthProps) {
  const status = useAuthStore((s) => s.status);

  if (status === "initializing") return <>{fallback}</>;
  if (status === "unauthenticated") return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
