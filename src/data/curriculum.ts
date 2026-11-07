import raw from "./curriculum.json";

/** A single quiz attached to a lesson. */
export interface Quiz {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

/** A build-project card (Real-World Build Projects lesson). */
export interface Project {
  level: string;
  title: string;
  problem: string;
  stack?: string[];
  features: string[];
  acceptance: string[];
}

/** A copy-paste code sample shown in a lesson. */
export interface CodeSample {
  file: string;
  lang: string;
  body: string;
}

/** One lesson/module of the curriculum. HTML strings are trusted content. */
export interface Module {
  id: string;
  icon: string;
  title: string;
  tagline: string;
  level: string;
  mins: number;
  group: string;
  whatItIs: string;
  mentalModel: string;
  whenToUse: string[];
  anatomy?: { location: string; format: string };
  steps: string[];
  code: CodeSample;
  code2?: CodeSample;
  enterprise: string[];
  lab: { goal: string; steps: string[] };
  pitfalls?: string[];
  projects?: Project[];
  quiz: Quiz;
}

/**
 * The full curriculum. Content is authored once in
 * `../../ai-features-lab/curriculum.js` and exported here as JSON, so the
 * vanilla and React editions stay in sync from a single source.
 *
 * To add a lesson: append an object to that file and re-run
 * `npm run sync:content` (see package.json / README).
 */
export const CURRICULUM = raw as Module[];

/** Lessons grouped by their `group` field, preserving order. */
export function groupedModules(): { group: string; items: Module[] }[] {
  const groups: { group: string; items: Module[] }[] = [];
  for (const m of CURRICULUM) {
    let g = groups.find((x) => x.group === m.group);
    if (!g) {
      g = { group: m.group, items: [] };
      groups.push(g);
    }
    g.items.push(m);
  }
  return groups;
}
