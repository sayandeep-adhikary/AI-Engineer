import type { NavigateFunction } from "react-router-dom";
import { categories, projects, topics } from "@/data/curriculum";
import { allLabs } from "@/lib/selectors";

export type CommandGroup = "Navigation" | "Actions" | "Categories" | "Topics" | "Projects" | "Labs";

export interface EpochCommand {
  id: string;
  label: string;
  description: string;
  keywords: readonly string[];
  glyph: string;
  group: CommandGroup;
  action: () => void;
  navigationTarget?: string;
  shortcut?: string;
  defaultVisible?: boolean;
}

interface CommandContext {
  navigate: NavigateFunction;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  auth?: {
    status: "initializing" | "authenticated" | "unauthenticated";
    configured: boolean;
    signIn: () => void;
    signOut: () => void;
  };
}

const navigation = (
  id: string,
  label: string,
  description: string,
  target: string,
  glyph: string,
  keywords: readonly string[] = []
): Omit<EpochCommand, "action" | "navigationTarget"> & { navigationTarget: string } => ({
  id,
  label,
  description,
  keywords,
  glyph,
  group: "Navigation",
  navigationTarget: target,
  defaultVisible: true,
});

export function createCommands({ navigate, theme, setTheme, auth }: CommandContext): EpochCommand[] {
  const base = [
    navigation("nav-dashboard", "Dashboard", "Return to your learning overview", "/", "◎", ["home", "overview"]),
    navigation("nav-roadmap", "Roadmap", "Explore the complete learning path", "/roadmap", "⌗", ["path", "curriculum"]),
    navigation("nav-labs", "Practice / Labs", "Open hands-on curriculum work", "/labs", "▶", ["practice", "exercises", "build"]),
    navigation("nav-projects", "Projects", "Open the project board", "/projects", "◼", ["portfolio", "build"]),
    navigation("nav-analytics", "Analytics", "Inspect progress and learning velocity", "/analytics", "▤", ["stats", "progress", "activity"]),
    navigation("nav-notes", "Notes & Resources", "Search your notes and curriculum references", "/notes", "✎", ["resources", "references"]),
    navigation("nav-settings", "Settings", "Manage appearance and learning data", "/settings", "⚙", ["preferences", "appearance"]),
  ].map((command) => ({ ...command, action: () => navigate(command.navigationTarget) }));

  const nextTheme = theme === "dark" ? "light" : "dark";
  const actions: EpochCommand[] = [
    {
      id: "action-theme",
      label: `Switch to ${nextTheme} theme`,
      description: `Use Epoch's ${nextTheme} appearance`,
      keywords: ["theme", "toggle", "appearance", "dark", "light"],
      glyph: nextTheme === "light" ? "○" : "◐",
      group: "Actions",
      action: () => setTheme(nextTheme),
      shortcut: "Enter",
      defaultVisible: true,
    },
    {
      id: "action-reset",
      label: "Reset progress…",
      description: "Open the guarded reset confirmation in Settings",
      keywords: ["erase", "clear", "start over", "danger"],
      glyph: "↺",
      group: "Actions",
      action: () => navigate("/settings?confirmReset=1"),
      navigationTarget: "/settings?confirmReset=1",
      defaultVisible: true,
    },
  ];

  if (auth?.configured) {
    if (auth.status === "authenticated") {
      actions.push({
        id: "action-sign-out",
        label: "Sign out",
        description: "Sign out of your Epoch account",
        keywords: ["logout", "log out", "account", "firebase"],
        glyph: "⇥",
        group: "Actions",
        action: auth.signOut,
        defaultVisible: true,
      });
    } else if (auth.status === "unauthenticated") {
      actions.push({
        id: "action-sign-in",
        label: "Sign in",
        description: "Sign in with Google to enable your account",
        keywords: ["login", "log in", "account", "google", "firebase"],
        glyph: "→",
        group: "Actions",
        action: auth.signIn,
        defaultVisible: true,
      });
    }
  }

  const categoryCommands: EpochCommand[] = categories.map((category) => ({
    id: `category-${category.id}`,
    label: category.title,
    description: category.description,
    keywords: [category.slug, category.track, "category"],
    glyph: "◇",
    group: "Categories",
    navigationTarget: `/roadmap/${category.id}`,
    action: () => navigate(`/roadmap/${category.id}`),
  }));

  const topicCommands: EpochCommand[] = topics.map((topic) => ({
    id: `topic-${topic.id}`,
    label: topic.title,
    description: topic.shortDescription,
    keywords: [topic.slug, topic.track, topic.difficulty, "topic"],
    glyph: "·",
    group: "Topics",
    navigationTarget: `/roadmap/${topic.categoryId}/${topic.id}`,
    action: () => navigate(`/roadmap/${topic.categoryId}/${topic.id}`),
  }));

  const projectCommands: EpochCommand[] = projects.map((project) => ({
    id: `project-${project.id}`,
    label: project.title,
    description: project.description,
    keywords: [`p${project.number}`, project.slug, project.track, "project", ...project.technologies],
    glyph: "■",
    group: "Projects",
    navigationTarget: `/projects/${project.id}`,
    action: () => navigate(`/projects/${project.id}`),
  }));

  const labCommands: EpochCommand[] = allLabs().map(({ unit, topic, category }) => ({
    id: `lab-${unit.id}`,
    label: unit.title,
    description: `${topic.title} · ${category.title}`,
    keywords: [unit.mode, unit.stage, unit.difficulty, "lab", "practice", topic.title, category.title],
    glyph: "▷",
    group: "Labs",
    navigationTarget: `/roadmap/${category.id}/${topic.id}?unit=${unit.id}`,
    action: () => navigate(`/roadmap/${category.id}/${topic.id}?unit=${unit.id}`),
  }));

  return [...base, ...actions, ...categoryCommands, ...topicCommands, ...projectCommands, ...labCommands];
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().trim().replace(/\s+/g, " ");
}

function rank(command: EpochCommand, query: string): number | null {
  const label = normalize(command.label);
  const description = normalize(command.description);
  const keywords = command.keywords.map(normalize);

  if (label === query) return 0;
  if (label.startsWith(query)) return 100;
  if (label.split(/[^a-z0-9]+/).some((word) => word.startsWith(query))) return 200;
  if (label.includes(query)) return 250;
  if (keywords.some((keyword) => keyword === query || keyword.startsWith(query))) return 300;
  if (keywords.some((keyword) => keyword.includes(query))) return 350;
  if (description.includes(query)) return 400;
  return null;
}

export function searchCommands(commands: readonly EpochCommand[], rawQuery: string): EpochCommand[] {
  const query = normalize(rawQuery);
  if (!query) return commands.filter((command) => command.defaultVisible);

  return commands
    .map((command, index) => ({ command, index, score: rank(command, query) }))
    .filter((result): result is { command: EpochCommand; index: number; score: number } => result.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, 40)
    .map(({ command }) => command);
}