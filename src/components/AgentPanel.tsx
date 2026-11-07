import { useEffect, useRef, useState } from "react";
import { useOpenClaw } from "../useOpenClaw";
import { SYSTEM_PROMPT } from "../lib/prompts";

interface Props {
  /** Prompt handed over from a lesson's "run this lab" button. */
  initialPrompt?: string;
  /** Lesson the prompt came from, shown as context. */
  fromLesson?: string;
  /** Clears the handoff once it has been consumed. */
  onConsumePrompt?: () => void;
}

export function AgentPanel({ initialPrompt, fromLesson, onConsumePrompt }: Props) {
  const { config, setConfig, connection, connect, output, running, runError, run, cancel } =
    useOpenClaw();
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [showSetup, setShowSetup] = useState(connection.status !== "connected");
  const outRef = useRef<HTMLPreElement>(null);

  // Probe the gateway once when the panel opens.
  useEffect(() => {
    if (connection.status === "unconfigured") void connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <span className="eyebrow">🤖 · OpenClaw</span>
        <h2>Agent Runner</h2>
        <p className="tagline">
          Run the labs for real against your own self-hosted OpenClaw gateway.
        </p>
        <div className="pill-row">
          <span className={"pill agent-status " + connection.status}>
            {connection.status === "checking"
              ? "◌ connecting…"
              : connected
              ? "● connected"
              : connection.status === "error"
              ? "● offline"
              : "○ not checked"}
          </span>
          {connected && connection.models.length > 0 && (
            <span className="pill">{connection.models.length} models</span>
          )}
          <button className="pill pill-map" onClick={() => setShowSetup((s) => !s)}>
            ⚙️ {showSetup ? "Hide setup" : "Setup"}
          </button>
        </div>
      </div>

      {showSetup && (
        <div className="section">
          <div className="card agent-setup">
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

            <div className="agent-setup-actions">
              <button className="btn secondary" onClick={() => void connect()}>
                Test connection
              </button>
              <small className="muted">
                The token is stored in this browser only and is sent to your gateway alone.
              </small>
            </div>

            {connection.status === "error" && (
              <div className="callout warn agent-diag">
                <b>{connection.message}</b>
                {connection.hint && <div>{connection.hint}</div>}
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
                      Copy <code>gateway.auth.token</code> (or <code>$OPENCLAW_GATEWAY_TOKEN</code>)
                      into the token field above.
                    </li>
                    <li>
                      A browser page is a cross-origin caller, so allow this app's origin (
                      <code>{location.origin}</code>) in the gateway's allowed origins.
                    </li>
                  </ol>
                </details>
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
        {fromLesson && <p className="agent-from">Loaded from lesson: <b>{fromLesson}</b></p>}
        <textarea
          className="agent-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          placeholder="Describe what the agent should do — or open a lesson and hit “Run this lab with OpenClaw”."
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <div className="agent-actions">
          <button className="btn" onClick={submit} disabled={running || !prompt.trim()}>
            {running ? "Running…" : "▶ Run with OpenClaw"}
          </button>
          {running && (
            <button className="btn secondary" onClick={cancel}>
              Stop
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
          <pre className="agent-output" ref={outRef}>
            {output}
            {running && <span className="agent-caret">▍</span>}
          </pre>
        </div>
      )}

      <div className="section">
        <div className="callout tip">
          <b>Heads up — </b>OpenClaw is an autonomous agent with shell, file and browser access on
          your machine. Anything you run here runs for real. The lab sends a system prompt asking it
          to work in a scratch folder and to confirm before touching existing files, but that is a
          request, not a sandbox — review what it proposes before you let it act.
        </div>
      </div>
    </main>
  );
}
