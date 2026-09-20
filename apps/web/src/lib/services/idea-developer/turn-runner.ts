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
/** Reasoning tokens count against this limit, so leave room to finish the reply. */
const MAX_OUTPUT_TOKENS = 8192;

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

/** Asks again, saying what was wrong with the last reply. */
function withRepairNote(input: string, reason: string): string {
  return `${input}\n\nYour previous reply was not usable: ${reason} Reply again with the full JSON object exactly as specified, with every field, and nothing else.`;
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
   * new input is sent, with the previous interaction id. The system instruction
   * is sent again because the provider does not remember it between turns.
   */
  async runFollowUpTurn(params: FollowUpParams): Promise<TurnOutcome> {
    const emphasis =
      params.kind === "switch-mode" ? emphasisFor(params.mode) : undefined;
    return this.sendAndParse(
      {
        model: IDEA_DEVELOPER_MODEL,
        input: buildFollowUpInput(params.kind, params.text, { emphasis }),
        // The provider does not carry `instructions` across previous_response_id,
        // so the rules (sections, JSON shape, whatChanged) go with every turn.
        systemInstruction: buildSystemInstruction({
          generators: offeredGenerators(),
        }),
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
    let toSend = request;
    for (let attempt = 0; attempt < 2; attempt++) {
      let reply: { id: string; text: string };
      try {
        reply = await this.client.sendInteraction(toSend);
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
      // The reason is a fixed sentence about the shape, never the reply or the idea.
      console.warn("[Idea Developer] Reply rejected:", parsed.reason);
      toSend = {
        ...request,
        input: withRepairNote(request.input, parsed.reason),
      };
    }
    return failure("invalid-output");
  }
}

export const turnRunner = new TurnRunner();
