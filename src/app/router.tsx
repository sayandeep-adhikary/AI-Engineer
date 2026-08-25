import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { RoadmapPage } from "@/pages/RoadmapPage";
import { CategoryDetailPage } from "@/pages/CategoryDetailPage";
import { TopicWorkspacePage } from "@/pages/TopicWorkspacePage";
import { LabsPage } from "@/pages/LabsPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { ActivityLogPage } from "@/pages/ActivityLogPage";
import { NotesPage } from "@/pages/NotesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "roadmap", element: <RoadmapPage /> },
      { path: "roadmap/:categoryId", element: <CategoryDetailPage /> },
      {
        path: "roadmap/:categoryId/:topicId",
        element: <TopicWorkspacePage />,
      },
      {
        path: "labs",
        element: <LabsPage />,
      },
      {
        path: "projects",
        element: <ProjectsPage />,
      },
      {
        path: "projects/:projectId",
        element: <ProjectDetailPage />,
      },
      {
        path: "analytics",
        element: <AnalyticsPage />,
      },
      {
        path: "analytics/activity",
        element: <ActivityLogPage />,
      },
      {
        path: "notes",
        element: <NotesPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
