import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CONFIG,
  OpenClawError,
  chatStream,
  listModels,
  type ChatMessage,
  type OpenClawConfig,
} from "./lib/openclaw";

const CONFIG_KEY = "ai-features-lab.openclaw.v1";

export type Connection =
  | { status: "unconfigured" }
  | { status: "checking" }
  | { status: "connected"; models: string[] }
  | { status: "error"; message: string; hint?: string };

function loadConfig(): OpenClawConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<OpenClawConfig>) };
  } catch {
    /* ignore unreadable storage */
  }
  return DEFAULT_CONFIG;
}

/**
 * Owns the gateway connection: saved config, a connection probe, and a
 * streaming run with cancellation. The token is stored in this browser only —
 * it is the user's own local gateway secret and never leaves the machine.
 */
export function useOpenClaw() {
  const [config, setConfig] = useState<OpenClawConfig>(loadConfig);
  const [connection, setConnection] = useState<Connection>({ status: "unconfigured" });

  /** Streamed output of the current/last run. */
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      /* ignore quota / private mode */
    }
  }, [config]);

  const connect = useCallback(async () => {
    setConnection({ status: "checking" });
    try {
      const models = await listModels(config);
      setConnection({ status: "connected", models });
    } catch (err) {
      const e = err as OpenClawError;
      setConnection({ status: "error", message: e.message, hint: e.hint });
    }
  }, [config]);

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

      try {
        await chatStream(config, messages, (delta) => setOutput((o) => o + delta), controller.signal);
      } catch (err) {
        const e = err as OpenClawError;
        setRunError(e.hint ? `${e.message} — ${e.hint}` : e.message);
      } finally {
        if (abort.current === controller) abort.current = null;
        setRunning(false);
      }
    },
    [config]
  );

  // Drop any in-flight run if the panel goes away.
  useEffect(() => () => abort.current?.abort(), []);

  return {
    config,
    setConfig,
    connection,
    connect,
    output,
    running,
    runError,
    run,
    cancel,
  };
}
