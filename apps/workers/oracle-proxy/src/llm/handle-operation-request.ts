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
import { callGemini, streamGemini } from "./adaptors/gemini-adaptor";
import { callOpenAi, streamOpenAi } from "./adaptors/openai-adaptor";
import type {
  GenerationEvent,
  LlmModelDefinition,
  LlmOperation,
  LlmProvider,
  LlmRequest,
} from "./types";

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
  now: () => number = Date.now,
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

const STREAMING_ADAPTORS: Partial<
  Record<
    LlmProvider,
    (
      request: LlmRequest,
      model: LlmModelDefinition,
      env: HandleEnv,
      signal?: AbortSignal,
    ) => AsyncGenerator<GenerationEvent>
  >
> = {
  gemini: (request, model, env, signal) =>
    streamGemini(request, model, env, fetch, signal),
  openai: (request, model, env, signal) =>
    streamOpenAi(request, model, env, fetch, signal),
};

/**
 * True when the body declares a recognized `operation` AND asks to stream
 * it (`stream: true`). Kept separate from `isLlmOperationRequest` so a
 * caller that omits `stream` keeps hitting the buffered handler above
 * completely unchanged (#2423 preserves request/response for short ops).
 */
export function isLlmOperationStreamRequest(body: any): boolean {
  return isLlmOperationRequest(body) && body?.stream === true;
}

/**
 * Streaming counterpart to `handleLlmOperationRequest` (#2423). Resolves
 * only the operation's *primary* model — no retry-then-fallback chain, since
 * once a `delta` event has gone out the caller has already shown partial
 * content and a transparent retry on a different model/provider isn't
 * possible. A caller whose primary model/provider has no streaming adaptor,
 * or genuinely fails mid-stream, gets a single `error` event (or, before any
 * bytes are sent, a plain JSON error matching the buffered handler's shape)
 * and is expected to fall back to the buffered request/response path itself.
 */
export async function handleLlmOperationStreamRequest(
  body: any,
  corsHeaders: Record<string, string>,
  env: HandleEnv,
  signal?: AbortSignal,
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

  // Context hardcoded to "public", matching handleLlmOperationRequest (#2050
  // will add real context detection to both handlers together).
  const context = "public" as const;
  const defaults = getOperationDefaults(llmRequest.operation, context);

  let primaryKey: string | undefined;
  if (llmRequest.modelKeyOverride && getModel(llmRequest.modelKeyOverride)) {
    primaryKey = llmRequest.modelKeyOverride;
  }
  if (!primaryKey) primaryKey = defaults?.defaultModelKey;

  const model = primaryKey ? getModel(primaryKey) : undefined;
  if (!model || !model.enabled || !model.availability[context]) {
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

  const streamAdaptor = STREAMING_ADAPTORS[model.provider];
  if (!streamAdaptor) {
    return json(
      {
        error: {
          code: "LLM_NO_STREAMING_ADAPTOR",
          message: `No streaming adaptor is available for provider "${model.provider}".`,
        },
      },
      503,
    );
  }

  const generator = streamAdaptor(llmRequest, model, env, signal);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      let next: IteratorResult<GenerationEvent>;
      try {
        next = await generator.next();
      } catch {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: "stream-handler-error",
            } satisfies GenerationEvent)}\n\n`,
          ),
        );
        controller.close();
        return;
      }
      if (next.done) {
        controller.close();
        return;
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(next.value)}\n\n`),
      );
      if (next.value.type === "complete" || next.value.type === "error") {
        controller.close();
      }
    },
    cancel() {
      void generator.return?.(undefined);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
