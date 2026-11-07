import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CONFIG,
  OpenClawError,
  chatStream,
  listModels,
  type ChatMessage,
  type OpenClawConfig,
} from "./lib/openclaw";
import { hostedChatStream, hostedStatus } from "./lib/hosted";
import { DEFAULT_CLAUDE_MODEL } from "./lib/claude-models";

/** The Anthropic SDK is ~400 KB, so it loads only when someone picks the Claude provider. */
const loadClaude = () => import("./lib/claude");

/** Where a run goes: the site's free model, Claude with the visitor's key, or a local OpenClaw. */
export type Provider = "free" | "claude" | "openclaw";

const CONFIG_KEY = "ai-features-lab.openclaw.v1";
const PREFS_KEY = "ai-features-lab.agent.v1";

export interface AgentPrefs {
  provider: Provider;
  claudeModel: string;
  /** Only persisted when the visitor ticks "remember on this device". */
  claudeKey: string;
  rememberKey: boolean;
}

const DEFAULT_PREFS: AgentPrefs = {
  provider: "free",
  claudeModel: DEFAULT_CLAUDE_MODEL,
  claudeKey: "",
  rememberKey: false,
};

export type Connection =
  | { status: "unconfigured" }
  | { status: "checking" }
  | { status: "connected"; models: string[] }
  | { status: "error"; message: string; hint?: string };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    /* ignore unreadable storage */
  }
  return fallback;
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Owns the agent connection: which provider, its settings, a connection
 * probe, and a streaming run with cancellation. Secrets (OpenClaw token,
 * Claude key) stay in this browser and are sent only to their own service.
 */
export function useOpenClaw() {
  const [config, setConfig] = useState<OpenClawConfig>(() => load(CONFIG_KEY, DEFAULT_CONFIG));
  const [prefs, setPrefs] = useState<AgentPrefs>(() => load(PREFS_KEY, DEFAULT_PREFS));
  const [connection, setConnection] = useState<Connection>({ status: "unconfigured" });

  /** Streamed output of the current/last run. */
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => save(CONFIG_KEY, config), [config]);
  useEffect(
    () => save(PREFS_KEY, { ...prefs, claudeKey: prefs.rememberKey ? prefs.claudeKey : "" }),
    [prefs]
  );

  const connect = useCallback(async () => {
    setConnection({ status: "checking" });
    try {
      let models: string[];
      if (prefs.provider === "free") {
        models = [await hostedStatus()];
      } else if (prefs.provider === "claude") {
        if (!prefs.claudeKey.trim()) {
          throw new OpenClawError("Add your Claude API key.", "Create one at console.anthropic.com → API keys.");
        }
        const { claudeCheck } = await loadClaude();
        models = [await claudeCheck(prefs.claudeKey, prefs.claudeModel)];
      } else {
        models = await listModels(config);
      }
      setConnection({ status: "connected", models });
    } catch (err) {
      const e = err as OpenClawError;
      setConnection({ status: "error", message: e.message, hint: e.hint });
    }
  }, [config, prefs]);

  // Re-probe whenever the provider changes (the old status no longer applies).
  useEffect(() => {
    void connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.provider]);

  const cancel = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setRunning(false);
  }, []);

  const run = useCallback(
    async (messages: ChatMessage[]) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      setRunning(true);
      setRunError(null);
      setOutput("");
      const onDelta = (delta: string) => setOutput((o) => o + delta);

      try {
        if (prefs.provider === "free") {
          await hostedChatStream(messages, onDelta, controller.signal);
        } else if (prefs.provider === "claude") {
          if (!prefs.claudeKey.trim()) throw new OpenClawError("Add your Claude API key in Setup first.");
          const { claudeChatStream } = await loadClaude();
          await claudeChatStream(prefs.claudeKey, prefs.claudeModel, messages, onDelta, controller.signal);
        } else {
          await chatStream(config, messages, onDelta, controller.signal);
        }
      } catch (err) {
        const e = err as OpenClawError;
        setRunError(e.hint ? `${e.message} — ${e.hint}` : e.message);
      } finally {
        if (abort.current === controller) abort.current = null;
        setRunning(false);
      }
    },
    [config, prefs]
  );

  // Drop any in-flight run if the panel goes away.
  useEffect(() => () => abort.current?.abort(), []);

  return {
    config,
    setConfig,
    prefs,
    setPrefs,
    connection,
    connect,
    output,
    running,
    runError,
    run,
    cancel,
  };
}
