/** Provider-neutral server-side conversation SSE for Solo Adventure.
 * Only model output (never Gemini thought/tool deltas) reaches the client.
 * A continuation id is emitted only after a completed provider response.
 */
import type { Env } from "../env";
import { getCorsHeaders } from "../cors";
import { getModel } from "./registry";
import { buildGeminiInteractionPayload } from "./adaptors/gemini-adaptor";
import { buildOpenAiInteractionPayload } from "./adaptors/openai-adaptor";
import { readSseData } from "./sse";

type Provider = "openai" | "gemini";
const geminiUrl = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/interactions?key=${key}`;
const openAiUrl = "https://api.openai.com/v1/responses";

type NormalizedEvent =
  | { type: "started" }
  | { type: "delta"; text: string }
  | { type: "complete"; text: string; id: string }
  | { type: "error"; error: string };

function upstreamRequest(
  body: Record<string, any>,
  provider: Provider,
  modelId: string,
  env: Env,
  signal?: AbortSignal,
) {
  const payload =
    provider === "openai"
      ? buildOpenAiInteractionPayload(body, modelId)
      : buildGeminiInteractionPayload({ ...body, model: modelId });
  return fetch(
    provider === "openai" ? openAiUrl : geminiUrl(env.GEMINI_API_KEY),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(provider === "openai"
          ? { Authorization: `Bearer ${env.OPENAI_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    },
  );
}

/** Normalize one upstream JSON event, keeping only player-facing model output. */
export function normalizeInteractionStreamEvent(
  provider: Provider,
  raw: Record<string, any>,
  modelOutputSteps: Set<number>,
): NormalizedEvent | null {
  const type = raw.event_type ?? raw.type;
  if (provider === "gemini") {
    if (type === "step.start") {
      if (raw.step?.type === "model_output") modelOutputSteps.add(raw.index);
      return null;
    }
    if (type === "step.delta") {
      if (!modelOutputSteps.has(raw.index) || raw.delta?.type !== "text")
        return null;
      const text = raw.delta?.text;
      return typeof text === "string" && text
        ? { type: "delta", text }
        : null;
    }
    if (type === "interaction.completed") {
      const id = raw.interaction?.id;
      return typeof id === "string" && id
        ? { type: "complete", text: "", id }
        : { type: "error", error: "interaction-incomplete" };
    }
  } else {
    if (type === "response.output_text.delta") {
      return typeof raw.delta === "string" && raw.delta
        ? { type: "delta", text: raw.delta }
        : null;
    }
    if (type === "response.completed") {
      const id = raw.response?.id;
      return typeof id === "string" && id
        ? { type: "complete", text: "", id }
        : { type: "error", error: "interaction-incomplete" };
    }
    if (type === "response.incomplete" || type === "response.failed")
      return { type: "error", error: "interaction-incomplete" };
  }
  if (type === "error") return { type: "error", error: "interaction-stream-error" };
  return null;
}

export async function handleInteractionStream(
  body: Record<string, any>,
  request: Request,
  env: Env,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  const json = (status: number, code: string) =>
    new Response(JSON.stringify({ error: { code, message: code } }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  const key = typeof body.model === "string" ? body.model : "";
  const registered = getModel(key);
  let provider: Provider =
    registered?.provider === "openai" ? "openai" : "gemini";
  // Keep continuations pinned to their original provider. The OpenAI
  // registry key is allowed to fall back to Gemini only for a new thread.
  const isGeminiId =
    typeof body.previous_interaction_id === "string" &&
    /^(?:v1_|interactions\/)/.test(body.previous_interaction_id);
  if (isGeminiId || (provider === "openai" && !env.OPENAI_API_KEY)) provider = "gemini";
  const fallbackModel =
    getModel("gemini-flash-lite")?.modelId ?? "gemini-3.5-flash-lite";
  let modelId =
    provider === "openai"
      ? registered?.modelId ?? key
      : registered?.provider === "gemini"
        ? registered.modelId
        : key && !registered
          ? key
          : fallbackModel;

  let upstream: Response;
  try {
    upstream = await upstreamRequest(body, provider, modelId, env, request.signal);
    if (!upstream.ok && provider === "openai" && !body.previous_interaction_id) {
      // No prior conversation to corrupt: preserve existing Gemini fallback.
      await upstream.body?.cancel();
      provider = "gemini";
      modelId = fallbackModel;
      upstream = await upstreamRequest(body, provider, modelId, env, request.signal);
    }
  } catch {
    return json(502, "INTERACTION_STREAM_UNAVAILABLE");
  }
  if (!upstream.ok || !upstream.body) {
    const stale =
      !!body.previous_interaction_id &&
      (upstream.status === 404 || upstream.status === 400);
    await upstream.body?.cancel();
    return json(
      stale ? 409 : 502,
      stale ? "INTERACTION_NOT_FOUND" : "INTERACTION_STREAM_UNAVAILABLE",
    );
  }

  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: NormalizedEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      const steps = new Set<number>();
      let text = "";
      let completed = false;
      emit({ type: "started" });
      try {
        for await (const line of readSseData(reader)) {
          if (request.signal.aborted) break;
          if (line === "[DONE]") continue;
          let raw: Record<string, any>;
          try {
            raw = JSON.parse(line);
          } catch {
            continue;
          }
          const event = normalizeInteractionStreamEvent(provider, raw, steps);
          if (!event) continue;
          if (event.type === "delta") {
            text += event.text;
            // Bound overall stream accumulation to protect worker memory.
            if (text.length > 100_000) {
              emit({ type: "error", error: "interaction-output-too-long" });
              completed = true;
              break;
            }
          }
          if (event.type === "complete") {
            if (!text) {
              emit({ type: "error", error: "interaction-empty-output" });
            } else {
              emit({ ...event, text });
            }
            completed = true;
            break;
          }
          emit(event);
          if (event.type === "error") {
            completed = true;
            break;
          }
        }
        if (!completed)
          emit({ type: "error", error: "interaction-stream-incomplete" });
      } catch {
        emit({ type: "error", error: "interaction-stream-read-error" });
      } finally {
        await reader.cancel().catch(() => {});
        controller.close();
      }
    },
    cancel() {
      return reader.cancel();
    },
  });
  return new Response(stream, {
    headers: {
      ...cors,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
