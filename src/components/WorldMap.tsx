import { Flame, Footprints, Lock, Star } from "lucide-react";
import { BadgeIcon, LessonIcon } from "./Icons";
import { useMemo, useRef, useState } from "react";
import { CURRICULUM, type Module } from "../data/curriculum";
import {
  BADGES,
  litRun,
  unlockedIds,
  xpFor,
  type RankInfo,
} from "../data/gamification";

/* ============================================================
   The Learning Journey — an anime-landscape world map.
   Each lesson is a shrine along a winding mountain path:
   torii gate at the village, stone lanterns up the pass, and a
   pagoda at the summit. Completed lessons light their lanterns,
   and the shrine ahead unlocks as the trail advances.
   Day/night follows the app theme.
   ============================================================ */

interface Props {
  progress: Record<string, boolean>;
  activeId: string;
  onSelect: (id: string) => void;
  xp: number;
  rank: RankInfo;
  badgeIds: Set<string>;
  /** When on, every shrine is enterable regardless of the unlock rule. */
  freeRoam: boolean;
  onFreeRoam: (on: boolean) => void;
}

/** Hand-placed positions for the 11 stations (viewBox 1200×760). */
const NODE_POS: Record<string, { x: number; y: number; label: string }> = {
  overview: { x: 130, y: 640, label: "Big Picture" },
  instructions: { x: 300, y: 612, label: "Instructions" },
  skills: { x: 448, y: 552, label: "Skills" },
  subagents: { x: 338, y: 466, label: "Subagents" },
  hooks: { x: 500, y: 406, label: "Hooks" },
  mcp: { x: 665, y: 446, label: "MCP" },
  commands: { x: 802, y: 372, label: "Commands" },
  plugins: { x: 692, y: 288, label: "Plugins" },
  "case-study": { x: 858, y: 244, label: "Case Study" },
  "build-projects": { x: 992, y: 206, label: "Projects" },
  capstone: { x: 1080, y: 118, label: "Capstone" },
};

function smoothPath(pts: [number, number][]): string {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L ${last[0]} ${last[1]}`;
}

/* Fixed star field so the night sky doesn't reshuffle per render. */
const STARS = Array.from({ length: 26 }, (_, i) => ({
  x: ((i * 197) % 1180) + 10,
  y: ((i * 83) % 250) + 8,
  r: (i % 3) * 0.5 + 0.8,
  d: (i % 5) * 0.7,
}));

const PETALS = Array.from({ length: 14 }, (_, i) => ({
  x: ((i * 157) % 1100) + 40,
  delay: (i * 0.9) % 11,
  dur: 9 + (i % 5) * 2,
  drift: 40 + ((i * 37) % 90),
}));

function Torii({ x, y }: { x: number; y: number }) {
  return (
    <g className="wm-torii" transform={`translate(${x}, ${y})`}>
      <rect x={-22} y={-46} width={6} height={46} rx={2} />
      <rect x={16} y={-46} width={6} height={46} rx={2} />
      <rect x={-30} y={-56} width={60} height={7} rx={3} />
      <rect x={-25} y={-44} width={50} height={5} rx={2} />
      <path d="M -32 -56 Q 0 -64 32 -56 L 32 -52 Q 0 -60 -32 -52 Z" />
    </g>
  );
}

function Pagoda({ x, y }: { x: number; y: number }) {
  return (
    <g className="wm-pagoda" transform={`translate(${x}, ${y})`}>
      <rect x={-10} y={-18} width={20} height={18} className="pg-body" />
      <path d="M -20 -18 L 0 -30 L 20 -18 Z" className="pg-roof" />
      <rect x={-8} y={-40} width={16} height={12} className="pg-body" />
      <path d="M -17 -40 L 0 -50 L 17 -40 Z" className="pg-roof" />
      <rect x={-6} y={-58} width={12} height={9} className="pg-body" />
      <path d="M -13 -58 L 0 -67 L 13 -58 Z" className="pg-roof" />
      <line x1={0} y1={-67} x2={0} y2={-74} className="pg-spire" />
    </g>
  );
}

function SakuraTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g className="wm-tree" transform={`translate(${x}, ${y}) scale(${s})`}>
      <path className="tree-trunk" d="M -2 0 C -3 -14 -8 -18 -12 -26 M -2 0 C -1 -16 4 -20 8 -30 M -2 0 L -2 -20" />
      <circle className="tree-bloom" cx={-13} cy={-29} r={9} />
      <circle className="tree-bloom" cx={0} cy={-34} r={11} />
      <circle className="tree-bloom" cx={11} cy={-31} r={8} />
      <circle className="tree-bloom b2" cx={-4} cy={-26} r={8} />
    </g>
  );
}

export function WorldMap({
  progress,
  activeId,
  onSelect,
  xp,
  rank,
  badgeIds,
  freeRoam,
  onFreeRoam,
}: Props) {
  const [hover, setHover] = useState<Module | null>(null);
  const [travelTo, setTravelTo] = useState<string | null>(null);
  /** Shrine the traveler just bounced off — drives the "locked" shake. */
  const [refused, setRefused] = useState<string | null>(null);
  const travelTimer = useRef<number>();

  const points = useMemo(
    () => CURRICULUM.map((m) => [NODE_POS[m.id].x, NODE_POS[m.id].y] as [number, number]),
    []
  );
  const pathD = useMemo(() => smoothPath(points), [points]);

  const doneCount = CURRICULUM.filter((m) => progress[m.id]).length;
  const open = useMemo(() => unlockedIds(progress), [progress]);
  const isOpen = (id: string) => freeRoam || open.has(id);

  /** The stretch of trail already walked, drawn lit over the base path. */
  const lit = litRun(progress);
  const litPathD = lit > 1 ? smoothPath(points.slice(0, lit)) : null;

  const travelerAt = NODE_POS[travelTo ?? activeId] ?? NODE_POS[CURRICULUM[0].id];

  const go = (id: string) => {
    if (travelTo) return; // already travelling
    if (!isOpen(id)) {
      setRefused(id); // locked — nudge the shrine and stay put
      window.setTimeout(() => setRefused(null), 520);
      return;
    }
    if (id === activeId) {
      onSelect(id);
      return;
    }
    setTravelTo(id); // traveler walks there first…
    travelTimer.current = window.setTimeout(() => {
      setTravelTo(null);
      onSelect(id); // …then the lesson opens
    }, 950);
  };

  return (
    <div className="worldmap-wrap">
      <svg
        className="worldmap"
        viewBox="0 0 1200 760"
        role="img"
        aria-label="Learning journey map — each shrine is a lesson"
      >
        {/* ── sky, sun/moon, stars ── */}
        <rect className="wm-sky" x={0} y={0} width={1200} height={760} />
        <circle className="wm-sun" cx={170} cy={120} r={46} />
        <g className="wm-moon-g">
          <circle className="wm-moon" cx={1010} cy={100} r={34} />
          <circle className="wm-moon-shadow" cx={1024} cy={92} r={30} />
        </g>
        <g className="wm-stars">
          {STARS.map((s, i) => (
            <circle key={i} className="wm-star" cx={s.x} cy={s.y} r={s.r} style={{ animationDelay: `${s.d}s` }} />
          ))}
        </g>

        {/* ── drifting clouds ── */}
        {[0, 1, 2].map((i) => (
          <g key={i} className={`wm-cloud wm-cloud-${i}`}>
            <ellipse cx={0} cy={0} rx={52} ry={16} />
            <ellipse cx={34} cy={-8} rx={34} ry={13} />
            <ellipse cx={-36} cy={-5} rx={30} ry={11} />
          </g>
        ))}

        {/* ── Mt. Fuji + far hills ── */}
        <path className="wm-fuji" d="M 640 520 L 880 180 L 1120 520 Z" />
        <path className="wm-fuji-snow" d="M 828 255 L 880 180 L 933 255 Q 906 238 893 258 Q 880 240 866 258 Q 851 240 828 255 Z" />
        <path className="wm-hill-far" d="M 0 560 Q 200 430 420 540 Q 610 620 760 560 Q 950 480 1200 570 L 1200 760 L 0 760 Z" />
        <path className="wm-hill-mid" d="M 0 620 Q 260 500 520 610 Q 780 700 1030 590 Q 1120 555 1200 585 L 1200 760 L 0 760 Z" />
        <path className="wm-hill-front" d="M 0 700 Q 300 630 640 690 Q 940 740 1200 680 L 1200 760 L 0 760 Z" />

        {/* ── sakura trees ── */}
        <SakuraTree x={225} y={585} s={1.15} />
        <SakuraTree x={560} y={520} s={0.9} />
        <SakuraTree x={905} y={330} s={0.8} />
        <SakuraTree x={68} y={610} s={0.85} />

        {/* ── the path (base, then the lit stretch already walked) ── */}
        <path className="wm-path-under" d={pathD} />
        <path className="wm-path-dash" d={pathD} />
        {litPathD && <path className="wm-path-lit" d={litPathD} />}

        {/* ── region banners ── */}
        <g className="wm-region" transform="translate(52, 706)">
          <text className="wm-region-jp">基礎の村</text>
          <text className="wm-region-en" y={16}>Foundations Village</text>
        </g>
        <g className="wm-region" transform="translate(452, 318)">
          <text className="wm-region-jp">六層峠</text>
          <text className="wm-region-en" y={16}>The Six-Layer Pass</text>
        </g>
        <g className="wm-region" transform="translate(942, 66)">
          <text className="wm-region-jp">頂上</text>
          <text className="wm-region-en" y={16}>Summit of Mastery</text>
        </g>

        {/* ── landmarks ── */}
        <Torii x={130} y={700} />
        <Pagoda x={1080} y={100} />

        {/* ── falling petals ── */}
        <g className="wm-petals">
          {PETALS.map((p, i) => (
            <ellipse
              key={i}
              className="wm-petal"
              cx={p.x}
              cy={-12}
              rx={4.5}
              ry={3}
              style={
                {
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.dur}s`,
                  "--drift": `${p.drift}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </g>

        {/* ── lesson shrines ── */}
        {CURRICULUM.map((m) => {
          const p = NODE_POS[m.id];
          const done = !!progress[m.id];
          const active = m.id === activeId;
          const locked = !isOpen(m.id);
          return (
            <g
              key={m.id}
              className={
                "wm-node" +
                (done ? " done" : "") +
                (active ? " active" : "") +
                (locked ? " locked" : "") +
                (refused === m.id ? " refused" : "")
              }
              transform={`translate(${p.x}, ${p.y})`}
              onClick={() => go(m.id)}
              onMouseEnter={() => setHover(m)}
              onMouseLeave={() => setHover(null)}
              tabIndex={0}
              role="button"
              aria-disabled={locked}
              aria-label={
                `${m.title} — ` +
                (locked ? "locked" : done ? "completed" : "not completed")
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  go(m.id);
                }
              }}
            >
              <g className="wm-node-inner">
                <circle className="wm-halo" r={26} />
                <rect className="wm-lamp-post" x={-2.5} y={-4} width={5} height={16} rx={2} />
                <rect className="wm-lamp" x={-13} y={-30} width={26} height={26} rx={6} />
                <path className="wm-lamp-roof" d="M -17 -30 L 0 -40 L 17 -30 Z" />
                {locked ? (
                  <Lock className="wm-node-icon" x={-7} y={-24} width={14} height={14} strokeWidth={2.4} />
                ) : (
                  <LessonIcon id={m.id} className="wm-node-icon" x={-8} y={-25} width={16} height={16} strokeWidth={2.2} />
                )}
                <text className="wm-node-label" y={28} textAnchor="middle">
                  {p.label}
                </text>
              </g>
            </g>
          );
        })}

        {/* ── the traveler ── */}
        <g
          className={"wm-traveler" + (travelTo ? " walking" : "")}
          style={{ transform: `translate(${travelerAt.x}px, ${travelerAt.y - 52}px)` }}
        >
          <g className="wm-traveler-bob">
            <circle className="wm-traveler-bg" r={15} />
            <Footprints className="wm-traveler-icon" x={-9} y={-9} width={18} height={18} strokeWidth={2.2} />
          </g>
        </g>
      </svg>

      {/* HUD */}
      <div className="wm-hud">
        <h2>The Learning Journey</h2>
        <p className="wm-hud-sub">Claude Code academy · from village to summit</p>

        <div className="wm-rank">
          <span className="wm-rank-lv">Lv.{rank.level}</span>
          <span className="wm-rank-title">
            {rank.title} <em>{rank.jp}</em>
          </span>
        </div>
        <div className="wm-xp-track" title={`${xp} XP earned`}>
          <div className="wm-xp-bar" style={{ width: rank.pct + "%" }} />
        </div>
        <div className="wm-xp-meta">
          <span><Star size={13} /> {xp} XP</span>
          <span>
            {rank.nextTitle ? `${rank.toNext} XP → ${rank.nextTitle}` : "highest rank"}
          </span>
        </div>

        <div className="wm-hud-progress">
          <span className="wm-hud-lit">
            <Flame size={14} /> {doneCount} / {CURRICULUM.length}
          </span>{" "}
          shrines lit
        </div>

        <div className="wm-badges" aria-label="Badges">
          {BADGES.map((b) => {
            const has = badgeIds.has(b.id);
            return (
              <span
                key={b.id}
                className={"wm-badge" + (has ? " earned" : "")}
                title={has ? `${b.name} — ${b.hint}` : `Locked — ${b.hint}`}
              >
                <BadgeIcon id={b.id} size={16} />
              </span>
            );
          })}
        </div>

        <label className="wm-freeroam">
          <input
            type="checkbox"
            checked={freeRoam}
            onChange={(e) => onFreeRoam(e.target.checked)}
          />
          Free roam <small>(ignore locks)</small>
        </label>

        <p className="wm-hud-hint">Click a shrine — the traveler will lead the way.</p>
      </div>

      {/* Hover tooltip */}
      {hover && (
        <div
          className="wm-tooltip"
          style={{
            left: `${(NODE_POS[hover.id].x / 1200) * 100}%`,
            top: `${(NODE_POS[hover.id].y / 760) * 100}%`,
          }}
        >
          <div className="wm-tt-title">
            {isOpen(hover.id) ? <LessonIcon id={hover.id} size={15} /> : <Lock size={14} />} {hover.title}
          </div>
          <div className="wm-tt-tag">{hover.tagline}</div>
          {isOpen(hover.id) ? (
            <div className="wm-tt-meta">
              {hover.mins} min · +{xpFor(hover)} XP ·{" "}
              {progress[hover.id] ? "✓ lantern lit" : "not yet visited"}
            </div>
          ) : (
            <div className="wm-tt-meta locked">
              Sealed — finish{" "}
              <b>{CURRICULUM[CURRICULUM.findIndex((m) => m.id === hover.id) - 1]?.title}</b>{" "}
              to open the way.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
