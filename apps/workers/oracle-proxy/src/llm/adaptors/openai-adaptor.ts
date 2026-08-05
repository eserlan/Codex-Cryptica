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

  const temperature =
    request.temperature ?? model.defaultParameters?.temperature;
  if (temperature !== undefined) body.temperature = temperature;
  const maxOutputTokens =
    request.maxOutputTokens ?? model.defaultParameters?.maxOutputTokens;
  if (maxOutputTokens !== undefined) body.max_tokens = maxOutputTokens;

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
