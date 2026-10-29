import { useCallback, useEffect, useMemo, useState } from "react";
import { alerts as computeAlerts } from "./lib/calc";
import { useStore } from "./lib/store";
import { Modal, Toast } from "./components/ui";
import { QuickTask } from "./components/forms";
import Dashboard from "./pages/Dashboard";
import Universities from "./pages/Universities";
import ProgramDetail from "./pages/ProgramDetail";
import Applications from "./pages/Applications";
import Requirements from "./pages/Requirements";
import Tasks from "./pages/Tasks";
import Ielts from "./pages/Ielts";
import Documents from "./pages/Documents";
import Workspace from "./pages/Workspace";
import Recommendations from "./pages/Recommendations";
import Bolashak from "./pages/Bolashak";
import Budget from "./pages/Budget";
import Review from "./pages/Review";
import SettingsPage from "./pages/Settings";
import Welcome from "./pages/Welcome";

const NAV: { route: string; label: string; key: string }[] = [
  { route: "dashboard", label: "Dashboard", key: "D" },
  { route: "review", label: "Weekly review", key: "W" },
  { route: "universities", label: "Universities", key: "U" },
  { route: "applications", label: "Applications", key: "A" },
  { route: "requirements", label: "Requirements", key: "R" },
  { route: "tasks", label: "Tasks & Calendar", key: "T" },
  { route: "ielts", label: "IELTS", key: "I" },
  { route: "documents", label: "Documents", key: "F" },
  { route: "workspace", label: "SOP & CV", key: "S" },
  { route: "recommendations", label: "Recommendations", key: "L" },
  { route: "bolashak", label: "Bolashak", key: "B" },
  { route: "budget", label: "Budget", key: "$" },
  { route: "prefs", label: "Settings", key: "⚙" },
];

function readHash(): string {
  const h = window.location.hash.replace(/^#/, "");
  return h || "dashboard";
}

export function navigate(route: string) {
  if (window.location.hash !== `#${route}`) window.location.hash = route;
}

export default function App() {
  const { state, ready, saveState, saveError, retrySave, backend, loadError } = useStore();
  const [route, setRoute] = useState(readHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [toast, setToast] = useState("");
  const clearToast = useCallback(() => setToast(""), []);

  useEffect(() => {
    const h = () => {
      setRoute(readHash());
      setMenuOpen(false);
      document.querySelector(".main")?.scrollTo?.({ top: 0 });
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  // Keyboard: "n" opens quick task entry (when not typing).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && state.initialized) {
        e.preventDefault();
        setQuickOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [state.initialized]);

  const alertList = useMemo(() => (state.initialized ? computeAlerts(state) : []), [state]);
  const urgent = alertList.filter((a) => a.level !== "info").length;

  if (!ready) {
    return (
      <div className="boot" aria-busy="true">
        <div className="boot-mark">MA</div>
        <p>Opening your workspace…</p>
      </div>
    );
  }
  if (!state.initialized) return <Welcome />;

  const base = route.startsWith("program-") ? "universities" : route;
  let page: JSX.Element;
  if (route.startsWith("program-")) page = <ProgramDetail programId={route.slice(8)} />;
  else
    switch (route) {
      case "review":
        page = <Review />;
        break;
      case "universities":
        page = <Universities />;
        break;
      case "applications":
        page = <Applications />;
        break;
      case "requirements":
        page = <Requirements />;
        break;
      case "tasks":
        page = <Tasks />;
        break;
      case "ielts":
        page = <Ielts />;
        break;
      case "documents":
        page = <Documents />;
        break;
      case "workspace":
        page = <Workspace />;
        break;
      case "recommendations":
        page = <Recommendations />;
        break;
      case "bolashak":
        page = <Bolashak />;
        break;
      case "budget":
        page = <Budget />;
        break;
      case "prefs":
        page = <SettingsPage />;
        break;
      default:
        page = <Dashboard />;
    }

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved" : backend?.kind === "cloud" ? "Synced" : "Saved in browser";

  return (
    <div className="shell">
      <aside className={`sidebar${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            MA
          </span>
          <span className="brand-text">
            <strong>Master's OS</strong>
            <span>AITU → MSc 2027</span>
          </span>
        </div>
        <nav>
          <ul>
            {NAV.map((n) => (
              <li key={n.route}>
                <a href={`#${n.route}`} className={base === n.route ? "nav-link is-on" : "nav-link"} aria-current={base === n.route ? "page" : undefined}>
                  <span className="nav-key" aria-hidden="true">
                    {n.key}
                  </span>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-foot">
          <span className={`save-dot save-${saveState}`} aria-hidden="true" />
          <span>{saveLabel}</span>
        </div>
      </aside>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <div className="main-col">
        <div className="topbar">
          <button type="button" className="btn btn-ghost menu-btn" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            ☰
          </button>
          <div className="topbar-save" aria-live="polite">
            <span className={`save-dot save-${saveState}`} aria-hidden="true" />
            {saveLabel}
            {saveState === "error" && (
              <button type="button" className="btn btn-sm" onClick={retrySave}>
                Retry
              </button>
            )}
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setQuickOpen(true)} title="Shortcut: N">
              + Task
            </button>
            <button type="button" className="btn btn-sm alerts-btn" onClick={() => setAlertsOpen(true)} aria-label={`Alerts: ${alertList.length}`}>
              Alerts
              {alertList.length > 0 && <span className={`count${urgent ? " is-urgent" : ""}`}>{alertList.length}</span>}
            </button>
          </div>
        </div>
        {(saveState === "error" || loadError) && (
          <div className="banner banner-bad" role="alert">
            {saveState === "error" ? saveError : loadError}
          </div>
        )}
        <main className="main" id="main">
          {page}
        </main>
      </div>

      {alertsOpen && (
        <Modal title="Alerts" onClose={() => setAlertsOpen(false)}>
          <p className="muted small">In-app warnings, recalculated whenever your data changes. Nothing is emailed or pushed.</p>
          {alertList.length === 0 ? (
            <p>Nothing needs attention right now.</p>
          ) : (
            <ul className="alert-list">
              {alertList.map((a) => (
                <li key={a.id} className={`alert lvl-${a.level}`}>
                  <span className="alert-lvl">{a.level === "critical" ? "Urgent" : a.level === "warning" ? "Warning" : "Info"}</span>
                  <a
                    href={`#${a.route}`}
                    onClick={() => setAlertsOpen(false)}
                  >
                    <strong>{a.title}</strong>
                    <span>{a.detail}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
      {quickOpen && (
        <QuickTask
          onClose={() => setQuickOpen(false)}
          onSaved={(t) => {
            setQuickOpen(false);
            setToast(`Added “${t}”`);
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  );
}
