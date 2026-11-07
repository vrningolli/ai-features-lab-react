import { useCallback, useEffect, useMemo, useState } from "react";
import { CURRICULUM } from "./data/curriculum";
import { useProgress } from "./useProgress";
import { Sidebar } from "./components/Sidebar";
import { Lesson } from "./components/Lesson";
import { Studio } from "./components/Studio";
import { WorldMap } from "./components/WorldMap";
import { BadgeToasts } from "./components/BadgeToast";
import { AgentPanel } from "./components/AgentPanel";
import { labPrompt } from "./lib/prompts";
import { unlockedIds } from "./data/gamification";

type View = "world" | "lessons" | "studio" | "agent";
type Theme = "dark" | "light";

const THEME_KEY = "ai-features-lab.theme";
/** True when this build is served inside the DS Coach site at /ai-lab/. */
const EMBEDDED_IN_COACH = /\/ai-lab\/?$/.test(location.pathname.replace(/index\.html$/, ""));

function indexFromHash(): number {
  const id = (location.hash || "").replace("#", "");
  const i = CURRICULUM.findIndex((m) => m.id === id);
  return i >= 0 ? i : 0;
}

export default function App() {
  const [index, setIndex] = useState<number>(indexFromHash);
  const [view, setView] = useState<View>(() => {
    if (location.hash === "#studio") return "studio";
    if (location.hash === "#agent") return "agent";
    if (!location.hash || location.hash === "#world") return "world"; // land on the journey map
    return "lessons";
  });
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(THEME_KEY) as Theme) || "dark"
  );
  /** A lab handed from a lesson to the agent runner, consumed on arrival. */
  const [handoff, setHandoff] = useState<{ prompt: string; lesson: string } | null>(null);
  const {
    progress,
    xp,
    rank,
    badgeIds,
    pendingBadges,
    dismissBadge,
    freeRoam,
    setFreeRoam,
    toggle,
    markAced,
    reset,
  } = useProgress();

  const current = CURRICULUM[index];

  // Which lessons the traveler may open — free roam lifts the gate entirely.
  const open = useMemo(() => unlockedIds(progress), [progress]);
  const canOpen = useCallback(
    (id: string) => freeRoam || open.has(id),
    [freeRoam, open]
  );

  // Apply + persist theme.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Keep the URL hash in sync so map/lessons/studio are deep-linkable.
  useEffect(() => {
    if (view === "studio") location.hash = "studio";
    else if (view === "agent") location.hash = "agent";
    else if (view === "world") location.hash = "world";
    else if (current) location.hash = current.id;
  }, [current, view]);

  // Respond to back/forward navigation.
  useEffect(() => {
    const onHash = () => {
      if (location.hash === "#studio") setView("studio");
      else if (location.hash === "#agent") setView("agent");
      else if (location.hash === "#world" || !location.hash) setView("world");
      else {
        setView("lessons");
        setIndex(indexFromHash());
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Keyboard shortcuts: ←/→ move lessons, "/" focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        (document.querySelector(".nav-search") as HTMLInputElement | null)?.focus();
        return;
      }
      if (view !== "lessons") return;
      if (e.key === "ArrowRight") {
        setIndex((i) => {
          const next = Math.min(CURRICULUM.length - 1, i + 1);
          return canOpen(CURRICULUM[next].id) ? next : i; // don't skip a sealed shrine
        });
      }
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, canOpen]);

  const goto = useCallback(
    (id: string) => {
      if (!canOpen(id)) return;
      const i = CURRICULUM.findIndex((m) => m.id === id);
      if (i >= 0) {
        setIndex(i);
        setView("lessons");
      }
    },
    [canOpen]
  );

  const doneCount = useMemo(
    () => CURRICULUM.filter((m) => progress[m.id]).length,
    [progress]
  );
  const pct = Math.round((doneCount / CURRICULUM.length) * 100);
  const allDone = doneCount === CURRICULUM.length;

  const handleToggle = useCallback(() => {
    const wasDone = progress[current.id];
    toggle(current.id);
    if (!wasDone && index < CURRICULUM.length - 1) {
      setTimeout(() => setIndex((i) => i + 1), 350);
    }
  }, [progress, current, index, toggle]);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="logo">◆</span>
          <div>
            {/* Only when deployed inside DS Coach at /ai-lab/ — standalone there's nothing to go back to. */}
            {EMBEDDED_IN_COACH && (
              <a className="back-home" href="../">
                ← DS Coach
              </a>
            )}
            <h1>AI Features Lab</h1>
            <p className="sub">
              Hands-on Claude Code academy — Skills · Agents · Hooks · MCP · Instructions · Plugins
            </p>
          </div>
        </div>

        <div className="topbar-right">
          <div className="view-tabs" role="tablist">
            <button
              className={"view-tab" + (view === "world" ? " active" : "")}
              onClick={() => setView("world")}
            >
              🗺️ Journey
            </button>
            <button
              className={"view-tab" + (view === "lessons" ? " active" : "")}
              onClick={() => setView("lessons")}
            >
              📚 Lessons
            </button>
            <button
              className={"view-tab" + (view === "studio" ? " active" : "")}
              onClick={() => setView("studio")}
            >
              🛠️ Studio
            </button>
            <button
              className={"view-tab" + (view === "agent" ? " active" : "")}
              onClick={() => setView("agent")}
            >
              🤖 Agent
            </button>
          </div>

          <span className="rank-chip" title={`${xp} XP · ${rank.title}`}>
            <b>Lv.{rank.level}</b> {rank.title} · ⭐ {xp}
          </span>

          {view === "lessons" && (
            <div className="progress-wrap" title={`${doneCount} of ${CURRICULUM.length} lessons complete`}>
              <div className="progress-track">
                <div className="progress-bar" style={{ width: pct + "%" }} />
              </div>
              <span className="progress-label">
                {allDone ? "🎉 100%" : pct + "%"}
              </span>
            </div>
          )}

          <button
            className="theme-toggle"
            title="Toggle light / dark theme"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {view === "world" ? (
        <div className="layout layout-full">
          <WorldMap
            progress={progress}
            activeId={current.id}
            onSelect={goto}
            xp={xp}
            rank={rank}
            badgeIds={badgeIds}
            freeRoam={freeRoam}
            onFreeRoam={setFreeRoam}
          />
        </div>
      ) : view === "lessons" ? (
        <div className="layout">
          <Sidebar
            activeId={current.id}
            progress={progress}
            onSelect={goto}
            canOpen={canOpen}
          />
          <Lesson
            module={current}
            index={index}
            total={CURRICULUM.length}
            done={!!progress[current.id]}
            onToggleDone={handleToggle}
            onAceQuiz={() => markAced(current.id)}
            onPrev={() => setIndex((i) => Math.max(0, i - 1))}
            onNext={() => goto(CURRICULUM[Math.min(CURRICULUM.length - 1, index + 1)].id)}
            nextLocked={
              index < CURRICULUM.length - 1 && !canOpen(CURRICULUM[index + 1].id)
            }
            onMap={() => setView("world")}
            onRunLab={() => {
              setHandoff({ prompt: labPrompt(current), lesson: current.title });
              setView("agent");
            }}
          />
        </div>
      ) : view === "agent" ? (
        <div className="layout layout-full">
          <AgentPanel
            initialPrompt={handoff?.prompt}
            fromLesson={handoff?.lesson}
            onConsumePrompt={() => setHandoff(null)}
          />
        </div>
      ) : (
        <div className="layout layout-full">
          <Studio />
        </div>
      )}

      <footer className="footer">
        <span>
          {view === "world" ? (
            <>🏮 Light every shrine to reach the summit · progress saves in this browser</>
          ) : view === "lessons" ? (
            <>
              {doneCount}/{CURRICULUM.length} lessons complete · ←/→ to navigate · <kbd>/</kbd> to search
            </>
          ) : view === "agent" ? (
            <>Free model, your own Claude key, or your local OpenClaw — keys stay in this browser.</>
          ) : (
            <>Generated files are templates — review before committing.</>
          )}
        </span>
        <button className="ghost-btn" onClick={reset}>
          Reset progress
        </button>
      </footer>

      <BadgeToasts badges={pendingBadges} onDismiss={dismissBadge} />
    </>
  );
}
