import { CURRICULUM, type Module } from "./curriculum";

/* ============================================================
   Gamification rules — XP, ranks, badges, and shrine unlocking.
   Pure functions over the saved progress state, so the UI can
   derive everything and nothing extra needs persisting.
   ============================================================ */

/** What the progress store keeps: when each lesson was completed, and which quizzes were aced. */
export interface GameState {
  /** lesson id -> epoch ms of completion (0 for pre-v2 saves with no timestamp). */
  done: Record<string, number>;
  /** lesson id -> quiz answered correctly on the first try. */
  aced: Record<string, boolean>;
}

/**
 * Presence, not truthiness: a migrated v1 save stores timestamp 0 ("date
 * unknown"), which is still a completed lesson.
 */
function isDone(done: Record<string, unknown>, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(done, id);
}

/** Difficulty tier inferred from the lesson's free-text level ("Intermediate → Advanced"). */
function tier(level: string): 0 | 1 | 2 {
  const l = level.toLowerCase();
  if (l.includes("advanced") || l.includes("capstone")) return 2;
  if (l.includes("intermediate") || l.includes("apply")) return 1;
  return 0;
}

/** XP a lesson is worth: 5 per minute of work, plus a difficulty bonus. */
export function xpFor(m: Module): number {
  return m.mins * 5 + tier(m.level) * 25;
}

/** Every lesson completed = this much XP. Used to scale the rank thresholds. */
export const TOTAL_XP = CURRICULUM.reduce((sum, m) => sum + xpFor(m), 0);

/** Ranks are fractions of TOTAL_XP so adding lessons rescales them automatically. */
const RANKS: { title: string; jp: string; at: number }[] = [
  { title: "Wanderer", jp: "旅人", at: 0 },
  { title: "Lantern Lighter", jp: "灯し手", at: 0.1 },
  { title: "Path-Walker", jp: "道行き", at: 0.25 },
  { title: "Shrine Keeper", jp: "社守", at: 0.45 },
  { title: "Mountain Adept", jp: "山の達人", at: 0.7 },
  { title: "Summit Sage", jp: "頂の賢者", at: 1 },
];

export interface RankInfo {
  /** 1-based rank number, shown as "Lv.N". */
  level: number;
  title: string;
  jp: string;
  /** XP into the current rank, and how much the rank spans. `span` is 0 at max rank. */
  into: number;
  span: number;
  /** 0–100 progress toward the next rank (100 at max rank). */
  pct: number;
  /** Title of the next rank, or null when maxed. */
  nextTitle: string | null;
  /** XP still needed for the next rank, or 0 when maxed. */
  toNext: number;
}

export function rankFor(xp: number): RankInfo {
  const thresholds = RANKS.map((r) => Math.round(r.at * TOTAL_XP));
  let i = 0;
  while (i + 1 < RANKS.length && xp >= thresholds[i + 1]) i++;

  const floor = thresholds[i];
  const isMax = i === RANKS.length - 1;
  const span = isMax ? 0 : thresholds[i + 1] - floor;
  const into = xp - floor;

  return {
    level: i + 1,
    title: RANKS[i].title,
    jp: RANKS[i].jp,
    into,
    span,
    pct: isMax ? 100 : Math.min(100, Math.round((into / span) * 100)),
    nextTitle: isMax ? null : RANKS[i + 1].title,
    toNext: isMax ? 0 : thresholds[i + 1] - xp,
  };
}

export function xpEarned(state: GameState): number {
  return CURRICULUM.filter((m) => isDone(state.done, m.id)).reduce((sum, m) => sum + xpFor(m), 0);
}

/* ── badges ───────────────────────────────────────────────── */

export interface Badge {
  id: string;
  icon: string;
  name: string;
  /** Shown on the badge; describes how it is earned. */
  hint: string;
  earned: (s: GameState) => boolean;
}

/** True once every lesson in `group` is complete. */
function groupDone(s: GameState, group: string): boolean {
  const items = CURRICULUM.filter((m) => m.group === group);
  return items.length > 0 && items.every((m) => isDone(s.done, m.id));
}

const countDone = (s: GameState) => CURRICULUM.filter((m) => isDone(s.done, m.id)).length;

/** Most lessons completed on any single local calendar day. */
function bestDay(s: GameState): number {
  const perDay = new Map<string, number>();
  for (const ts of Object.values(s.done)) {
    if (!ts) continue; // migrated saves have no timestamp
    const key = new Date(ts).toDateString();
    perDay.set(key, (perDay.get(key) || 0) + 1);
  }
  return Math.max(0, ...perDay.values());
}

export const BADGES: Badge[] = [
  {
    id: "first-light",
    icon: "🌸",
    name: "First Light",
    hint: "Light your first lantern",
    earned: (s) => countDone(s) >= 1,
  },
  {
    id: "village",
    icon: "⛩️",
    name: "Village Cleared",
    hint: "Finish every Foundations lesson",
    earned: (s) => groupDone(s, "Foundations"),
  },
  {
    id: "six-layers",
    icon: "🗾",
    name: "Six Layers",
    hint: "Cross the whole Six-Layer Pass",
    earned: (s) => groupDone(s, "The Six Layers"),
  },
  {
    id: "applied",
    icon: "🏯",
    name: "Field Work",
    hint: "Finish every Apply It lesson",
    earned: (s) => groupDone(s, "Apply It"),
  },
  {
    id: "perfect-recall",
    icon: "🎯",
    name: "Perfect Recall",
    hint: "Ace 5 quizzes on the first try",
    earned: (s) => Object.values(s.aced).filter(Boolean).length >= 5,
  },
  {
    id: "swift",
    icon: "⚡",
    name: "Swift Traveler",
    hint: "Complete 3 lessons in one day",
    earned: (s) => bestDay(s) >= 3,
  },
  {
    id: "night-pilgrim",
    icon: "🌙",
    name: "Night Pilgrim",
    hint: "Complete a lesson after 19:00",
    earned: (s) =>
      Object.values(s.done).some((ts) => {
        if (!ts) return false;
        const h = new Date(ts).getHours();
        return h >= 19 || h < 6;
      }),
  },
  {
    id: "summit",
    icon: "🏔️",
    name: "Summit Sage",
    hint: "Light every shrine on the mountain",
    earned: (s) => countDone(s) === CURRICULUM.length,
  },
];

export function earnedBadgeIds(state: GameState): string[] {
  return BADGES.filter((b) => b.earned(state)).map((b) => b.id);
}

/* ── shrine unlocking ─────────────────────────────────────── */

/**
 * Which shrines the traveler may enter. The first is always open; each later
 * one opens when the shrine before it is lit. Anything already completed stays
 * open, so a locked path can never hide work the visitor has already done.
 */
export function unlockedIds(done: Record<string, unknown>): Set<string> {
  const open = new Set<string>();
  CURRICULUM.forEach((m, i) => {
    const prev = i > 0 ? CURRICULUM[i - 1] : null;
    if (i === 0 || isDone(done, m.id) || (prev && isDone(done, prev.id))) open.add(m.id);
  });
  return open;
}

/** How many lessons are complete in an unbroken run from the start — the lit trail. */
export function litRun(done: Record<string, unknown>): number {
  let n = 0;
  while (n < CURRICULUM.length && isDone(done, CURRICULUM[n].id)) n++;
  return n;
}
