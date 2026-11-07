import { BadgeIcon } from "./Icons";
import { useEffect } from "react";
import type { Badge } from "../data/gamification";

/** One celebration card; disappears on its own after a few seconds. */
function Toast({ badge, onDismiss }: { badge: Badge; onDismiss: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="badge-toast" role="status">
      <span className="bt-icon">
        <BadgeIcon id={badge.id} size={22} />
      </span>
      <div className="bt-text">
        <div className="bt-kicker">Badge unlocked</div>
        <div className="bt-name">{badge.name}</div>
        <div className="bt-hint">{badge.hint}</div>
      </div>
      <button className="bt-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export function BadgeToasts({
  badges,
  onDismiss,
}: {
  badges: Badge[];
  onDismiss: (id: string) => void;
}) {
  if (!badges.length) return null;
  return (
    <div className="badge-toasts" aria-live="polite">
      {badges.map((b) => (
        <Toast key={b.id} badge={b} onDismiss={() => onDismiss(b.id)} />
      ))}
    </div>
  );
}
