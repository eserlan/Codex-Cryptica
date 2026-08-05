/**
 * Gemini provider adaptor.
 *
 * Two entry points live here:
 *
 * - `forwardToGemini` / `forwardInteractionToGemini`: the pre-existing
 *   request/response translation logic, mechanically lifted out of
 *   `index.ts` (research.md R3). Behavior is unchanged — these exist so the
 *   Worker's two legacy branches (raw `contents` passthrough, and the
 *   Interactions API) can keep working exactly as before (FR-007) while
 *   sharing this file with the new pipeline below.
 * - `callGemini`: the new provider-neutral adaptor used by `resolver.ts`
 *   for the operation-typed request pipeline (FR-005). Translates the
 *   common `LlmRequest` into a Gemini `generateContent` call and normalizes
 *   the response into `LlmResponse`, enforcing a 15-second call timeout.
 */

import type {
  LlmAdaptorResult,
  LlmModelDefinition,
  LlmRequest,
} from "../types";
import { validateAgainstSchema } from "../schema-validation";

const PROVIDER_TIMEOUT_MS = 15_000;

interface GeminiEnv {
  GEMINI_API_KEY: string;
}

/**
 * Map camelCase/snake_case generation config fields to the snake_case shape
 * the Google REST API expects. Mirrors the mapping previously inlined in
 * `index.ts`'s root POST handler.
 */
const GENERATION_CONFIG_FIELD_MAP: Record<string, string> = {
  stopSequences: "stop_sequences",
  stop_sequences: "stop_sequences",
  maxOutputTokens: "max_output_tokens",
  max_output_tokens: "max_output_tokens",
  responseMimeType: "response_mime_type",
  response_mime_type: "response_mime_type",
  responseModalities: "response_modalities",
  response_modalities: "response_modalities",
  candidateCount: "candidate_count",
  candidate_count: "candidate_count",
  temperature: "temperature",
  topP: "top_p",
  top_p: "top_p",
  topK: "top_k",
  top_k: "top_k",
};

function mapGenerationConfig(rawConfig: Record<string, unknown>) {
  const generation_config: Record<string, unknown> = {};
  for (const [inputKey, snakeKey] of Object.entries(
    GENERATION_CONFIG_FIELD_MAP,
  )) {
    if (rawConfig[inputKey] !== undefined) {
      generation_config[snakeKey] = rawConfig[inputKey];
    }
  }

  // speechConfig → speech_config: only written when a concrete voice name is
  // present — an empty speech_config object causes a 400 from Google.
  const rawSpeechConfig =
    (rawConfig as any).speechConfig ?? (rawConfig as any).speech_config;
  if (rawSpeechConfig) {
    const rawVoiceConfig =
      rawSpeechConfig.voiceConfig ?? rawSpeechConfig.voice_config;
    if (rawVoiceConfig) {
      const rawPrebuilt =
        rawVoiceConfig.prebuiltVoiceConfig ??
        rawVoiceConfig.prebuilt_voice_config;
      const voiceName = rawPrebuilt?.voiceName ?? rawPrebuilt?.voice_name;
      if (voiceName) {
        generation_config.speech_config = {
          voice_config: {
            prebuilt_voice_config: { voice_name: voiceName },
          },
        };
      }
    }
  }

  return generation_config;
}

export interface GeminiForwardResult {
  status: number;
  data: unknown;
  parseError?: boolean;
}

/**
 * Forward a raw `generateContent`-shaped request body to Gemini, exactly as
 * `index.ts` did inline before extraction. No behavior change (FR-007).
 */
export async function forwardToGemini(
  body: Record<string, any>,
  env: GeminiEnv,
  fetcher: typeof fetch = fetch,
): Promise<GeminiForwardResult> {
  const targetModel = body.model || "gemini-3.5-flash-lite";

  const rawConfig = {
    ...(body.generation_config || body.generationConfig || {}),
  } as Record<string, unknown>;
  const generation_config = mapGenerationConfig(rawConfig);

  const safety_settings = body.safety_settings || body.safetySettings;
  let system_instruction = body.system_instruction || body.systemInstruction;

  const systemKeys = [
    "systemInstruction",
    "system_instruction",
    "system-instruction",
  ];
  for (const key of systemKeys) {
    if ((rawConfig as any)[key]) {
      system_instruction = system_instruction || (rawConfig as any)[key];
    }
  }

  const formattedSystemInstruction =
    typeof system_instruction === "string"
      ? { parts: [{ text: system_instruction }] }
      : system_instruction;

  const outgoingPayload = {
    contents: body.contents,
    generation_config,
    system_instruction: formattedSystemInstruction,
    safety_settings,
  };

  console.log(`[Oracle Proxy] Forwarding to Google model: ${targetModel}`);

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${env.GEMINI_API_KEY}`;

  const geminiResponse = await fetcher(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(outgoingPayload),
  });

  const responseText = await geminiResponse.text();
  try {
    const data = responseText ? JSON.parse(responseText) : {};
    return { status: geminiResponse.status, data };
  } catch {
    return { status: geminiResponse.status, data: null, parseError: true };
  }
}

export interface GeminiInteractionResult {
  ok: boolean;
  status: number;
  data: unknown;
  parseError?: boolean;
  transportError?: boolean;
}

/**
 * Forward a raw Interactions-API-shaped request body to Gemini, exactly as
 * `index.ts`'s `handleInteraction` did inline before extraction. No
 * behavior change (FR-007).
 */
export async function forwardInteractionToGemini(
  body: Record<string, any>,
  env: GeminiEnv,
  fetcher: typeof fetch = fetch,
): Promise<GeminiInteractionResult> {
  const targetModel = body.model || "gemini-3.5-flash-lite";

  const systemInstruction: string | undefined =
    typeof body.system_instruction === "string"
      ? body.system_instruction
      : typeof body.systemInstruction === "string"
        ? body.systemInstruction
        : body.system_instruction?.parts?.[0]?.text;

  const payload: Record<string, unknown> = {
    model: targetModel,
    input: body.input,
    store: body.store ?? true,
  };
  if (body.previous_interaction_id) {
    payload.previous_interaction_id = body.previous_interaction_id;
  }
  if (systemInstruction) {
    payload.system_instruction = systemInstruction;
  }
  if (body.generation_config || body.generationConfig) {
    payload.generation_config = body.generation_config || body.generationConfig;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${env.GEMINI_API_KEY}`;

  let upstream: Response;
  try {
    upstream = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[Oracle Proxy] Interactions fetch error:", err);
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
 * New provider-neutral adaptor: translates an `LlmRequest` into a Gemini
 * `generateContent` call and normalizes the response into `LlmResponse`.
 * Enforces the 15-second provider-call timeout itself (FR-005) — the
 * resolver never calls `fetch`/a provider directly.
 */
export async function callGemini(
  request: LlmRequest,
  model: LlmModelDefinition,
  env: GeminiEnv,
  fetcher: typeof fetch = fetch,
): Promise<LlmAdaptorResult> {
  const systemMessages = request.messages.filter((m) => m.role === "system");
  const conversational = request.messages.filter((m) => m.role !== "system");

  const contents = conversational.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const generation_config: Record<string, unknown> = {};
  const temperature =
    request.temperature ?? model.defaultParameters?.temperature;
  if (temperature !== undefined) generation_config.temperature = temperature;
  const maxOutputTokens =
    request.maxOutputTokens ?? model.defaultParameters?.maxOutputTokens;
  if (maxOutputTokens !== undefined) {
    generation_config.max_output_tokens = maxOutputTokens;
  }
  if (request.schema) {
    generation_config.response_mime_type = "application/json";
  }

  const payload = {
    contents,
    generation_config,
    system_instruction: systemMessages.length
      ? { parts: [{ text: systemMessages.map((m) => m.content).join("\n\n") }] }
      : undefined,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  let response: Response;
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.modelId}:generateContent?key=${env.GEMINI_API_KEY}`;
    response = await fetcher(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    // In Workers, an aborted fetch typically rejects with a DOMException,
    // not an Error, so check `.name` directly rather than gating on
    // `instanceof Error` first.
    const isTimeout =
      (err as { name?: string } | undefined)?.name === "AbortError";
    return {
      ok: false,
      reason: isTimeout ? "timeout" : "transport-error",
    };
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

  const candidate = data?.candidates?.[0];
  const text: string =
    candidate?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";

  const usage = data?.usageMetadata
    ? {
        promptTokens: data.usageMetadata.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
      }
    : undefined;

  if (request.schema) {
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
    if (!validateAgainstSchema(parsed, request.schema)) {
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

  return {
    ok: true,
    response: { content: text, modelKey: model.key, usage },
  };
}
