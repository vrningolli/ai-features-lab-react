import { Wrench } from "lucide-react";
import { ARTIFACT_ICONS } from "./Icons";
function StudioIcon({ id }: { id: string }) {
  const Icon = ARTIFACT_ICONS[id];
  return Icon ? <Icon size={15} /> : null;
}
import { useMemo, useState } from "react";

/**
 * Template Studio — interactive generators for every Claude Code artifact.
 * Fill a short form, get a ready-to-use file you can copy or download.
 */

type FieldType = "text" | "textarea" | "select";

interface Field {
  key: string;
  label: string;
  placeholder?: string;
  type: FieldType;
  options?: string[];
  rows?: number;
  help?: string;
}

interface Artifact {
  id: string;
  label: string;
  icon: string;
  blurb: string;
  fields: Field[];
  filename: (f: Vals) => string;
  generate: (f: Vals) => string;
}

type Vals = Record<string, string>;

const lines = (s: string) =>
  (s || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

const titleCase = (s: string) =>
  (s || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

const ARTIFACTS: Artifact[] = [
  {
    id: "skill",
    label: "Skill",
    icon: "🧩",
    blurb: ".claude/skills/<name>/SKILL.md — a model-invoked procedure.",
    fields: [
      { key: "name", label: "Name (kebab-case)", type: "text", placeholder: "pr-summary" },
      {
        key: "description",
        label: "Description (what it does AND when to use it)",
        type: "textarea",
        rows: 3,
        placeholder: "Generate a PR description from the git diff. Use when the user asks to summarize changes…",
        help: "This is what Claude matches against — be specific about the trigger.",
      },
      {
        key: "steps",
        label: "Steps (one per line)",
        type: "textarea",
        rows: 5,
        placeholder: "Run git diff to gather changes\nGroup by feature/fix/refactor\nFill the output template",
      },
    ],
    filename: () => "SKILL.md",
    generate: (f) => {
      const name = f.name || "my-skill";
      const steps = lines(f.steps);
      const body = steps.length
        ? steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
        : "1. Describe step one\n2. Describe step two";
      return `---
name: ${name}
description: ${f.description || "What this does, and exactly when Claude should use it."}
---

# ${titleCase(name) || "My Skill"}

## Steps
${body}

## Guardrails
- State what the skill must never do.
`;
    },
  },
  {
    id: "agent",
    label: "Subagent",
    icon: "🤖",
    blurb: ".claude/agents/<name>.md — a focused specialist with its own context.",
    fields: [
      { key: "name", label: "Name", type: "text", placeholder: "security-auditor" },
      {
        key: "description",
        label: "Description (when to delegate)",
        type: "textarea",
        rows: 2,
        placeholder: "Read-only security reviewer. Use PROACTIVELY before merging auth changes.",
      },
      {
        key: "tools",
        label: "Tools (comma-separated, blank = inherit all)",
        type: "text",
        placeholder: "Read, Grep, Glob, Bash",
        help: "Least privilege — a reviewer should not get Write/Edit.",
      },
      { key: "model", label: "Model", type: "select", options: ["inherit", "sonnet", "opus", "haiku"] },
      {
        key: "prompt",
        label: "System prompt (role, scope, output format)",
        type: "textarea",
        rows: 5,
        placeholder: "You are a senior application-security engineer reviewing a code change…",
      },
    ],
    filename: (f) => `${f.name || "agent"}.md`,
    generate: (f) => {
      const fm = [`name: ${f.name || "my-agent"}`, `description: ${f.description || "When to delegate to this agent."}`];
      if (f.tools && f.tools.trim()) fm.push(`tools: ${f.tools.trim()}`);
      if (f.model && f.model !== "inherit") fm.push(`model: ${f.model}`);
      return `---
${fm.join("\n")}
---

${f.prompt || "You are a focused specialist. Describe the role, the scope, and the exact output format here."}
`;
    },
  },
  {
    id: "hook",
    label: "Hook",
    icon: "🪝",
    blurb: "A hooks block for .claude/settings.json — runs automatically.",
    fields: [
      {
        key: "event",
        label: "Event",
        type: "select",
        options: ["PreToolUse", "PostToolUse", "UserPromptSubmit", "Stop", "SubagentStop", "SessionStart"],
      },
      {
        key: "matcher",
        label: "Matcher (tool name / regex — blank for non-tool events)",
        type: "text",
        placeholder: "Bash    or    Edit|Write",
      },
      {
        key: "command",
        label: "Command to run",
        type: "text",
        placeholder: "node .claude/hooks/guard-bash.js",
        help: "In PreToolUse, exit code 2 from this command BLOCKS the tool call.",
      },
    ],
    filename: () => "settings.hooks.json",
    generate: (f) => {
      const hookEntry = { type: "command", command: f.command || "echo 'hook ran'" };
      const matcher = (f.matcher || "").trim();
      const block = matcher
        ? { matcher, hooks: [hookEntry] }
        : { hooks: [hookEntry] };
      const obj = { hooks: { [f.event || "PreToolUse"]: [block] } };
      return JSON.stringify(obj, null, 2) + "\n";
    },
  },
  {
    id: "mcp",
    label: "MCP server",
    icon: "🔌",
    blurb: "An entry for .mcp.json — connect Claude to a system.",
    fields: [
      { key: "serverName", label: "Server name", type: "text", placeholder: "postgres-readonly" },
      { key: "transport", label: "Transport", type: "select", options: ["stdio", "http"] },
      { key: "command", label: "Command (stdio)", type: "text", placeholder: "npx" },
      { key: "args", label: "Args (space-separated, stdio)", type: "text", placeholder: "-y @modelcontextprotocol/server-postgres" },
      { key: "url", label: "URL (http)", type: "text", placeholder: "https://mcp.internal.example.com/kb" },
      {
        key: "envVar",
        label: "Secret env var (optional)",
        type: "text",
        placeholder: "POSTGRES_READONLY_URL",
        help: "Referenced as ${VAR} — never inline secrets in the file.",
      },
    ],
    filename: () => ".mcp.json",
    generate: (f) => {
      const name = f.serverName || "my-server";
      let entry: Record<string, unknown>;
      if (f.transport === "http") {
        entry = { type: "http", url: f.url || "https://example.com/mcp" };
        if (f.envVar && f.envVar.trim()) entry.headers = { Authorization: `Bearer \${${f.envVar.trim()}}` };
      } else {
        entry = {
          command: f.command || "npx",
          args: (f.args || "-y @modelcontextprotocol/server-filesystem ./docs").split(/\s+/).filter(Boolean),
        };
        if (f.envVar && f.envVar.trim()) entry.env = { [f.envVar.trim()]: `\${${f.envVar.trim()}}` };
      }
      return JSON.stringify({ mcpServers: { [name]: entry } }, null, 2) + "\n";
    },
  },
  {
    id: "command",
    label: "Slash command",
    icon: "⌨️",
    blurb: ".claude/commands/<name>.md — a typed shortcut.",
    fields: [
      { key: "name", label: "Name (becomes /name)", type: "text", placeholder: "release-notes" },
      { key: "description", label: "Description", type: "text", placeholder: "Draft release notes from recent commits." },
      { key: "argHint", label: "Argument hint", type: "text", placeholder: "[since-tag]" },
      {
        key: "body",
        label: "Prompt body",
        type: "textarea",
        rows: 5,
        placeholder: "Generate release notes.\nCommits: !`git log -20 --pretty=%s`\nArguments: $ARGUMENTS",
        help: "Use !`cmd` to inline shell output and $ARGUMENTS for input.",
      },
    ],
    filename: (f) => `${f.name || "command"}.md`,
    generate: (f) => {
      const fm: string[] = [];
      if (f.description) fm.push(`description: ${f.description}`);
      if (f.argHint) fm.push(`argument-hint: "${f.argHint}"`);
      const front = fm.length ? `---\n${fm.join("\n")}\n---\n\n` : "";
      return front + (f.body || "Describe the task here.\n\nArguments: $ARGUMENTS\n");
    },
  },
  {
    id: "plugin",
    label: "Plugin",
    icon: "📦",
    blurb: ".claude-plugin/plugin.json — bundle features to distribute.",
    fields: [
      { key: "name", label: "Plugin name", type: "text", placeholder: "enterprise-toolkit" },
      { key: "version", label: "Version", type: "text", placeholder: "1.0.0" },
      { key: "description", label: "Description", type: "textarea", rows: 2, placeholder: "Company-standard skills, agents, hooks, and MCP servers." },
      { key: "author", label: "Author", type: "text", placeholder: "Platform Engineering" },
    ],
    filename: () => "plugin.json",
    generate: (f) =>
      JSON.stringify(
        {
          name: f.name || "my-plugin",
          version: f.version || "1.0.0",
          description: f.description || "What this plugin bundles.",
          author: { name: f.author || "Me" },
          commands: "./commands",
          agents: "./agents",
          skills: "./skills",
          hooks: "./hooks/hooks.json",
          mcpServers: "./.mcp.json",
        },
        null,
        2
      ) + "\n",
  },
];

function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
    document.body.removeChild(ta);
  }
}

export function Studio() {
  const [activeId, setActiveId] = useState(ARTIFACTS[0].id);
  const [all, setAll] = useState<Record<string, Vals>>({});
  const [copied, setCopied] = useState(false);

  const artifact = ARTIFACTS.find((a) => a.id === activeId)!;
  const vals = all[activeId] || {};
  const output = useMemo(() => artifact.generate(vals), [artifact, vals]);
  const filename = artifact.filename(vals);

  const set = (key: string, v: string) =>
    setAll((prev) => ({ ...prev, [activeId]: { ...(prev[activeId] || {}), [key]: v } }));

  return (
    <main className="content studio">
      <div className="lesson-head">
        <span className="eyebrow"><Wrench size={14} /> Template Studio</span>
        <h2>Template Studio</h2>
        <p className="tagline">
          Fill the form, get a ready-to-use file. Copy it or download it straight into your{" "}
          <code>.claude/</code>.
        </p>
      </div>

      <div className="studio-tabs">
        {ARTIFACTS.map((a) => (
          <button
            key={a.id}
            className={"studio-tab" + (a.id === activeId ? " active" : "")}
            onClick={() => setActiveId(a.id)}
          >
            <StudioIcon id={a.id} /> {a.label}
          </button>
        ))}
      </div>

      <p className="studio-blurb">{artifact.blurb}</p>

      <div className="studio-grid">
        <div className="studio-form">
          {artifact.fields.map((field) => (
            <label className="studio-field" key={field.key}>
              <span className="field-label">{field.label}</span>
              {field.type === "textarea" ? (
                <textarea
                  rows={field.rows || 3}
                  placeholder={field.placeholder}
                  value={vals[field.key] || ""}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              ) : field.type === "select" ? (
                <select value={vals[field.key] || field.options?.[0]} onChange={(e) => set(field.key, e.target.value)}>
                  {field.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={vals[field.key] || ""}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              )}
              {field.help && <small className="field-help">{field.help}</small>}
            </label>
          ))}
        </div>

        <div className="studio-output">
          <div className="code-wrap">
            <div className="code-head">
              <span>{filename}</span>
              <div className="studio-actions">
                <button
                  className={"copy-btn" + (copied ? " copied" : "")}
                  onClick={async () => {
                    await copyText(output);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button className="copy-btn" onClick={() => download(filename, output)}>
                  Download
                </button>
              </div>
            </div>
            <pre>
              <code>{output}</code>
            </pre>
          </div>
          <p className="studio-hint">
            ⓘ This is a starting point — review and adapt before committing. Generated files are
            templates, not finished policy.
          </p>
        </div>
      </div>
    </main>
  );
}
