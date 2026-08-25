import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useProgressStore } from "@/state/progressStore";
import { corePathProgress, streakDays } from "@/lib/selectors";
import { formatPercent } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { createCommands } from "@/components/command/commands";
import { AuthMenu } from "@/components/auth/AuthMenu";
import { SyncConflictDialog } from "@/components/auth/SyncConflictDialog";
import { useAuthStore } from "@/state/authStore";
import styles from "./appshell.module.css";

interface NavItem {
  to: string;
  label: string;
  glyph: string;
  end?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", glyph: "◎", end: true },
  { to: "/roadmap", label: "Roadmap", glyph: "⌗" },
  { to: "/labs", label: "Practice / Labs", glyph: "▶" },
  { to: "/projects", label: "Projects", glyph: "◼" },
  { to: "/analytics", label: "Analytics", glyph: "▤" },
  { to: "/notes", label: "Notes & Resources", glyph: "✎" },
];

const MOBILE_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", glyph: "◎", end: true },
  { to: "/roadmap", label: "Roadmap", glyph: "⌗" },
  { to: "/labs", label: "Labs", glyph: "▶" },
  { to: "/projects", label: "Projects", glyph: "◼" },
];

const MORE_NAV: NavItem[] = [
  { to: "/analytics", label: "Analytics", glyph: "▤" },
  { to: "/notes", label: "Notes & Resources", glyph: "✎" },
  { to: "/settings", label: "Settings", glyph: "⚙" },
];

export function AppShell() {
  const progress = useProgressStore();
  const theme = progress.settings.theme;
  const setTheme = useProgressStore((state) => state.setTheme);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const authStatus = useAuthStore((s) => s.status);
  const authConfigured = useAuthStore((s) => s.configured);
  const authSignIn = useAuthStore((s) => s.signIn);
  const authSignOut = useAuthStore((s) => s.signOut);
  const commands = useMemo(
    () =>
      createCommands({
        navigate,
        theme,
        setTheme,
        auth: {
          status: authStatus,
          configured: authConfigured,
          signIn: () => void authSignIn(),
          signOut: () => void authSignOut(),
        },
      }),
    [navigate, setTheme, theme, authStatus, authConfigured, authSignIn, authSignOut]
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const isEditable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.matches("input, textarea, select") || target.isContentEditable);
    const handleShortcut = (event: KeyboardEvent) => {
      const commandShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const slashShortcut = event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey;
      if (!commandShortcut && (!slashShortcut || isEditable(event.target))) return;
      event.preventDefault();
      setMoreOpen(false);
      setPaletteOpen((open) => commandShortcut && open ? false : true);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const core = corePathProgress(progress);
  const streak = streakDays(progress);

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* Desktop / tablet sidebar */}
      <aside className={styles.sidebar} aria-label="Primary">
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            ◆
          </span>
          {!collapsed && <span className={styles.wordmark}>Signal</span>}
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className={styles.nav} aria-label="Sections">
          <button
            type="button"
            className={`${styles.navItem} ${styles.commandTrigger}`}
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette"
            aria-haspopup="dialog"
          >
            <span className={styles.navGlyph} aria-hidden="true">⌕</span>
            {!collapsed && <span className={styles.navLabel}>Search</span>}
            {!collapsed && <kbd className={styles.shortcut}>Ctrl K</kbd>}
          </button>
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}
              title={item.label}
            >
              <span className={styles.navGlyph} aria-hidden="true">
                {item.glyph}
              </span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFoot}>
          {!collapsed ? (
            <div className={styles.coreReadout}>
              <div className={styles.coreRow}>
                <span className="overline">Core Path</span>
                <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}>
                  {formatPercent(core)}
                </span>
              </div>
              <ProgressBar ratio={core} label="Core path progress" />
              <div className={styles.streak}>
                <span aria-hidden="true">▲</span>
                <span className="mono">{streak}d streak</span>
              </div>
            </div>
          ) : (
            <div className={styles.coreMini} title={`Core path ${formatPercent(core)}`}>
              <span className="mono">{formatPercent(core)}</span>
            </div>
          )}
          <AuthMenu collapsed={collapsed} />
          <NavLink
            to="/settings"
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}
            title="Settings"
          >
            <span className={styles.navGlyph} aria-hidden="true">
              ⚙
            </span>
            {!collapsed && <span className={styles.navLabel}>Settings</span>}
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main id="main" className={styles.main} tabIndex={-1}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className={styles.bottomNav} aria-label="Primary mobile">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}
          >
            <span className={styles.tabGlyph} aria-hidden="true">
              {item.glyph}
            </span>
            <span className={styles.tabLabel}>{item.label}</span>
          </NavLink>
        ))}
        <button
          className={`${styles.tab}`}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <span className={styles.tabGlyph} aria-hidden="true">
            ⋯
          </span>
          <span className={styles.tabLabel}>More</span>
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div
          className={styles.sheetOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="More"
          onClick={() => setMoreOpen(false)}
        >
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} aria-hidden="true" />
            <button
              type="button"
              className={styles.sheetItem}
              onClick={() => { setMoreOpen(false); setPaletteOpen(true); }}
            >
              <span className={styles.navGlyph} aria-hidden="true">⌕</span>
              Search &amp; commands
            </button>
            {MORE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={styles.sheetItem}
                onClick={() => setMoreOpen(false)}
              >
                <span className={styles.navGlyph} aria-hidden="true">
                  {item.glyph}
                </span>
                {item.label}
              </NavLink>
            ))}
            <div className={styles.sheetAuth}>
              <AuthMenu />
            </div>
          </div>
        </div>
      )}

      {paletteOpen && <CommandPalette commands={commands} onClose={() => setPaletteOpen(false)} />}
      <SyncConflictDialog />
    </div>
  );
}
