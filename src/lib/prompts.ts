import type { Module } from "../data/curriculum";

/** Lesson bodies are authored HTML; the agent wants plain text. */
export function stripHtml(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

/**
 * The lab's standing instruction to the agent. It is deliberately conservative:
 * OpenClaw can touch the real shell and filesystem, so the agent is told to
 * work in a scratch directory and to explain before it acts.
 */
export const SYSTEM_PROMPT = [
  "You are helping someone work through a hands-on Claude Code lesson in the AI Features Lab.",
  "Walk them through the lab exercise concretely: show the exact files to create and commands to run.",
  "Prefer creating files under a scratch folder such as ./ai-lab-scratch/ rather than editing existing work.",
  "Never run destructive commands. If a step would modify or delete existing files, describe it and ask first.",
  "Keep the answer tight and practical — code and steps over prose.",
].join(" ");

/** Builds the run prompt for a lesson's hands-on lab. */
export function labPrompt(m: Module): string {
  const steps = m.lab.steps.map((s, i) => `${i + 1}. ${stripHtml(s)}`).join("\n");
  return [
    `Lesson: ${m.title} — ${stripHtml(m.tagline)}`,
    `Concept: ${stripHtml(m.whatItIs)}`,
    "",
    `Hands-on lab goal: ${stripHtml(m.lab.goal)}`,
    "",
    "Steps:",
    steps,
    "",
    "Walk me through this lab and produce the artifacts it asks for.",
  ].join("\n");
}
