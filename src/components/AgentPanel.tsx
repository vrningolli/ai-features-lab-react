import { useEffect, useRef, useState } from "react";
import { useOpenClaw, type Provider } from "../useOpenClaw";
import { SYSTEM_PROMPT } from "../lib/prompts";
import { CLAUDE_MODELS } from "../lib/claude-models";
import { Markdown } from "./Markdown";
import type { LucideIcon } from "lucide-react";
import { Bot, KeyRound, Play, Settings2, Square, Terminal, Zap } from "lucide-react";

interface Props {
  /** Prompt handed over from a lesson's "run this lab" button. */
  initialPrompt?: string;
  /** Lesson the prompt came from, shown as context. */
  fromLesson?: string;
  /** Clears the handoff once it has been consumed. */
  onConsumePrompt?: () => void;
}

const PROVIDERS: { id: Provider; label: string; Icon: LucideIcon; blurb: string }[] = [
  { id: "free", label: "Free model", Icon: Zap, blurb: "Hosted open model — no setup, limited runs per minute." },
  { id: "claude", label: "Your Claude key", Icon: KeyRound, blurb: "Real Claude with your own Anthropic API key, billed to you." },
  { id: "openclaw", label: "OpenClaw", Icon: Terminal, blurb: "Your self-hosted agent on this computer (127.0.0.1)." },
];

export function AgentPanel({ initialPrompt, fromLesson, onConsumePrompt }: Props) {
  const { config, setConfig, prefs, setPrefs, connection, connect, output, running, runError, run, cancel } =
    useOpenClaw();
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [showSetup, setShowSetup] = useState(true);
  const outRef = useRef<HTMLDivElement>(null);

  // Adopt a lab handed over from a lesson.
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      onConsumePrompt?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  // Keep the newest tokens in view while streaming.
  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [output]);

  const connected = connection.status === "connected";
  const provider = PROVIDERS.find((p) => p.id === prefs.provider) ?? PROVIDERS[0];

  const submit = () => {
    if (!prompt.trim() || running) return;
    void run([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ]);
  };

  return (
    <main className="content agent-panel">
      <div className="lesson-head">
        <span className="eyebrow">
          <Bot size={14} /> AI agent
        </span>
        <h2>Agent Runner</h2>
        <p className="tagline">Run any lab for real — on a free model, on Claude with your own key, or on OpenClaw.</p>
        <div className="pill-row">
          <span className={"pill agent-status " + connection.status}>
            {connection.status === "checking"
              ? "◌ connecting…"
              : connected
              ? `● ${connection.models[0] ?? "connected"}`
              : connection.status === "error"
              ? "● not ready"
              : "○ not checked"}
          </span>
          {prefs.provider === "openclaw" && connected && connection.models.length > 1 && (
            <span className="pill">{connection.models.length} models</span>
          )}
          <button className="pill pill-map" onClick={() => setShowSetup((s) => !s)}>
            <Settings2 size={13} /> {showSetup ? "Hide setup" : "Setup"}
          </button>
        </div>
      </div>

      {showSetup && (
        <div className="section">
          <div className="card agent-setup">
            <div className="view-tabs agent-providers" role="tablist" aria-label="Agent provider">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={prefs.provider === p.id}
                  className={"view-tab" + (prefs.provider === p.id ? " active" : "")}
                  onClick={() => setPrefs({ ...prefs, provider: p.id })}
                >
                  <p.Icon size={15} /> {p.label}
                </button>
              ))}
            </div>
            <small className="muted">{provider.blurb}</small>

            {prefs.provider === "claude" && (
              <>
                <label>
                  Anthropic API key
                  <input
                    type="password"
                    value={prefs.claudeKey}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) => setPrefs({ ...prefs, claudeKey: e.target.value })}
                    placeholder="sk-ant-…"
                  />
                </label>
                <label>
                  Model
                  <select
                    value={prefs.claudeModel}
                    onChange={(e) => setPrefs({ ...prefs, claudeModel: e.target.value })}
                  >
                    {CLAUDE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="agent-check">
                  <input
                    type="checkbox"
                    checked={prefs.rememberKey}
                    onChange={(e) => setPrefs({ ...prefs, rememberKey: e.target.checked })}
                  />
                  Remember the key on this device
                </label>
              </>
            )}

            {prefs.provider === "openclaw" && (
              <>
                <label>
                  Gateway URL
                  <input
                    type="text"
                    value={config.baseUrl}
                    spellCheck={false}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    placeholder="http://127.0.0.1:18789"
                  />
                </label>
                <label>
                  Auth token
                  <input
                    type="password"
                    value={config.token}
                    spellCheck={false}
                    onChange={(e) => setConfig({ ...config, token: e.target.value })}
                    placeholder="gateway.auth.token / $OPENCLAW_GATEWAY_TOKEN"
                  />
                </label>
                <label>
                  Model <small>(blank = gateway default)</small>
                  {connected && connection.models.length > 0 ? (
                    <select
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    >
                      <option value="">— gateway default —</option>
                      {connection.models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={config.model}
                      spellCheck={false}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      placeholder="leave blank to let the gateway choose"
                    />
                  )}
                </label>
              </>
            )}

            <div className="agent-setup-actions">
              <button className="btn secondary" onClick={() => void connect()}>
                Test connection
              </button>
              <small className="muted">
                {prefs.provider === "free"
                  ? "Runs on Cloudflare Workers AI. Prompts go to this site's server only."
                  : prefs.provider === "claude"
                  ? "Your key goes from this browser straight to Anthropic — never to this site."
                  : "The token is stored in this browser only and is sent to your gateway alone."}
              </small>
            </div>

            {connection.status === "error" && (
              <div className="callout warn agent-diag">
                <b>{connection.message}</b>
                {connection.hint && <div>{connection.hint}</div>}
                {prefs.provider === "openclaw" && (
                  <details>
                    <summary>Getting the gateway running</summary>
                    <ol>
                      <li>
                        Install and start it: <code>openclaw gateway start</code> — it listens on{" "}
                        <code>127.0.0.1:18789</code> by default.
                      </li>
                      <li>
                        Check it: <code>openclaw gateway status</code>.
                      </li>
                      <li>
                        Copy <code>gateway.auth.token</code> (or <code>$OPENCLAW_GATEWAY_TOKEN</code>) into the
                        token field above.
                      </li>
                      <li>
                        A browser page is a cross-origin caller, so allow this app's origin (
                        <code>{location.origin}</code>) in the gateway's allowed origins.
                      </li>
                      <li>
                        On a hosted (https) page, Chrome/Edge may ask to allow access to devices on your local
                        network — click Allow.
                      </li>
                    </ol>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="section">
        <h3>
          <span className="num">▶</span>
          Run a task
        </h3>
        {fromLesson && (
          <p className="agent-from">
            Loaded from lesson: <b>{fromLesson}</b>
          </p>
        )}
        <textarea
          className="agent-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          placeholder="Describe what the agent should do — or open a lesson and hit “Run this lab with the AI agent”."
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <div className="agent-actions">
          <button className="btn" onClick={submit} disabled={running || !prompt.trim()}>
            {running ? (
              "Running…"
            ) : (
              <>
                <Play size={15} /> Run with {provider.label}
              </>
            )}
          </button>
          {running && (
            <button className="btn secondary" onClick={cancel}>
              <Square size={13} /> Stop
            </button>
          )}
          <small className="muted">⌘/Ctrl + Enter</small>
        </div>
      </div>

      {(output || running || runError) && (
        <div className="section">
          <h3>
            <span className="num">↩</span>
            Agent output
          </h3>
          {runError && <div className="callout warn">{runError}</div>}
          <div className="agent-output" ref={outRef}>
            {output ? <Markdown text={output} /> : running && <p className="muted">Thinking…</p>}
            {running && <span className="agent-caret">▍</span>}
          </div>
        </div>
      )}

      {prefs.provider === "openclaw" ? (
        <div className="section">
          <div className="callout tip">
            <b>Heads up — </b>OpenClaw is an autonomous agent with shell, file and browser access on your machine.
            Anything you run here runs for real. The lab sends a system prompt asking it to work in a scratch folder
            and to confirm before touching existing files, but that is a request, not a sandbox — review what it
            proposes before you let it act.
          </div>
        </div>
      ) : (
        <div className="section">
          <div className="callout tip">
            <b>Note — </b>the free model and Claude here only <i>write</i> the steps and files for you; nothing runs
            on your computer. Copy what they produce into your project and run it yourself.
          </div>
        </div>
      )}
    </main>
  );
}
