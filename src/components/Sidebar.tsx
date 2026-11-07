import { useMemo, useState } from "react";
import { CURRICULUM, groupedModules, type Module } from "../data/curriculum";

interface Props {
  activeId: string;
  progress: Record<string, boolean>;
  onSelect: (id: string) => void;
  /** Whether a lesson has been unlocked yet on the journey. */
  canOpen: (id: string) => boolean;
}

export function Sidebar({ activeId, progress, onSelect, canOpen }: Props) {
  const [query, setQuery] = useState("");
  /** Phones only: the lesson list folds away so the lesson itself comes first. */
  const [open, setOpen] = useState(false);
  const active = CURRICULUM.find((m) => m.id === activeId);
  const groups = useMemo(() => groupedModules(), []);

  // Search across title/tagline/level so the nav scales as lessons grow.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return CURRICULUM.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.tagline.toLowerCase().includes(q) ||
        m.level.toLowerCase().includes(q) ||
        m.group.toLowerCase().includes(q)
    );
  }, [query]);

  const item = (m: Module) => {
    const locked = !canOpen(m.id);
    return (
      <button
        key={m.id}
        className={
          "nav-item" +
          (m.id === activeId ? " active" : "") +
          (progress[m.id] ? " done" : "") +
          (locked ? " locked" : "")
        }
        onClick={() => {
          onSelect(m.id);
          setOpen(false);
        }}
        disabled={locked}
        title={locked ? "Complete the previous lesson to unlock this one" : undefined}
      >
        <span className="ico">{locked ? "🔒" : m.icon}</span>
        <span className="meta">
          <span>{m.title}</span>
          <small>
            {m.mins} min · {m.level}
          </small>
        </span>
        <span className="check">✓</span>
      </button>
    );
  };

  return (
    <nav className={"sidebar" + (open ? " open" : "")} aria-label="Lessons">
      <button className="nav-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>
          {active ? `${active.icon} ${active.title}` : "Lessons"}
        </span>
        <span className="nav-toggle-hint">All lessons {open ? "▴" : "▾"}</span>
      </button>
      <div className="nav-body">
      <input
        className="nav-search"
        type="search"
        placeholder="Search lessons…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search lessons"
      />
      {filtered ? (
        filtered.length ? (
          filtered.map(item)
        ) : (
          <p className="nav-empty">No lessons match “{query}”.</p>
        )
      ) : (
        groups.map((g) => (
          <div key={g.group}>
            <div className="nav-group-title">{g.group}</div>
            {g.items.map(item)}
          </div>
        ))
      )}
      </div>
    </nav>
  );
}
