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

  if (request.schema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: "response", schema: request.schema, strict: true },
    };
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
    const isTimeout = err instanceof Error && err.name === "AbortError";
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

  if (request.schema) {
    try {
      const parsed = JSON.parse(text);
      return {
        ok: true,
        response: {
          content: parsed,
          modelKey: model.key,
          usage,
          structuredOutputValid: true,
        },
      };
    } catch {
      return {
        ok: false,
        reason: "structured-output-invalid",
        structuredOutputValidationFailed: true,
      };
    }
  }

  return { ok: true, response: { content: text, modelKey: model.key, usage } };
}
