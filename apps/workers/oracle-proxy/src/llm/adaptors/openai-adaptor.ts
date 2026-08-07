/**
 * OpenAI-compatible provider adaptor. Handles every OpenAI-family model
 * (including GPT-5.6 Luna) — differentiated only by `modelId` in the
 * model's registry entry, never by adaptor code (FR-002/FR-005/FR-006).
 */

import type {
  LlmAdaptorResult,
  LlmModelDefinition,
  LlmRequest,
} from "../types";
import {
  validateAgainstSchema,
  wantsStructuredOutput,
} from "../schema-validation";

const PROVIDER_TIMEOUT_MS = 15_000;
const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

interface OpenAiEnv {
  OPENAI_API_KEY?: string;
}

/**
 * Translates an `LlmRequest` into an OpenAI-compatible `chat/completions`
 * call and normalizes the response into `LlmResponse`. Enforces the
 * 15-second provider-call timeout itself (FR-005) — the resolver never
 * calls `fetch`/a provider directly.
 */
export async function callOpenAi(
  request: LlmRequest,
  model: LlmModelDefinition,
  env: OpenAiEnv,
  fetcher: typeof fetch = fetch,
): Promise<LlmAdaptorResult> {
  if (!env.OPENAI_API_KEY) {
    return { ok: false, reason: "missing-openai-api-key" };
  }

  const messages = request.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const body: Record<string, unknown> = {
    model: model.modelId,
    messages,
  };

  // GPT-5.6-family models (confirmed live against gpt-5.6-luna) reject an
  // explicit `temperature` — they only support the fixed default — and use
  // `max_completion_tokens` rather than the legacy `max_tokens` parameter,
  // matching OpenAI's newer reasoning-tier model convention. Since every
  // OpenAI-provider registry entry today is in that family, `temperature`
  // is intentionally never forwarded; revisit if a non-reasoning
  // OpenAI-compatible model is ever added to the registry.
  const maxOutputTokens =
    request.maxOutputTokens ?? model.defaultParameters?.maxOutputTokens;
  if (maxOutputTokens !== undefined) {
    body.max_completion_tokens = maxOutputTokens;
  }
  if (request.topP !== undefined) body.top_p = request.topP;
  // Reasoning-tier models (GPT-5.6-family) spend variable internal
  // "thinking" time before responding; most of our tasks are constrained
  // generation/classification following an already-detailed prompt, not
  // genuine multi-step reasoning, so the registry sets this per operation
  // (see OPERATION_DEFAULTS) rather than leaving it at the model's default
  // depth. Omitted entirely when unset, so a future non-reasoning
  // OpenAI-provider model that would reject this field is unaffected.
  if (request.reasoningEffort) {
    body.reasoning_effort = request.reasoningEffort;
  }

  if (wantsStructuredOutput(request)) {
    if (request.schema) {
      // OpenAI's `strict: true` structured-output mode rejects any schema
      // that doesn't set `additionalProperties: false` on every object level
      // and list every property as `required` — callers of this pipeline
      // aren't expected to know or satisfy that OpenAI-specific constraint.
      // Non-strict json_schema mode is more lenient, and schema-validation.ts
      // already re-validates the parsed response against `request.schema`
      // afterward, so correctness doesn't depend on OpenAI's strict enforcement.
      body.response_format = {
        type: "json_schema",
        json_schema: { name: "response", schema: request.schema },
      };
    } else {
      // Schema-less structured-generation: OpenAI's dedicated "give me
      // valid JSON, no schema" mode — mirrors Gemini's schema-less
      // response_mime_type: "application/json". Note: OpenAI requires the
      // word "json" to appear somewhere in the messages when using this
      // mode, or the API rejects the request — callers should ensure their
      // prompt mentions JSON when requesting structured-generation without
      // a schema.
      body.response_format = { type: "json_object" };
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetcher(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    // In Workers, an aborted fetch typically rejects with a DOMException,
    // not an Error, so check `.name` directly rather than gating on
    // `instanceof Error` first.
    const isTimeout =
      (err as { name?: string } | undefined)?.name === "AbortError";
    return { ok: false, reason: isTimeout ? "timeout" : "transport-error" };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return { ok: false, reason: `upstream-status-${response.status}` };
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { ok: false, reason: "invalid-upstream-json" };
  }

  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const usage = data?.usage
    ? {
        promptTokens: data.usage.prompt_tokens ?? 0,
        completionTokens: data.usage.completion_tokens ?? 0,
      }
    : undefined;

  if (wantsStructuredOutput(request)) {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        reason: "structured-output-invalid",
        structuredOutputValidationFailed: true,
      };
    }
    if (request.schema && !validateAgainstSchema(parsed, request.schema)) {
      return {
        ok: false,
        reason: "structured-output-schema-mismatch",
        structuredOutputValidationFailed: true,
      };
    }
    return {
      ok: true,
      response: {
        content: parsed,
        modelKey: model.key,
        usage,
        structuredOutputValid: true,
      },
    };
  }

  return { ok: true, response: { content: text, modelKey: model.key, usage } };
}

export interface OpenAiInteractionResult {
  ok: boolean;
  status: number;
  data: unknown;
  parseError?: boolean;
  transportError?: boolean;
}

/**
 * Forward an Interactions-API-shaped request body (the proxy's provider-neutral
 * wire contract: `input`, `previous_interaction_id`, `store`) to OpenAI's
 * Responses API, translating it into that API's own turn-continuation shape
 * (`input`, `previous_response_id`). Lets `handleInteraction` in index.ts treat
 * every provider identically — same request/response shape as
 * `forwardInteractionToGemini` — so chat/revision/generator sessions that
 * already thread a `previousInteractionId` through get server-side turn state
 * on OpenAI models for free, just by naming an OpenAI registry key as `model`.
 */
export async function forwardInteractionToOpenAi(
  body: Record<string, any>,
  modelId: string,
  env: OpenAiEnv,
  fetcher: typeof fetch = fetch,
): Promise<OpenAiInteractionResult> {
  if (!env.OPENAI_API_KEY) {
    return {
      ok: false,
      status: 500,
      data: { error: { message: "missing-openai-api-key" } },
    };
  }

  const instructions: string | undefined =
    typeof body.system_instruction === "string"
      ? body.system_instruction
      : typeof body.systemInstruction === "string"
        ? body.systemInstruction
        : body.system_instruction?.parts?.[0]?.text;

  const payload: Record<string, unknown> = {
    model: modelId,
    input: body.input,
    store: body.store ?? true,
    // This path (chat/revision/generator sessions via the Interactions API)
    // has no per-operation registry hook like the resolver-driven pipeline
    // in callOpenAi does — it's routed by which model was requested, not by
    // an LlmOperation. Hardcoding "low" here matches that pipeline's
    // freeform-generation/structured-generation level as a reasonable
    // single default; revisit independently if this path proves too slow
    // or too shallow once it's actually measured.
    reasoning: { effort: "low" },
  };
  if (body.previous_interaction_id) {
    payload.previous_response_id = body.previous_interaction_id;
  }
  if (instructions) {
    payload.instructions = instructions;
  }

  const genConfig = body.generation_config || body.generationConfig;
  if (genConfig) {
    // Schema-less "give me valid JSON" mode — the Responses API's structured
    // output config moved from chat/completions' `response_format` to
    // `text.format` (mirrors the json_object/json_schema modes callOpenAi
    // already uses for the operation pipeline). Only json_object is needed
    // here: none of today's Interactions-path callers (chat/revision/
    // generator sessions) pass an explicit schema through generationConfig.
    const mimeType = genConfig.responseMimeType ?? genConfig.response_mime_type;
    if (mimeType === "application/json") {
      payload.text = { format: { type: "json_object" } };
      // OpenAI's schema-less json_object mode 400s unless "json" appears
      // somewhere in the instructions/input (same constraint callOpenAi
      // documents for chat/completions' json_object mode). Guarantee it here
      // rather than trusting every Interactions-path caller's system
      // instruction to happen to mention it.
      payload.instructions = payload.instructions
        ? `${payload.instructions}\n\nRespond with valid JSON.`
        : "Respond with valid JSON.";
    }
    const maxOutputTokens =
      genConfig.maxOutputTokens ?? genConfig.max_output_tokens;
    if (maxOutputTokens !== undefined) {
      payload.max_output_tokens = maxOutputTokens;
    }
    const topP = genConfig.topP ?? genConfig.top_p;
    if (topP !== undefined) payload.top_p = topP;
    // `temperature` intentionally omitted: GPT-5.6-family models reject an
    // explicit value (see callOpenAi above) and every OpenAI registry entry
    // today is in that family.
  }

  let upstream: Response;
  try {
    upstream = await fetcher(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[Oracle Proxy] OpenAI Responses fetch error:", err);
    return { ok: false, status: 502, data: null, transportError: true };
  }

  const text = await upstream.text();
  try {
    const data = text ? JSON.parse(text) : {};
    return { ok: upstream.ok, status: upstream.status, data };
  } catch {
    return { ok: false, status: 502, data: null, parseError: true };
  }
}

/**
 * Extract assistant text from a Responses API payload: `output` is a list of
 * items, of which `message`-typed ones carry `content` blocks of type
 * `output_text`.
 */
export function extractOpenAiResponseText(data: any): string {
  const output: any[] = Array.isArray(data?.output) ? data.output : [];
  return output
    .filter((item) => item?.type === "message")
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .filter((c: any) => c?.type === "output_text")
    .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
    .filter(Boolean)
    .join("");
}
