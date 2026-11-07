import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BADGES,
  earnedBadgeIds,
  rankFor,
  xpEarned,
  type Badge,
  type GameState,
} from "./data/gamification";

const STORE_KEY = "ai-features-lab.progress.v2";
const LEGACY_KEY = "ai-features-lab.progress.v1";
const FREE_ROAM_KEY = "ai-features-lab.freeRoam";

const EMPTY: GameState = { done: {}, aced: {} };

/**
 * Reads the saved journey. v1 stored a plain `{id: boolean}` map; those saves
 * are migrated with a 0 timestamp, which simply means "date unknown" to the
 * badges that look at completion times.
 */
function load(): GameState {
  try {
    const v2 = localStorage.getItem(STORE_KEY);
    if (v2) {
      const parsed = JSON.parse(v2) as Partial<GameState>;
      return { done: parsed.done || {}, aced: parsed.aced || {} };
    }
    const v1 = localStorage.getItem(LEGACY_KEY);
    if (v1) {
      const old = JSON.parse(v1) as Record<string, boolean>;
      const done: Record<string, number> = {};
      for (const [id, isDone] of Object.entries(old)) if (isDone) done[id] = 0;
      return { done, aced: {} };
    }
  } catch {
    /* corrupt or unavailable storage — start fresh */
  }
  return EMPTY;
}

/**
 * Tracks the journey in localStorage and derives XP, rank and badges from it.
 * `progress` stays a plain boolean map so every existing consumer keeps working.
 */
export function useProgress() {
  const [state, setState] = useState<GameState>(load);
  const [freeRoam, setFreeRoam] = useState<boolean>(
    () => localStorage.getItem(FREE_ROAM_KEY) === "1"
  );

  /** Badges earned since the last render — drives the celebration toast. */
  const [pending, setPending] = useState<Badge[]>([]);
  const seenBadges = useRef<Set<string>>(new Set(earnedBadgeIds(state)));

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / private mode */
    }

    const fresh = BADGES.filter((b) => b.earned(state) && !seenBadges.current.has(b.id));
    if (fresh.length) {
      fresh.forEach((b) => seenBadges.current.add(b.id));
      setPending((q) => [...q, ...fresh]);
    }
    // A badge can be lost again by un-completing a lesson; allow re-earning it.
    for (const b of BADGES) if (!b.earned(state)) seenBadges.current.delete(b.id);
  }, [state]);

  useEffect(() => {
    localStorage.setItem(FREE_ROAM_KEY, freeRoam ? "1" : "0");
  }, [freeRoam]);

  const progress = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const id of Object.keys(state.done)) map[id] = true;
    return map;
  }, [state.done]);

  const toggle = useCallback((id: string) => {
    setState((s) => {
      const done = { ...s.done };
      if (done[id]) delete done[id];
      else done[id] = Date.now();
      return { ...s, done };
    });
  }, []);

  /** Records that a lesson's quiz was answered correctly on the first attempt. */
  const markAced = useCallback((id: string) => {
    setState((s) => (s.aced[id] ? s : { ...s, aced: { ...s.aced, [id]: true } }));
  }, []);

  const reset = useCallback(() => {
    seenBadges.current = new Set();
    setPending([]);
    setState(EMPTY);
  }, []);

  const dismissBadge = useCallback((id: string) => {
    setPending((q) => q.filter((b) => b.id !== id));
  }, []);

  const xp = useMemo(() => xpEarned(state), [state]);
  const rank = useMemo(() => rankFor(xp), [xp]);
  const badgeIds = useMemo(() => new Set(earnedBadgeIds(state)), [state]);

  return {
    progress,
    state,
    xp,
    rank,
    badgeIds,
    pendingBadges: pending,
    dismissBadge,
    freeRoam,
    setFreeRoam,
    toggle,
    markAced,
    reset,
  };
}
