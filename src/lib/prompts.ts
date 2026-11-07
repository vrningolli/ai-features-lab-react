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
  "You are the AI tutor inside Prep Hub's AI Lab, a learning site for coding interviews and Claude Code.",
  "First decide what the user is asking for.",
  "If it is a general question (for example a concept, a definition, or interview advice), answer that question directly and clearly — do not turn it into a lab exercise or invent a project.",
  "If it is a hands-on lab from a lesson (the message starts with 'Lesson:' and has lab steps), walk them through it concretely: the exact files to create and commands to run, using a scratch folder such as ./ai-lab-scratch/ rather than editing existing work.",
  "Never suggest destructive commands; if a step would modify or delete existing files, say so and ask first.",
  "Format the answer in Markdown: short headings, bullet lists, and fenced code blocks with a language tag. Keep it concise and practical.",
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
