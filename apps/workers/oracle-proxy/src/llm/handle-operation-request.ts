/**
 * Entry point for the new provider-neutral operation-request pipeline
 * (contracts/llm-operation-request.md). Wires request validation →
 * resolver → provider adaptors → observability logging → normalized
 * response, per FR-003/FR-004/FR-005/FR-011/FR-012.
 */

import { getModel, getOperationDefaults } from "./registry";
import { createResolver } from "./resolver";
import { validateOperationRequestBody } from "./request-validation";
import { buildResolutionLogEntry } from "./observability";
import { callGemini } from "./adaptors/gemini-adaptor";
import { callOpenAi } from "./adaptors/openai-adaptor";
import type { LlmOperation, LlmRequest } from "./types";

const LLM_OPERATIONS: ReadonlySet<LlmOperation> = new Set([
  "structured-generation",
  "freeform-generation",
  "revision",
  "classification",
  "utility",
]);

/**
 * True when the body declares a recognized `operation` field, meaning it
 * should be routed through the new pipeline rather than the legacy
 * Interactions/generateContent branches (research.md R1).
 */
export function isLlmOperationRequest(body: any): boolean {
  return (
    typeof body?.operation === "string" && LLM_OPERATIONS.has(body.operation)
  );
}

interface HandleEnv {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY?: string;
}

export async function handleLlmOperationRequest(
  body: any,
  corsHeaders: Record<string, string>,
  env: HandleEnv,
  now: () => number = () => Date.now(),
): Promise<Response> {
  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const validation = validateOperationRequestBody(body);
  if (!validation.valid) {
    return json({ error: validation.error }, 400);
  }

  const llmRequest: LlmRequest = {
    operation: body.operation,
    messages: body.messages,
    schema: body.schema,
    temperature: body.temperature,
    maxOutputTokens: body.maxOutputTokens,
    modelKeyOverride: body.modelKeyOverride,
  };

  // Context is hardcoded to "public" for every request in this slice
  // (FR-003) — no header/token inspection or other caller-identity
  // detection. Real authenticated-context detection is deferred to #2050.
  const context = "public" as const;

  const resolver = createResolver({
    getModel,
    getOperationDefaults,
    adaptors: {
      gemini: (req, model) => callGemini(req, model, env),
      openai: (req, model) => callOpenAi(req, model, env),
    },
  });

  const start = now();
  const outcome = await resolver.resolve(llmRequest, context);
  const latencyMs = now() - start;

  // Metadata-only log entry — never the request messages or response
  // content (FR-012/SC-006). This is the only thing ever logged here.
  const logEntry = buildResolutionLogEntry({
    outcome,
    operation: llmRequest.operation,
    context,
    latencyMs,
    getModel,
  });
  console.log(JSON.stringify(logEntry));

  if (outcome.result.ok) {
    return json(
      {
        content: outcome.result.response.content,
        modelKey: outcome.result.response.modelKey,
        usage: outcome.result.response.usage,
        structuredOutputValid: outcome.result.response.structuredOutputValid,
      },
      200,
    );
  }

  if (outcome.result.reason === "no-model-available") {
    return json(
      {
        error: {
          code: "LLM_NO_MODEL_AVAILABLE",
          message:
            "No enabled model satisfies the requested operation/capability in this context.",
        },
      },
      503,
    );
  }

  return json(
    {
      error: {
        code: "LLM_PROVIDER_UNAVAILABLE",
        message: "The request could not be completed after retry and fallback.",
      },
    },
    502,
  );
}
