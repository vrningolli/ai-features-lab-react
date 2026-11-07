/* ============================================================
   Free hosted model.

   When the lab is deployed inside DS Coach on Cloudflare, the site's Worker
   exposes a tiny API backed by Cloudflare Workers AI (free daily allowance,
   rate-limited per visitor):

     GET  /api/agent/status  -> { model }
     POST /api/agent/chat    -> SSE stream of { "response": "..." } chunks

   The paths are absolute because the lab is served from /ai-lab/ while the
   API lives at the site root. In local dev (vite on localhost) there is no
   Worker, so these calls 404 and the panel says so.
   ============================================================ */
import { OpenClawError, readSseText, type ChatMessage } from "./openclaw";

const STATUS_URL = "/api/agent/status";
const CHAT_URL = "/api/agent/chat";

const NOT_DEPLOYED = new OpenClawError(
  "The free model isn't available here.",
  "It only runs on the deployed site (Cloudflare). Locally, pick “Your Claude API key” or OpenClaw instead."
);

async function failFor(res: Response): Promise<OpenClawError> {
  if (res.status === 404) return NOT_DEPLOYED;
  let message = "";
  try {
    message = ((await res.json()) as { error?: string }).error || "";
  } catch {
    /* not JSON */
  }
  if (res.status === 429) {
    return new OpenClawError(
      message || "Free model limit reached.",
      "Wait a minute and try again — or switch to your own Claude API key for unlimited runs."
    );
  }
  return new OpenClawError(message || `Free model returned ${res.status}.`);
}

/** Returns the hosted model's name. Doubles as an availability check. */
export async function hostedStatus(signal?: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch(STATUS_URL, { signal });
  } catch {
    throw NOT_DEPLOYED;
  }
  if (!res.ok) throw await failFor(res);
  // Vite's dev/preview server answers unknown paths with index.html (200, text/html).
  if (!(res.headers.get("content-type") || "").includes("json")) throw NOT_DEPLOYED;
  const json = (await res.json()) as { model?: string };
  return json.model || "free model";
}

/** Streams a run on the free hosted model. */
export async function hostedChatStream(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw new OpenClawError("Run cancelled.");
    throw NOT_DEPLOYED;
  }
  if (!res.ok) throw await failFor(res);
  if (!(res.headers.get("content-type") || "").includes("event-stream")) throw NOT_DEPLOYED;
  if (!res.body) throw new OpenClawError("The free model returned an empty response.");
  return readSseText(res.body, onDelta);
}
