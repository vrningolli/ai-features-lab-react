/* ============================================================
   OpenClaw gateway client.

   OpenClaw (github.com/openclaw/openclaw) is a self-hosted agent that
   exposes a local gateway on 127.0.0.1:18789. The gateway multiplexes a
   WebSocket RPC channel and an OpenAI-compatible HTTP API; this client
   uses the HTTP side, which is all the lab needs:

     GET  /v1/models             -> list what the gateway can route to
     POST /v1/chat/completions   -> run a prompt (streamed via SSE)

   Auth is a shared secret (gateway.auth.token / OPENCLAW_GATEWAY_TOKEN)
   sent as a bearer token. Everything is configurable at runtime because
   a user's gateway may sit on another port or behind a proxy.
   ============================================================ */

export interface OpenClawConfig {
  /** Gateway origin, e.g. http://127.0.0.1:18789 */
  baseUrl: string;
  /** gateway.auth.token — blank if the gateway runs without auth. */
  token: string;
  /** Model id to request; blank lets the gateway pick its default. */
  model: string;
}

export const DEFAULT_CONFIG: OpenClawConfig = {
  baseUrl: "http://127.0.0.1:18789",
  token: "",
  model: "",
};

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** A failure we can explain to the user, rather than a raw TypeError. */
export class OpenClawError extends Error {
  constructor(message: string, readonly hint?: string) {
    super(message);
    this.name = "OpenClawError";
  }
}

function headers(cfg: OpenClawConfig): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.token.trim()) h.Authorization = `Bearer ${cfg.token.trim()}`;
  return h;
}

function url(cfg: OpenClawConfig, path: string): string {
  return cfg.baseUrl.replace(/\/+$/, "") + path;
}

/**
 * Turns the handful of ways this can fail into advice. The browser cannot
 * distinguish "connection refused" from "blocked by CORS" — both surface as
 * a TypeError — so that case names both causes.
 */
function explain(err: unknown, cfg: OpenClawConfig): OpenClawError {
  if (err instanceof OpenClawError) return err;
  if (err instanceof DOMException && err.name === "AbortError") {
    return new OpenClawError("Run cancelled.");
  }
  return new OpenClawError(
    `Could not reach the gateway at ${cfg.baseUrl}.`,
    "Either OpenClaw isn't running, or it is refusing this page's origin. " +
      "Check `openclaw gateway status`, and make sure this app's origin is " +
      "allowed by the gateway (gateway.controlUi.allowedOrigins)."
  );
}

async function failFor(res: Response): Promise<OpenClawError> {
  const body = await res.text().catch(() => "");
  const detail = body.slice(0, 300);
  if (res.status === 401 || res.status === 403) {
    return new OpenClawError(
      `Gateway rejected the token (${res.status}).`,
      "Copy the value of gateway.auth.token (or $OPENCLAW_GATEWAY_TOKEN) into the token field."
    );
  }
  if (res.status === 404) {
    return new OpenClawError(
      `No OpenAI-compatible endpoint at this URL (404).`,
      "Check the base URL — it should be the gateway origin only, e.g. http://127.0.0.1:18789."
    );
  }
  return new OpenClawError(
    `Gateway returned ${res.status} ${res.statusText}.`,
    detail || undefined
  );
}

/** Lists model ids the gateway will route to. Doubles as a connection test. */
export async function listModels(cfg: OpenClawConfig, signal?: AbortSignal): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(url(cfg, "/v1/models"), { headers: headers(cfg), signal });
  } catch (err) {
    throw explain(err, cfg);
  }
  if (!res.ok) throw await failFor(res);

  const json = (await res.json()) as { data?: { id?: string }[] };
  return (json.data || []).map((m) => m.id).filter((id): id is string => !!id);
}

/**
 * Streams a chat completion, calling `onDelta` with each text chunk.
 * Resolves with the full text once the stream ends.
 */
export async function chatStream(
  cfg: OpenClawConfig,
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url(cfg, "/v1/chat/completions"), {
      method: "POST",
      headers: headers(cfg),
      signal,
      body: JSON.stringify({
        ...(cfg.model.trim() ? { model: cfg.model.trim() } : {}),
        messages,
        stream: true,
      }),
    });
  } catch (err) {
    throw explain(err, cfg);
  }
  if (!res.ok) throw await failFor(res);
  if (!res.body) throw new OpenClawError("Gateway returned an empty response body.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  // Server-sent events: "data: {json}\n\n", terminated by "data: [DONE]".
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as {
            choices?: { delta?: { content?: string }; message?: { content?: string } }[];
          };
          const text =
            chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";
          if (text) {
            full += text;
            onDelta(text);
          }
        } catch {
          /* a partial or non-JSON keep-alive frame — skip it */
        }
      }
    }
  }

  return full;
}
