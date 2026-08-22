import { aiClientManager as defaultAiClientManager } from "./client-manager";
import { OUTCOME_BANDS, type OutcomeBandId } from "schema";

/**
 * AI participation in a faction turn.
 *
 * Two bounded jobs: pick the final outcome band from within the range the
 * mechanics permitted, and write the account the GM reads. It never sets a
 * magnitude, never touches a stat or relationship, and never decides whether a
 * faction may act.
 *
 * **This service never rejects.** That is the one hard difference from
 * `adventure-turn-generation.service.ts`, which throws `invalid-adventure-response`
 * on malformed output. FR-021d requires that a turn is never blocked by AI, so
 * every failure mode here — unreachable provider, timeout, rate limit,
 * unparseable JSON, a band outside the permitted range — collapses to the same
 * benign result and the mechanical outcome stands. A rejected promise from
 * `generate()` is a contract violation, not an error to handle upstream.
 */

/**
 * How long to wait for the provider before falling back to the mechanical band
 * and template narration.
 *
 * THIS IS THE ONE PLACE TO CHANGE THE TIMEOUT. It is deliberately a named export
 * rather than an inline default, so retuning it is a one-line edit that grep
 * finds immediately.
 *
 * 8s rationale: oracle-proxy allows providers up to 60s for long generative
 * work, which is far too long to block a GM mid-turn. A band choice plus two
 * sentences is a small completion; 8s covers a normal round trip with headroom
 * while the interaction still feels synchronous.
 */
export const FACTION_AI_TIMEOUT_MS = 8000;

export interface FactionAiResolutionContext {
  actingLabel: string;
  actingValue: number;
  opposingValue: number;
  oppositionDetail: string;
  rollTotal: number | null;
  total: number;
  mechanicalBand: OutcomeBandId;
  permittedBands: OutcomeBandId[];
}

/** Additional participant context, included only after the GM opts in. */
export interface FactionAiParticipantLore {
  aliases: string[];
  lore: string;
  connections: {
    entityTitle: string;
    type: string;
    strength: number;
  }[];
}

export interface FactionTurnAiRequest {
  factionTitle: string;
  factionSummary: string;
  targetTitle: string;
  targetSummary: string;
  /**
   * Bounded participant details explicitly opted into in vault settings.
   * Omitted by default so the normal request remains names plus summaries.
   */
  participantLore?: {
    faction: FactionAiParticipantLore;
    target: FactionAiParticipantLore;
  };
  resolution: FactionAiResolutionContext;
  existingHold: { factionTitle: string; strength: number }[];
  /** FR-021f — independently switchable from narration. */
  wantBandSelection: boolean;
  wantNarration: boolean;
  signal?: AbortSignal;
}

export interface FactionTurnAiResult {
  /** `null` when unavailable, disabled, or unusable. */
  band: OutcomeBandId | null;
  reason: string | null;
  /** `null` means the caller should use the local template. */
  narrative: string | null;
  aiUsed: boolean;
}

const EMPTY_RESULT: FactionTurnAiResult = {
  band: null,
  reason: null,
  narrative: null,
  aiUsed: false,
};

export interface FactionAiClient {
  getModel(
    apiKey: string,
    modelName: string,
    systemInstruction?: string,
  ): Promise<{
    generateContent(input: unknown): Promise<{ response: { text(): string } }>;
  }>;
}

/**
 * The response schema forwarded to the provider.
 *
 * `band` is deliberately **optional**: a model declining to move the band is a
 * normal outcome, not an error. Note also that this schema cannot enforce
 * FR-021a's range — "within one band of a value computed this turn" is per-turn
 * data, not a static constraint — so `applyAiBand` in faction-engine remains the
 * enforcement point.
 */
const factionTurnResponseSchema = {
  type: "object",
  required: ["narrative"],
  properties: {
    band: { type: "string", enum: [...OUTCOME_BANDS] },
    reason: { type: "string", maxLength: 240 },
    narrative: { type: "string", minLength: 1, maxLength: 600 },
  },
} as const;

function buildSystemInstruction(request: FactionTurnAiRequest): string {
  const bands = request.resolution.permittedBands.join(", ");
  return [
    "You narrate the outcome of a faction's action in a tabletop campaign.",
    "",
    "The dice have already been rolled and the rules have already decided an outcome.",
    `The mechanical outcome is "${request.resolution.mechanicalBand}".`,
    request.wantBandSelection
      ? `You may move it at most one step, but only to one of: ${bands}. If you move it, give a short reason drawn from the situation — never from the dice. If the mechanical outcome already fits, leave it alone.`
      : "Do not change the outcome. Narrate the mechanical outcome exactly as given.",
    "",
    "Write two or three sentences of plain, readable prose describing what happened.",
    "Do not mention dice, totals, bands, or any game mechanic.",
    "Do not invent entities, dates, or numbers that were not given to you.",
    "",
    "Return only valid JSON matching this schema:",
    JSON.stringify(factionTurnResponseSchema),
  ].join("\n");
}

function buildPrompt(request: FactionTurnAiRequest): string {
  const { resolution } = request;
  const holds = request.existingHold.length
    ? request.existingHold
        .map((h) => `- ${h.factionTitle} holds it at strength ${h.strength}`)
        .join("\n")
    : "- Nobody currently holds it.";
  const participantLore = request.participantLore
    ? [
        "",
        "Additional participant lore (use only as campaign context):",
        formatParticipantLore(
          "Acting faction",
          request.participantLore.faction,
        ),
        formatParticipantLore("Target", request.participantLore.target),
      ].join("\n")
    : "";

  return [
    `Acting faction: ${request.factionTitle}`,
    request.factionSummary ? `About them: ${request.factionSummary}` : "",
    "",
    `Target: ${request.targetTitle}`,
    request.targetSummary ? `About it: ${request.targetSummary}` : "",
    "",
    "Who already holds the target:",
    holds,
    "",
    `They brought ${resolution.actingLabel} ${resolution.actingValue} against resistance ${resolution.opposingValue}.`,
    resolution.oppositionDetail,
    resolution.rollTotal !== null
      ? `They rolled ${resolution.rollTotal}, for a total of ${resolution.total}.`
      : "No dice were used; this was resolved by comparison alone.",
    participantLore,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatParticipantLore(
  label: string,
  participant: FactionAiParticipantLore,
): string {
  const connections = participant.connections.length
    ? participant.connections
        .map(
          (connection) =>
            `- ${connection.entityTitle}: ${connection.type} (strength ${connection.strength})`,
        )
        .join("\n")
    : "- No recorded outgoing connections.";

  return [
    `${label} aliases: ${participant.aliases.join(", ") || "None recorded."}`,
    participant.lore ? `${label} lore: ${participant.lore}` : "",
    `${label} connections:\n${connections}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function isOutcomeBand(value: unknown): value is OutcomeBandId {
  return (
    typeof value === "string" &&
    (OUTCOME_BANDS as readonly string[]).includes(value)
  );
}

function parseResponse(
  text: string,
  wantBandSelection: boolean,
): FactionTurnAiResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return EMPTY_RESULT;
  }
  if (!raw || typeof raw !== "object") return EMPTY_RESULT;

  const record = raw as Record<string, unknown>;

  const narrative =
    typeof record.narrative === "string" && record.narrative.trim().length > 0
      ? record.narrative.trim()
      : null;

  // Band and narration are independent: a usable account with an unusable band
  // keeps the account and falls back on the band.
  const band =
    wantBandSelection && isOutcomeBand(record.band) ? record.band : null;
  const reason =
    typeof record.reason === "string" && record.reason.trim().length > 0
      ? record.reason.trim()
      : null;

  return {
    band,
    reason,
    narrative,
    aiUsed: band !== null || narrative !== null,
  };
}

export interface FactionTurnGenerationDeps {
  client?: FactionAiClient;
  timeoutMs?: number;
  apiKey?: string;
  modelName?: string;
}

export class FactionTurnGenerationService {
  constructor(private deps: FactionTurnGenerationDeps = {}) {}

  async generate(request: FactionTurnAiRequest): Promise<FactionTurnAiResult> {
    // Nothing wanted, so nothing is sent. This is also the privacy guarantee:
    // with both switches off no faction or target data leaves the device.
    if (!request.wantBandSelection && !request.wantNarration) {
      return EMPTY_RESULT;
    }

    const client =
      this.deps.client ??
      (defaultAiClientManager as unknown as FactionAiClient);
    const timeoutMs = this.deps.timeoutMs ?? FACTION_AI_TIMEOUT_MS;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort();
    request.signal?.addEventListener("abort", abortFromCaller);

    try {
      const model = await client.getModel(
        this.deps.apiKey ?? "",
        this.deps.modelName ?? "luna-fast",
        buildSystemInstruction(request),
      );

      const result = await Promise.race([
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: buildPrompt(request) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: factionTurnResponseSchema,
          },
        }),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () =>
            reject(new Error("faction-ai-timeout")),
          );
        }),
      ]);

      if (controller.signal.aborted) return EMPTY_RESULT;
      return parseResponse(result.response.text(), request.wantBandSelection);
    } catch {
      // Every failure is the same non-event from the GM's side: the mechanical
      // band stands and the template narrates. Deliberately swallowed rather
      // than surfaced — an error toast on a turn that resolved correctly would
      // be noise, and FR-021d forbids blocking the turn either way.
      return EMPTY_RESULT;
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}

/** Class plus singleton, per Constitution VIII. */
export const factionTurnGenerationService = new FactionTurnGenerationService();
