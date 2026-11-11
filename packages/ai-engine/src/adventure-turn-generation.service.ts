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
  type AdventureWorldStyle,
  type ResolvedSourceExcerpt,
  type SuppliedRollOutcome,
} from "@codex/adventure-engine";
import { LoreDeltaTracker, entityContentHash } from "@codex/oracle-engine";

/** Stream failures that are safe to retry once as a buffered Interaction. */
const BUFFERED_FALLBACK_ERRORS = new Set([
  "interaction-stream-unavailable",
  "interaction-stream-incomplete",
  "interaction-stream-read-error",
]);

export interface AdventureTurnGenerationRequest {
  session: AdventureSession;
  phase: "opening" | "action" | "roll-resolution";
  playerAction?: string;
  rollResolution?: SuppliedRollOutcome;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  /** Vault genre or theme; plain data so it crosses the worker boundary. */
  worldStyle?: AdventureWorldStyle;
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
    generateContent(
      input: unknown,
      requestOptions?: { signal?: AbortSignal },
    ): Promise<{ response: { text(): string } }>;
  }>;
  sendInteraction?: (params: {
    model: string;
    input: string;
    systemInstruction?: string;
    previousInteractionId?: string | null;
    storeConversation?: boolean;
    generationConfig?: Record<string, unknown>;
    signal?: AbortSignal;
  }) => Promise<{ id: string; text: string }>;
  sendInteractionStream?: (params: {
    model: string;
    input: string;
    systemInstruction?: string;
    previousInteractionId?: string | null;
    generationConfig?: Record<string, unknown>;
    signal?: AbortSignal;
  }) => AsyncIterable<
    | { type: "started" }
    | { type: "delta"; text: string }
    | { type: "complete"; text: string; id: string }
    | { type: "error"; error: string }
  >;
}

interface AdventureInteraction {
  /** Only acknowledged after the local OPFS session commits this proposal. */
  previousInteractionId: string | null;
  tracker: LoreDeltaTracker;
  successfulTurns: number;
  revision: number | null;
  stateSnapshot: Record<string, unknown> | null;
  sourceHashes: Map<string, string>;
  modelName: string | null;
  /** A validated model reply is not necessarily a committed adventure turn. */
  pending: {
    id: string;
    revision: number;
    modelName: string;
    state: Record<string, unknown>;
    sourceEntries: Array<{ id: string; snippet: string; hash: string }>;
  } | null;
}

/** Only changes to the state snapshot are sent while provider history is valid.
 * A null represents removal of an optional top-level field. */
function stateDelta(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
): Record<string, unknown> {
  const delta: Record<string, unknown> = {};
  for (const key of new Set([
    ...Object.keys(previous),
    ...Object.keys(current),
  ])) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      delta[key] = key in current ? current[key] : null;
    }
  }
  return delta;
}

// Continue long stories across many turns; refresh from local state before
// retained provider history becomes excessively large. Expiry and invalid IDs
// independently trigger a fresh conversation at any time.
const CONTEXT_REFRESH_TURNS = 80;

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
    scenarioId: idSchema,
  },
} as const;

const scenarioElaborationSchema = {
  type: "object",
  required: ["scenarioId", "stage"],
  properties: {
    scenarioId: idSchema,
    stage: {
      type: "string",
      enum: ["hearsay", "actionable-clue", "revelation-crisis"],
    },
    discovery: textSchema,
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
        moveTo: {
          type: "object",
          properties: {
            placeId: idSchema,
            name: { ...textSchema, maxLength: 120 },
            relation: textSchema,
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
        revealScenarioIds: { type: "array", items: idSchema },
        elaborateScenarios: { type: "array", items: scenarioElaborationSchema },
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
        revision: null,
        stateSnapshot: null,
        sourceHashes: new Map(),
        modelName: null,
        pending: null,
      };
      this.interactions.set(sessionId, interaction);
    }
    return interaction;
  }

  /** Drops retained provider context after an uncommitted or ended session. */
  clearInteraction(sessionId: string): void {
    this.interactions.delete(sessionId);
  }

  /** Promote a provider interaction only after the adventure repository saved
   * the corresponding validated turn. A generated-but-unsaved reply is discarded. */
  confirmInteraction(sessionId: string, savedRevision?: number): void {
    const interaction = this.interactions.get(sessionId);
    if (!interaction) return;
    const pending = interaction.pending;
    if (!pending) {
      // Dice outcomes, dismissals and other deterministic local saves need
      // no AI turn, but must not break the retained provider conversation.
      // The next request sends these local changes via stateDelta.
      if (
        interaction.previousInteractionId &&
        savedRevision !== undefined &&
        interaction.revision === savedRevision - 1
      )
        interaction.revision = savedRevision;
      return;
    }
    if (savedRevision !== undefined && savedRevision !== pending.revision + 1) {
      this.clearInteraction(sessionId);
      return;
    }
    interaction.previousInteractionId = pending.id;
    interaction.modelName = pending.modelName;
    interaction.revision = pending.revision + 1;
    interaction.stateSnapshot = pending.state;
    interaction.tracker.commit(pending.sourceEntries);
    for (const entry of pending.sourceEntries) {
      interaction.sourceHashes.set(entry.id, entry.hash);
    }
    interaction.successfulTurns += 1;
    interaction.pending = null;
  }

  private buildInteractionInput(
    prompt: ReturnType<typeof buildAdventurePrompt>,
    interaction: AdventureInteraction,
    responseRepair?: string,
  ): {
    input: string;
    state: Record<string, unknown>;
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
    const payload = JSON.parse(prompt.serialized) as Record<string, unknown>;
    const state = JSON.parse(prompt.state) as Record<string, unknown>;
    if (interaction.previousInteractionId && interaction.stateSnapshot) {
      const partition = interaction.tracker.partition(sourceEntries);
      const changed = new Set(partition.newOrChanged.map((entry) => entry.id));
      payload.anchors = prompt.anchors.filter((s) => changed.has(s.recordId));
      payload.relevant = prompt.relevant.filter((s) => changed.has(s.recordId));
      payload.retainedSourceIds = partition.unchanged.map((s) => s.id);
      payload.stateDelta = stateDelta(interaction.stateSnapshot, state);
      delete payload.state;
      // Earlier dialogue is already retained by the provider; on an expired
      // ID, resetting the interaction resends the bounded local transcript.
      delete payload.transcript;
    }
    if (responseRepair) payload.responseRepair = responseRepair;
    return { input: JSON.stringify(payload), state, sourceEntries };
  }

  // fallow-ignore-next-line complexity
  private async generateViaInteraction(
    request: AdventureTurnGenerationRequest,
    prompt: ReturnType<typeof buildAdventurePrompt>,
    systemInstruction: string,
    options: { modelName?: string; signal?: AbortSignal },
  ): Promise<AdventureTurnProposal> {
    const signal = options.signal ?? request.signal;
    const sendInteraction = this.aiClient.sendInteraction;
    const sendStream = this.aiClient.sendInteractionStream;
    if (!sendInteraction && !sendStream)
      throw new Error("interaction-client-unavailable");

    let interaction = this.getInteraction(request.session.id);
    // A revision mismatch means the game was changed by a non-model action,
    // a failed save, or a cancelled turn: rebuild from authoritative OPFS.
    if (
      interaction.pending ||
      (interaction.modelName !== null &&
        interaction.modelName !== (options.modelName ?? "luna-fast")) ||
      (interaction.revision !== null &&
        interaction.revision !== request.session.revision) ||
      interaction.successfulTurns >= CONTEXT_REFRESH_TURNS
    ) {
      this.clearInteraction(request.session.id);
      interaction = this.getInteraction(request.session.id);
    }
    // Provider histories cannot delete earlier source text. A changed
    // canonical record must start a clean thread to avoid stale canon.
    const sources = [...prompt.anchors, ...prompt.relevant];
    if (
      sources.some((source) => {
        const oldHash = interaction.sourceHashes.get(source.recordId);
        return oldHash && oldHash !== entityContentHash(JSON.stringify(source));
      })
    ) {
      this.clearInteraction(request.session.id);
      interaction = this.getInteraction(request.session.id);
    }

    const instruction =
      systemInstruction +
      "\n\nOn continuation requests, stateDelta contains only changed top-level state fields and supersedes your previous state; null deletes a field. The present input and retrieved Vault sources outrank any previous turn. Never reveal GM-only fields.";
    // fallow-ignore-next-line complexity
    const send = async (
      repair?: string,
      preferStream = true,
    ): Promise<{
      id: string;
      text: string;
      state: Record<string, unknown>;
      sourceEntries: Array<{ id: string; snippet: string; hash: string }>;
    }> => {
      streamAborted(signal);
      const prepared = this.buildInteractionInput(prompt, interaction, repair);
      const params = {
        model: options.modelName ?? "luna-fast",
        input: prepared.input,
        systemInstruction: instruction,
        previousInteractionId: interaction.previousInteractionId,
        generationConfig: { responseMimeType: "application/json" },
        signal,
      };
      // Streaming with provider-held history: the proxy returns only
      // player-safe model_output text, never thought/GM-only provider events.
      if (preferStream && request.onNarration && sendStream) {
        try {
          let buffer = "";
          let finalId = "";
          let completed = false;
          for await (const event of sendStream.call(this.aiClient, params)) {
            streamAborted(signal);
            if (event.type === "error") throw new Error(event.error);
            if (event.type === "delta") buffer += event.text;
            if (event.type === "complete") {
              buffer = event.text || buffer;
              finalId = event.id;
              completed = true;
            }
            const narration = extractAdventureNarrationPrefix(buffer);
            if (
              narration &&
              detectHiddenTextLeakage(request.session, narration).length === 0
            ) {
              request.onNarration(narration);
            }
          }
          streamAborted(signal);
          if (!completed || !finalId)
            throw new Error("interaction-stream-incomplete");
          return { ...prepared, id: finalId, text: buffer };
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !BUFFERED_FALLBACK_ERRORS.has(error.message) ||
            !sendInteraction
          )
            throw error;
          streamAborted(signal);
          // Old proxy / provider does not support conversation SSE yet, or the
          // stream ended before a completed turn (nothing was committed, so
          // the same continuation id is still valid). Buffered Interactions
          // still preserve continuity and JSON mode.
        }
      }
      if (!sendInteraction) throw new Error("interaction-client-unavailable");
      const result = await sendInteraction.call(this.aiClient, params);
      streamAborted(signal);
      return { ...prepared, id: result.id, text: result.text };
    };

    try {
      let result;
      try {
        result = await send();
      } catch (error) {
        if (!(error instanceof InteractionExpiredError)) throw error;
        // Retention expiry: rebuild from current session and local transcript.
        this.clearInteraction(request.session.id);
        interaction = this.getInteraction(request.session.id);
        result = await send();
      }
      let proposal: AdventureTurnProposal;
      try {
        proposal = parseAdventureResponse(result.text);
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== "invalid-adventure-response"
        )
          throw error;
        streamAborted(signal);
        request.onNarration?.("");
        // Retry the same uncommitted action against the *last committed*
        // conversation ID; never chain from an invalid model response.
        result = await send(
          "Previous JSON failed validation. Return a complete corrected JSON proposal with all required fields.",
          !sendInteraction,
        );
        proposal = parseAdventureResponse(result.text);
      }
      streamAborted(signal);
      if (!result.id) throw new Error("interaction-id-missing");
      interaction.pending = {
        id: result.id,
        revision: request.session.revision,
        modelName: options.modelName ?? "luna-fast",
        state: result.state,
        sourceEntries: result.sourceEntries,
      };
      return proposal;
    } catch (error) {
      // Never retain a conversation containing a rejected/aborted output.
      this.clearInteraction(request.session.id);
      throw error;
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
    forceStructuredOutput = false,
  ): Promise<AdventureTurnProposal> {
    streamAborted(options.signal ?? request.signal);
    if (
      this.aiClient.sendInteraction &&
      !options.apiKey &&
      !forceStructuredOutput
    ) {
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
    const result = await model.generateContent(
      {
        contents: [{ role: "user", parts: [{ text: prompt.serialized }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: adventureTurnResponseSchema,
        },
      },
      { signal: options.signal ?? request.signal },
    );
    streamAborted(options.signal ?? request.signal);
    return parseAdventureResponse(result.response.text());
  }

  // fallow-ignore-next-line complexity
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

    // System-proxy requests use provider-managed history by default. Custom
    // API keys remain on the stateless direct-SDK path, without cloud storage.
    let fallbackToStateless = false;
    if (
      !options.apiKey &&
      (this.aiClient.sendInteraction || this.aiClient.sendInteractionStream)
    ) {
      try {
        return await this.generateViaInteraction(
          request,
          prompt,
          systemInstruction,
          options,
        );
      } catch (error) {
        const reason =
          error instanceof Error ? error.message.toLowerCase() : "";
        if (
          !/interaction-client-unavailable|interaction-stream-unavailable|interaction.*(?:unsupported|not supported|not available)/.test(
            reason,
          )
        )
          throw error;
        // Providers that cannot store conversations retain the original
        // stateless structured streaming path. No remote ID is persisted.
        this.clearInteraction(request.session.id);
        fallbackToStateless = true;
      }
    }

    if (request.onNarration) {
      try {
        const streamed = await this.generateViaStream(
          request,
          prompt,
          systemInstruction,
          options,
        );
        if (streamed) return streamed;
      } catch (error) {
        // A complete stream can still contain malformed JSON or a response
        // that violates the turn schema. Retry once with the provider's
        // structured output constraint; never retry transport or abort errors.
        if (
          !(error instanceof Error) ||
          error.message !== "invalid-adventure-response"
        ) {
          throw error;
        }
        streamAborted(signal);
        // The preview was never committed and may differ from the repaired
        // result. Withdraw it before trying again.
        request.onNarration("");
        return this.generateBuffered(
          request,
          prompt,
          systemInstruction +
            "\n\nThe preceding response was invalid. Regenerate the turn as one complete JSON object matching the supplied schema. Do not include markdown.",
          options,
          true,
        );
      }
    }

    return this.generateBuffered(
      request,
      prompt,
      systemInstruction,
      options,
      fallbackToStateless,
    );
  }
}

export const adventureTurnGenerationService =
  new AdventureTurnGenerationService();
