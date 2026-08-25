import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { useAuthStore } from "@/state/authStore";
import { useSyncStore } from "@/state/syncStore";
import { router } from "./router";

export function App() {
  // Start the Firebase auth listener once. This calls the auth store action —
  // Firebase itself stays isolated in the store/service, not in this component.
  const initAuth = useAuthStore((s) => s.initAuth);
  const initSync = useSyncStore((s) => s.initSync);
  useEffect(() => {
    initAuth();
    initSync(); // drives cloud sync off authenticated-user transitions
  }, [initAuth, initSync]);

  return <RouterProvider router={router} />;
}
