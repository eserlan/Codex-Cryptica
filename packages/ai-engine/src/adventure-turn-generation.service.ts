import {
  aiClientManager as defaultAiClientManager,
  InteractionExpiredError,
} from "./client-manager";
import {
  buildAdventurePrompt,
  detectHiddenTextLeakage,
  parseTurnProposal,
  type AdventureSession,
  type AdventureTurnProposal,
  type ResolvedSourceExcerpt,
  type SuppliedRollOutcome,
} from "@codex/adventure-engine";
import { LoreDeltaTracker, entityContentHash } from "@codex/oracle-engine";

export interface AdventureTurnGenerationRequest {
  session: AdventureSession;
  phase: "opening" | "action" | "roll-resolution";
  playerAction?: string;
  rollResolution?: SuppliedRollOutcome;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  signal?: AbortSignal;
  /** Ephemeral player-facing preview; never a committed or trusted turn. */
  onNarration?: (text: string) => void;
}

export interface AdventureAIClient {
  getModel(
    apiKey: string,
    modelName: string,
    systemInstruction?: string,
  ): Promise<{
    generateContent(input: unknown): Promise<{ response: { text(): string } }>;
  }>;
  sendInteraction?: (params: {
    model: string;
    input: string;
    systemInstruction?: string;
    previousInteractionId?: string | null;
    storeConversation?: boolean;
    generationConfig?: Record<string, unknown>;
  }) => Promise<{ id: string; text: string }>;
}

interface AdventureInteraction {
  previousInteractionId: string | null;
  tracker: LoreDeltaTracker;
  successfulTurns: number;
}

const CONTEXT_REFRESH_TURNS = 20;

function parseAdventureResponse(text: string): AdventureTurnProposal {
  try {
    return parseTurnProposal(JSON.parse(text));
  } catch {
    throw new Error("invalid-adventure-response");
  }
}

/**
 * Preview only the first top-level narration string in a structured JSON
 * response. This intentionally refuses nested fields and GM-only JSON.
 * Final JSON validation and the turn guard still run at commit; this also
 * checks each preview against the session's unrevealed secrets.
 */
export function extractAdventureNarrationPrefix(buffer: string): string {
  // Require the first top-level fields to be kind and narration. Never show
  // a private hidden-state field as a partial player preview.
  const pattern =
    /^\s*\{\s*"kind"\s*:\s*"(?:complete|roll-required)"\s*,\s*"(?:narration|setupNarration)"\s*:\s*"((?:[^"\\]|\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})*)/;
  const match = pattern.exec(buffer);
  if (!match) return "";
  try {
    return (JSON.parse('"' + match[1] + '"') as string).slice(0, 2_000);
  } catch {
    return "";
  }
}

type AdventureStreamEvent =
  | { type: "started" }
  | { type: "delta"; text: string }
  | { type: "complete"; text: string }
  | { type: "error"; error: string };

type AdventureStream =
  | AsyncIterable<AdventureStreamEvent>
  | {
      stream: AsyncIterable<{ text(): string }>;
      response: Promise<{ text(): string }>;
    };

function streamAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
}

async function collectEventStream(
  source: AsyncIterable<AdventureStreamEvent>,
  publish: (buffer: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let buffer = "";
  for await (const event of source) {
    streamAborted(signal);
    if (event.type === "delta") buffer += event.text;
    if (event.type === "complete") buffer = event.text || buffer;
    if (event.type === "error") throw new Error(event.error);
    publish(buffer);
  }
  streamAborted(signal);
  return buffer;
}

async function collectSdkStream(
  source: Exclude<AdventureStream, AsyncIterable<AdventureStreamEvent>>,
  publish: (buffer: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let buffer = "";
  for await (const chunk of source.stream) {
    streamAborted(signal);
    buffer += chunk.text();
    publish(buffer);
  }
  const response = await source.response;
  streamAborted(signal);
  return response.text() || buffer;
}

function collectAdventureStream(
  source: AdventureStream,
  publish: (buffer: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  return Symbol.asyncIterator in source
    ? collectEventStream(source, publish, signal)
    : collectSdkStream(source, publish, signal);
}

const idSchema = { type: "string", minLength: 1 } as const;
const textSchema = { type: "string", minLength: 1, maxLength: 600 } as const;
const diceExpressionSchema = {
  ...textSchema,
  pattern:
    "^\\s*(?:\\d*d\\d+(?:!|kh\\d*|kl\\d*)*|\\d+)(?:\\s*[+-]\\s*(?:\\d*d\\d+(?:!|kh\\d*|kl\\d*)*|\\d+))*\\s*$",
} as const;

const stateFactSchema = {
  type: "object",
  required: ["id", "text", "source"],
  properties: {
    id: idSchema,
    text: textSchema,
    source: {
      type: "string",
      enum: ["canonical", "provisional", "revealed-secret"],
    },
    sourceRecordId: idSchema,
  },
} as const;

const newStateFactSchema = {
  type: "object",
  required: ["text", "source"],
  properties: {
    text: textSchema,
    source: stateFactSchema.properties.source,
    sourceRecordId: idSchema,
  },
} as const;

const relationshipSchema = {
  ...stateFactSchema,
  required: [...stateFactSchema.required, "subjectId", "disposition"],
  properties: {
    ...stateFactSchema.properties,
    subjectId: idSchema,
    disposition: textSchema,
  },
} as const;

const newRelationshipSchema = {
  ...newStateFactSchema,
  required: [...newStateFactSchema.required, "subjectId", "disposition"],
  properties: {
    ...newStateFactSchema.properties,
    subjectId: idSchema,
    disposition: textSchema,
  },
} as const;

const hiddenSecretSchema = {
  type: "object",
  required: ["id", "text", "status"],
  properties: {
    id: idSchema,
    text: textSchema,
    status: { type: "string", enum: ["hidden", "revealed"] },
    revealCondition: textSchema,
    revealedOnTurnId: idSchema,
  },
} as const;

const newHiddenSecretSchema = {
  type: "object",
  required: ["text", "status"],
  properties: {
    text: textSchema,
    status: hiddenSecretSchema.properties.status,
    revealCondition: textSchema,
  },
} as const;

const hiddenThreadSchema = {
  type: "object",
  required: ["id", "text", "status"],
  properties: {
    id: idSchema,
    text: textSchema,
    status: { type: "string", enum: ["hidden", "revealed"] },
    revealCondition: textSchema,
  },
} as const;

const newHiddenThreadSchema = {
  type: "object",
  required: ["text", "status"],
  properties: {
    text: textSchema,
    status: hiddenThreadSchema.properties.status,
    revealCondition: textSchema,
  },
} as const;

const provisionalFactSchema = {
  type: "object",
  required: ["id", "kind", "name", "summary", "visibility"],
  properties: {
    id: idSchema,
    kind: {
      type: "string",
      enum: ["person", "place", "faction", "item", "event", "clue", "other"],
    },
    name: textSchema,
    summary: textSchema,
    visibility: { type: "string", enum: ["player-visible", "gm-only"] },
  },
} as const;

const newProvisionalFactSchema = {
  type: "object",
  required: ["kind", "name", "summary", "visibility"],
  properties: {
    kind: provisionalFactSchema.properties.kind,
    name: textSchema,
    summary: textSchema,
    visibility: provisionalFactSchema.properties.visibility,
  },
} as const;

function patchSchema(
  addItemSchema: Record<string, unknown>,
  updateItemSchema: Record<string, unknown>,
) {
  return {
    type: "object",
    required: ["add", "update", "removeIds"],
    properties: {
      add: { type: "array", items: addItemSchema },
      update: { type: "array", items: updateItemSchema },
      removeIds: { type: "array", items: idSchema },
    },
  } as const;
}

const bandSchema = {
  type: "object",
  required: ["id", "label"],
  properties: {
    id: idSchema,
    label: textSchema,
    minimum: { type: "number" },
    maximum: { type: "number" },
  },
} as const;

const adventureTurnResponseSchema = {
  oneOf: [
    {
      type: "object",
      required: [
        "kind",
        "narration",
        "visiblePatch",
        "hiddenPatch",
        "revealSecretIds",
        "provisionalFacts",
        "sourceRecordIds",
      ],
      properties: {
        kind: { type: "string", enum: ["complete"] },
        narration: { ...textSchema, maxLength: 2_000 },
        timeAdvance: {
          type: "object",
          required: ["minutes", "cause", "developments"],
          properties: {
            minutes: { type: "integer", minimum: 1, maximum: 43200 },
            cause: textSchema,
            developments: {
              type: "array",
              maxItems: 3,
              items: {
                type: "object",
                required: ["threadId", "text"],
                properties: { threadId: idSchema, text: textSchema },
              },
            },
          },
        },
        visiblePatch: {
          type: "object",
          properties: {
            location: { anyOf: [newStateFactSchema, { type: "null" }] },
            situation: { anyOf: [newStateFactSchema, { type: "null" }] },
            objectives: patchSchema(newStateFactSchema, stateFactSchema),
            activeCharacters: patchSchema(newStateFactSchema, stateFactSchema),
            knownFacts: patchSchema(newStateFactSchema, stateFactSchema),
            relationships: patchSchema(
              newRelationshipSchema,
              relationshipSchema,
            ),
          },
          required: [
            "objectives",
            "activeCharacters",
            "knownFacts",
            "relationships",
          ],
        },
        hiddenPatch: {
          type: "object",
          properties: {
            secrets: patchSchema(newHiddenSecretSchema, hiddenSecretSchema),
            gmThreads: patchSchema(newHiddenThreadSchema, hiddenThreadSchema),
          },
          required: ["secrets", "gmThreads"],
        },
        revealSecretIds: { type: "array", items: { type: "string" } },
        provisionalFacts: { type: "array", items: newProvisionalFactSchema },
        sourceRecordIds: { type: "array", items: idSchema },
        suggestedActions: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: textSchema,
        },
      },
    },
    {
      type: "object",
      required: ["kind", "uncertainty", "stakes", "sourceRecordIds"],
      properties: {
        kind: { type: "string", enum: ["roll-required"] },
        setupNarration: { ...textSchema, maxLength: 2_000 },
        uncertainty: textSchema,
        stakes: textSchema,
        dice: {
          type: "object",
          properties: {
            expression: diceExpressionSchema,
            outcomeBands: { type: "array", items: bandSchema },
          },
          required: ["expression", "outcomeBands"],
        },
        sourceRecordIds: { type: "array", items: idSchema },
        suggestedActions: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: textSchema,
        },
      },
    },
  ],
} as const;

export class AdventureTurnGenerationService {
  private readonly interactions = new Map<string, AdventureInteraction>();

  constructor(
    private readonly aiClient: AdventureAIClient = defaultAiClientManager,
  ) {}

  private getInteraction(sessionId: string): AdventureInteraction {
    let interaction = this.interactions.get(sessionId);
    if (!interaction) {
      interaction = {
        previousInteractionId: null,
        tracker: new LoreDeltaTracker(),
        successfulTurns: 0,
      };
      this.interactions.set(sessionId, interaction);
    }
    return interaction;
  }

  /** Drops retained provider context after an uncommitted or ended session. */
  clearInteraction(sessionId: string): void {
    this.interactions.delete(sessionId);
  }

  private buildInteractionInput(
    prompt: ReturnType<typeof buildAdventurePrompt>,
    interaction: AdventureInteraction,
    responseRepair?: string,
  ): {
    input: string;
    sourceEntries: Array<{ id: string; snippet: string; hash: string }>;
  } {
    const seen = new Set<string>();
    const sourceEntries = [...prompt.anchors, ...prompt.relevant].flatMap(
      (source) => {
        if (seen.has(source.recordId)) return [];
        seen.add(source.recordId);
        const snippet = JSON.stringify(source);
        return [
          {
            id: source.recordId,
            snippet,
            hash: entityContentHash(snippet),
          },
        ];
      },
    );
    const partition = interaction.tracker.partition(sourceEntries);
    const sentIds = new Set(partition.newOrChanged.map((source) => source.id));
    const payload = JSON.parse(prompt.serialized) as Record<string, unknown>;

    payload.anchors = prompt.anchors.filter((source) =>
      sentIds.has(source.recordId),
    );
    payload.relevant = prompt.relevant.filter((source) =>
      sentIds.has(source.recordId),
    );
    if (partition.unchanged.length > 0) {
      payload.retainedSourceIds = partition.unchanged.map(
        (source) => source.id,
      );
    }
    if (responseRepair) payload.responseRepair = responseRepair;

    return { input: JSON.stringify(payload), sourceEntries };
  }

  private async generateViaInteraction(
    request: AdventureTurnGenerationRequest,
    prompt: ReturnType<typeof buildAdventurePrompt>,
    systemInstruction: string,
    options: { modelName?: string; signal?: AbortSignal },
  ): Promise<AdventureTurnProposal> {
    const sendInteraction = this.aiClient.sendInteraction;
    if (!sendInteraction) throw new Error("interaction-client-unavailable");

    const interaction = this.getInteraction(request.session.id);
    if (interaction.successfulTurns >= CONTEXT_REFRESH_TURNS) {
      interaction.tracker.reset();
      interaction.successfulTurns = 0;
    }

    const send = async (
      previousInteractionId: string | null,
      responseRepair?: string,
    ) => {
      const { input, sourceEntries } = this.buildInteractionInput(
        prompt,
        interaction,
        responseRepair,
      );
      const result = await sendInteraction.call(this.aiClient, {
        model: options.modelName ?? "luna-fast",
        input,
        systemInstruction,
        previousInteractionId,
        generationConfig: { responseMimeType: "application/json" },
        signal: options.signal ?? request.signal,
      });
      return { result, sourceEntries };
    };

    try {
      const { result, sourceEntries } = await send(
        interaction.previousInteractionId,
      );
      interaction.previousInteractionId = result.id;
      interaction.tracker.commit(sourceEntries);
      try {
        const proposal = parseAdventureResponse(result.text);
        interaction.successfulTurns += 1;
        return proposal;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== "invalid-adventure-response"
        ) {
          throw error;
        }
        const repaired = await send(
          interaction.previousInteractionId,
          "Your previous response was invalid. Return a corrected response that strictly matches the requested JSON schema. Do not add commentary or markdown.",
        );
        interaction.previousInteractionId = repaired.result.id;
        interaction.tracker.commit(repaired.sourceEntries);
        const proposal = parseAdventureResponse(repaired.result.text);
        interaction.successfulTurns += 1;
        return proposal;
      }
    } catch (error) {
      if (!(error instanceof InteractionExpiredError)) throw error;

      // The provider's retention window has elapsed. Rebuild a complete
      // context turn once, then continue with incremental source delivery.
      interaction.previousInteractionId = null;
      interaction.tracker.reset();
      const { result, sourceEntries } = await send(null);
      interaction.previousInteractionId = result.id;
      interaction.tracker.commit(sourceEntries);
      interaction.successfulTurns = 1;
      return parseAdventureResponse(result.text);
    }
  }

  /**
   * Adventure streaming uses the standard structured-generation SSE path.
   * The Interactions endpoint currently buffers complete JSON, so when
   * streaming is available we send a self-contained prompt (recent transcript,
   * world state and selected Vault sources) rather than a delta interaction.
   */
  private async generateViaStream(
    request: AdventureTurnGenerationRequest,
    prompt: ReturnType<typeof buildAdventurePrompt>,
    systemInstruction: string,
    options: { apiKey?: string; modelName?: string; signal?: AbortSignal },
  ): Promise<AdventureTurnProposal | null> {
    const signal = options.signal ?? request.signal;
    const model = await this.aiClient.getModel(
      options.apiKey ?? "",
      options.modelName ?? "luna-fast",
      systemInstruction,
    );
    const streamModel = model as typeof model & {
      generateContentStream?: (
        input: unknown,
        signal?: AbortSignal,
      ) => AsyncIterable<AdventureStreamEvent> | Promise<AdventureStream>;
    };
    if (!streamModel.generateContentStream) return null;
    // The streamed request is self-contained; stale Interactions state is
    // never reused after switching transport.
    this.clearInteraction(request.session.id);
    const input = {
      contents: [{ role: "user", parts: [{ text: prompt.serialized }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: adventureTurnResponseSchema,
      },
    };
    streamAborted(signal);
    const stream = await streamModel.generateContentStream(input, signal);
    const buffer = await collectAdventureStream(
      stream,
      (text) => {
        if (signal?.aborted) return;
        const narration = extractAdventureNarrationPrefix(text);
        if (
          narration &&
          detectHiddenTextLeakage(request.session, narration).length === 0
        ) {
          request.onNarration?.(narration);
        }
      },
      signal,
    );
    return parseAdventureResponse(buffer);
  }

  private async generateBuffered(
    request: AdventureTurnGenerationRequest,
    prompt: ReturnType<typeof buildAdventurePrompt>,
    systemInstruction: string,
    options: { apiKey?: string; modelName?: string; signal?: AbortSignal },
  ): Promise<AdventureTurnProposal> {
    if (this.aiClient.sendInteraction) {
      return this.generateViaInteraction(
        request,
        prompt,
        systemInstruction,
        options,
      );
    }
    const model = await this.aiClient.getModel(
      options.apiKey ?? "",
      options.modelName ?? "luna-fast",
      systemInstruction,
    );
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt.serialized }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: adventureTurnResponseSchema,
      },
    });
    streamAborted(options.signal ?? request.signal);
    return parseAdventureResponse(result.response.text());
  }

  async generate(
    request: AdventureTurnGenerationRequest,
    options: { apiKey?: string; modelName?: string; signal?: AbortSignal } = {},
  ): Promise<AdventureTurnProposal> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("offline");
    }
    const signal = options.signal ?? request.signal;
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const prompt = buildAdventurePrompt(request);
    const systemInstruction =
      prompt.behavior +
      "\n\nReturn only valid JSON that matches this response schema:\n" +
      JSON.stringify(adventureTurnResponseSchema);

    if (request.onNarration) {
      const streamed = await this.generateViaStream(
        request,
        prompt,
        systemInstruction,
        options,
      );
      if (streamed) return streamed;
    }

    return this.generateBuffered(request, prompt, systemInstruction, options);
  }
}

export const adventureTurnGenerationService =
  new AdventureTurnGenerationService();
