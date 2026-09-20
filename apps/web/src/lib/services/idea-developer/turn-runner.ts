import {
  InteractionExpiredError,
  aiClientManager,
  classifyApiError,
} from "@codex/ai-engine";
import {
  DEFAULT_MODE,
  buildFollowUpInput,
  buildReplayInput,
  GENERATOR_CATALOGUE,
  buildFirstTurnInput,
  emphasisFor,
  normaliseSuggestions,
  buildSystemInstruction,
  parseDevelopmentResponse,
  type Conversation,
  type Development,
  type FollowUpKind,
  type ModeId,
  type OfferedGenerator,
} from "generator-engine";

/**
 * Builds, sends and validates one turn of an Idea Developer conversation
 * (#3228). One responsibility: talk to the model and turn what comes back into
 * a validated development or a plain-language failure. It knows nothing about
 * limits, storage, the Session Hub or recovery.
 */

/** The registry key, not a provider model id — the proxy resolves it. */
export const IDEA_DEVELOPER_MODEL = "luna-fast";
const MAX_OUTPUT_TOKENS = 4096;

export interface TurnRunnerClient {
  sendInteraction: (params: {
    model: string;
    input: string;
    systemInstruction?: string;
    previousInteractionId?: string | null;
    storeConversation?: boolean;
    generationConfig?: Record<string, unknown>;
    signal?: AbortSignal;
  }) => Promise<{ id: string; text: string }>;
}

export type TurnFailureCode =
  | "bot-check"
  | "safety"
  | "rate-limit"
  | "quota"
  | "offline"
  | "invalid-output"
  | "expired"
  | "unknown";

export interface TurnFailure {
  code: TurnFailureCode;
  message: string;
}

export type TurnOutcome =
  | { kind: "development"; development: Development; interactionId: string }
  | { kind: "needs-rpg-idea"; message?: string; interactionId: string }
  | { kind: "cancelled" }
  | { kind: "failed"; failure: TurnFailure };

export interface FirstTurnParams {
  idea: string;
  mode?: ModeId;
  emphasis?: string;
  generators?: OfferedGenerator[];
  signal?: AbortSignal;
}

const FAILURE_MESSAGES: Record<TurnFailureCode, string> = {
  "bot-check":
    "We couldn't confirm you're a person. If a blocker is stopping the check, allow it for this site and try again. Your idea is still here.",
  safety:
    "That couldn't be processed. Try rewording it. Your idea is still here.",
  "rate-limit": "Too many requests right now. Wait a moment and try again.",
  quota: "The AI service is busy today. Try again later.",
  offline: "You appear to be offline. Your idea is still here.",
  "invalid-output":
    "The response wasn't in the expected shape. Try again; your idea is still here.",
  expired: "This conversation is no longer available.",
  unknown: "Something went wrong. Your idea is still here. Try again.",
};

function failure(code: TurnFailureCode): TurnOutcome {
  return { kind: "failed", failure: { code, message: FAILURE_MESSAGES[code] } };
}

function isAbort(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    (err as { name?: string }).name === "AbortError"
  );
}

function mapError(err: unknown): TurnOutcome {
  if (isAbort(err)) return { kind: "cancelled" };
  if (err instanceof InteractionExpiredError) return failure("expired");
  const { type } = classifyApiError(err);
  switch (type) {
    case "verification":
      return failure("bot-check");
    case "safety":
      return failure("safety");
    case "rate-limit":
      return failure("rate-limit");
    case "quota":
      return failure("quota");
    case "offline":
      return failure("offline");
    default:
      return failure("unknown");
  }
}

export interface FollowUpParams {
  kind: FollowUpKind;
  text: string;
  /** The mode in force for this turn (the new mode, for a mode switch). */
  mode: ModeId;
  previousInteractionId: string;
  /** The number of completed turns so far; the first turn is zero. */
  turnIndex: number;
  signal?: AbortSignal;
}

export interface ReplayParams extends Omit<
  FollowUpParams,
  "previousInteractionId"
> {
  conversation: Conversation;
  generators?: OfferedGenerator[];
}

const GENERATION_CONFIG = {
  responseMimeType: "application/json",
  maxOutputTokens: MAX_OUTPUT_TOKENS,
};

function offeredGenerators(): OfferedGenerator[] {
  return GENERATOR_CATALOGUE.map(({ key, label, description }) => ({
    key,
    label,
    description,
  }));
}

export class TurnRunner {
  constructor(private readonly client: TurnRunnerClient = aiClientManager) {}

  async runFirstTurn(params: FirstTurnParams): Promise<TurnOutcome> {
    const mode = params.mode ?? DEFAULT_MODE;
    const request = {
      model: IDEA_DEVELOPER_MODEL,
      input: buildFirstTurnInput(params.idea, {
        emphasis: params.emphasis ?? emphasisFor(mode),
      }),
      systemInstruction: buildSystemInstruction({
        generators:
          params.generators ??
          GENERATOR_CATALOGUE.map(({ key, label, description }) => ({
            key,
            label,
            description,
          })),
      }),
      storeConversation: true,
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
      signal: params.signal,
    };
    return this.sendAndParse(request, { turnIndex: 0, mode });
  }

  /**
   * A turn after the first. The provider holds the earlier turns, so only the
   * new input is sent, with the previous interaction id.
   */
  async runFollowUpTurn(params: FollowUpParams): Promise<TurnOutcome> {
    const emphasis =
      params.kind === "switch-mode" ? emphasisFor(params.mode) : undefined;
    return this.sendAndParse(
      {
        model: IDEA_DEVELOPER_MODEL,
        input: buildFollowUpInput(params.kind, params.text, { emphasis }),
        previousInteractionId: params.previousInteractionId,
        storeConversation: true,
        generationConfig: GENERATION_CONFIG,
        signal: params.signal,
      },
      { turnIndex: params.turnIndex, mode: params.mode },
    );
  }

  /**
   * Rebuilds a conversation the provider no longer holds, as one first-turn
   * request with the full system instruction and no previous interaction id.
   */
  async runReplay(params: ReplayParams): Promise<TurnOutcome> {
    const emphasis =
      params.kind === "switch-mode" ? emphasisFor(params.mode) : undefined;
    return this.sendAndParse(
      {
        model: IDEA_DEVELOPER_MODEL,
        input: buildReplayInput(params.conversation, {
          kind: params.kind,
          text: params.text,
          emphasis,
        }),
        systemInstruction: buildSystemInstruction({
          generators: params.generators ?? offeredGenerators(),
        }),
        storeConversation: true,
        generationConfig: GENERATION_CONFIG,
        signal: params.signal,
      },
      { turnIndex: params.turnIndex, mode: params.mode },
    );
  }

  /** Sends a request and validates the reply, retrying invalid output once. */
  private async sendAndParse(
    request: Parameters<TurnRunnerClient["sendInteraction"]>[0],
    parse: { turnIndex: number; mode: ModeId },
  ): Promise<TurnOutcome> {
    for (let attempt = 0; attempt < 2; attempt++) {
      let reply: { id: string; text: string };
      try {
        reply = await this.client.sendInteraction(request);
      } catch (err) {
        return mapError(err);
      }
      const parsed = parseDevelopmentResponse(reply.text, parse);
      if (parsed.kind === "development") {
        return {
          kind: "development",
          development: {
            ...parsed.development,
            generatorSuggestions: normaliseSuggestions(
              parsed.development.generatorSuggestions,
            ),
          },
          interactionId: reply.id,
        };
      }
      if (parsed.kind === "needs-rpg-idea") {
        return {
          kind: "needs-rpg-idea",
          message: parsed.message,
          interactionId: reply.id,
        };
      }
    }
    return failure("invalid-output");
  }
}

export const turnRunner = new TurnRunner();
