/* ============================================================
   "Bring your own key" Claude runs.

   The visitor pastes their own Anthropic API key; requests go straight from
   their browser to the Claude API using the official SDK. No server of ours
   ever sees the key. `dangerouslyAllowBrowser` is the SDK's explicit opt-in
   for exactly this case — it would be wrong for a key the site owns, but here
   the key belongs to the person sitting at the browser.
   ============================================================ */
import Anthropic from "@anthropic-ai/sdk";
import { OpenClawError, type ChatMessage } from "./openclaw";

/** Models that support the server-side refusal fallback (`fallbacks: "default"`). */
const SUPPORTS_FALLBACK = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

function client(apiKey: string): Anthropic {
  return new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true });
}

function explain(err: unknown): OpenClawError {
  if (err instanceof OpenClawError) return err;
  if (err instanceof Anthropic.APIUserAbortError) return new OpenClawError("Run cancelled.");
  if (err instanceof Anthropic.AuthenticationError) {
    return new OpenClawError("Claude rejected the API key (401).", "Check the key at console.anthropic.com → API keys.");
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new OpenClawError("This API key can't use that model (403).", "Try another model, or check the key's workspace.");
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new OpenClawError("Model not found (404).", "Pick another model in Setup.");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new OpenClawError("Claude rate limit hit (429).", "Wait a moment and run again.");
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new OpenClawError("Couldn't reach the Claude API.", "Check your internet connection.");
  }
  if (err instanceof Anthropic.APIError) {
    return new OpenClawError(`Claude API error ${err.status ?? ""}`.trim() + ".", err.message);
  }
  return new OpenClawError(err instanceof Error ? err.message : String(err));
}

/** Confirms the key works and can see the chosen model (free — no tokens used). */
export async function claudeCheck(apiKey: string, model: string): Promise<string> {
  try {
    const info = await client(apiKey).models.retrieve(model);
    return info.display_name || model;
  } catch (err) {
    throw explain(err);
  }
}

/** Streams a run on Claude with the visitor's key. */
export async function claudeChatStream(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const turns: Anthropic.Beta.BetaMessageParam[] = messages
    .filter((m): m is ChatMessage & { role: "user" | "assistant" } => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const fallback = SUPPORTS_FALLBACK.has(model);
  let full = "";
  try {
    const stream = client(apiKey).beta.messages.stream(
      {
        model,
        max_tokens: 16000,
        output_config: { effort: "medium" },
        ...(system ? { system } : {}),
        messages: turns,
        // If a safety classifier declines, re-run on Anthropic's recommended fallback model.
        ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      },
      { signal }
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        full += event.delta.text;
        onDelta(event.delta.text);
      }
    }

    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      throw new OpenClawError("Claude declined this request.", "Try rephrasing the task.");
    }
    if (final.stop_reason === "max_tokens") {
      onDelta("\n\n[Output reached the length limit.]");
    }
  } catch (err) {
    throw explain(err);
  }
  return full;
}
