import { formatErrorCode, postProxyJson } from "./proxy-http";
import { parseSseData, readSseFrames } from "./proxy-sse";

/**
 * Thrown when a `previous_interaction_id` is no longer valid (retention window
 * elapsed). The caller should reset interaction state and replay full history.
 */
export class InteractionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InteractionExpiredError";
  }
}

/**
 * Registry key used for server-side turn state (Interactions path).
 * oracle-proxy's `handleInteraction` resolves this via the model registry, so
 * it's provider-neutral on the wire — chat/revision/generator sessions all
 * thread this same key regardless of the caller's Gemini model-tier setting.
 */
export const INTERACTION_MODEL_KEY = "luna-fast";

/**
 * Named separately so generator callers can retain an explicit model choice
 * in their request shape while sharing the same Luna conversation route as
 * Oracle chat and entity revision.
 *
 * oracle-proxy's `handleInteraction` branches on the resolved model's
 * provider, so a Gemini key here routes to Gemini's Interactions API — the
 * original path, with the OpenAI Responses branch added alongside it later.
 */
export const GENERATOR_INTERACTION_MODEL_KEY = INTERACTION_MODEL_KEY;

export interface InteractionRequest {
  model: string;
  input: string;
  systemInstruction?: string;
  previousInteractionId?: string | null;
  storeConversation?: boolean;
  generationConfig?: Record<string, unknown>;
  signal?: AbortSignal;
}

type InteractionStreamRequest = Omit<InteractionRequest, "storeConversation">;

type InteractionEvent =
  | { type: "started" }
  | { type: "delta"; text: string }
  | { type: "complete"; text: string; id: string }
  | { type: "error"; error: string };

function interactionBody(params: InteractionRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: params.model,
    input: params.input,
    store: params.storeConversation ?? true,
  };
  if (params.systemInstruction)
    body.system_instruction = params.systemInstruction;
  if (params.previousInteractionId)
    body.previous_interaction_id = params.previousInteractionId;
  if (params.generationConfig) body.generationConfig = params.generationConfig;
  return body;
}

function interactionEvent(event: any): InteractionEvent | undefined {
  if (event.type === "started") return { type: "started" };
  if (event.type === "delta" && typeof event.text === "string") {
    return { type: "delta", text: event.text };
  }
  if (
    event.type === "complete" &&
    typeof event.id === "string" &&
    typeof event.text === "string"
  ) {
    return { type: "complete", id: event.id, text: event.text };
  }
  if (event.type === "error") {
    return {
      type: "error",
      error:
        typeof event.error === "string"
          ? event.error
          : "interaction-stream-error",
    };
  }
}

async function requireInteractionStream(
  response: Response,
): Promise<ReadableStream<Uint8Array>> {
  if (response.status === 409) {
    await response.body?.cancel();
    throw new InteractionExpiredError("Interaction expired");
  }
  if (
    !response.ok ||
    !response.body ||
    !response.headers.get("content-type")?.includes("text/event-stream")
  ) {
    await response.body?.cancel();
    throw new Error("interaction-stream-unavailable");
  }
  return response.body;
}

/** Provider-stored conversation requests and interaction event validation. */
export class ProxyInteractions {
  constructor(
    private proxyUrl: string,
    private doFetch: typeof fetch,
  ) {}

  /** Expired continuations must be replayed by the caller with full history. */
  async send(
    params: InteractionRequest,
  ): Promise<{ id: string; text: string }> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("You appear to be offline. Generation is unavailable.");
    }
    const response = await postProxyJson(
      this.doFetch,
      this.proxyUrl,
      interactionBody(params),
      params.signal,
    );
    const data = await response.json().catch(() => ({}) as any);
    if (!response.ok) throwInteractionFailure(response, data);
    return { id: data.id as string, text: (data.text as string) || "" };
  }

  /** A complete event is not an acknowledgement that adventure state is saved. */
  async *stream(
    params: InteractionStreamRequest,
  ): AsyncGenerator<InteractionEvent> {
    const body = {
      ...interactionBody({ ...params, storeConversation: true }),
      stream: true,
    };
    const response = await postProxyJson(
      this.doFetch,
      this.proxyUrl,
      body,
      params.signal,
    );
    const stream = await requireInteractionStream(response);
    const reader = stream.getReader();
    let completed = false;
    try {
      for await (const { raw, trailing } of readSseFrames(reader)) {
        for (const data of parseSseData(raw)) {
          const event = interactionEvent(data);
          if (!event) continue;
          if (event.type === "complete") completed = true;
          yield event;
          // Preserve the original unterminated-frame behaviour: trailing
          // errors are yielded before checking for a complete response.
          if (event.type === "error" && !trailing) return;
        }
      }
      if (!completed) throw new Error("interaction-stream-incomplete");
    } finally {
      await reader.cancel().catch(() => {});
    }
  }
}

function throwInteractionFailure(response: Response, data: any): never {
  if (
    response.status === 409 ||
    data?.error?.code === "INTERACTION_NOT_FOUND"
  ) {
    throw new InteractionExpiredError(
      data?.error?.message || "Interaction expired",
    );
  }
  throw new Error(
    `[OracleProxy] Interaction failed: ${data?.error?.message || "Unknown error"}${formatErrorCode(data?.error?.code)}`,
  );
}
