import type { LucideIcon, LucideProps } from "lucide-react";
import {
  BookOpen,
  Compass,
  ScrollText,
  Puzzle,
  Bot,
  Webhook,
  Plug,
  SquareTerminal,
  Package,
  Landmark,
  Hammer,
  Mountain,
  Flower2,
  Flag,
  Layers,
  Castle,
  Target,
  Zap,
  Moon,
  MountainSnow,
  Award,
} from "lucide-react";

/** One line icon per lesson (replaces the curriculum's emoji). */
export const LESSON_ICONS: Record<string, LucideIcon> = {
  overview: Compass,
  instructions: ScrollText,
  skills: Puzzle,
  subagents: Bot,
  hooks: Webhook,
  mcp: Plug,
  commands: SquareTerminal,
  plugins: Package,
  "case-study": Landmark,
  "build-projects": Hammer,
  capstone: Mountain,
};

export function LessonIcon({ id, ...props }: { id: string } & LucideProps) {
  const Icon = LESSON_ICONS[id] ?? BookOpen;
  return <Icon {...props} />;
}

/** Badge icons for the journey's achievements. */
export const BADGE_ICONS: Record<string, LucideIcon> = {
  "first-light": Flower2,
  village: Flag,
  "six-layers": Layers,
  applied: Castle,
  "perfect-recall": Target,
  swift: Zap,
  "night-pilgrim": Moon,
  summit: MountainSnow,
};

export function BadgeIcon({ id, ...props }: { id: string } & LucideProps) {
  const Icon = BADGE_ICONS[id] ?? Award;
  return <Icon {...props} />;
}

/** Template Studio artifact icons. */
export const ARTIFACT_ICONS: Record<string, LucideIcon> = {
  skill: Puzzle,
  agent: Bot,
  hook: Webhook,
  mcp: Plug,
  command: SquareTerminal,
  plugin: Package,
};
