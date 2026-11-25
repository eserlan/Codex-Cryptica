import {
  detectHiddenTextLeakage,
  selectAdventureContinuationCandidates,
  type AdventureContinuationCandidate,
  type AdventureContinuationSet,
  type AdventureSession,
  type SelectContinuationOptions,
} from "@codex/adventure-engine";
import type { GeneratorRunRequest } from "generator-engine/campaign-generator-types";
import { worldStyleForTheme } from "./world-style";

export interface ContinuationServiceDeps {
  generateDraft?: (
    request: GeneratorRunRequest,
    signal?: AbortSignal,
  ) => Promise<{ title?: string; content?: string }>;
  isOnline?: () => boolean;
  aiEnabled?: () => boolean;
}

export interface EnrichedContinuationResult {
  candidate: AdventureContinuationCandidate;
  enriched: boolean;
}

function buildContinuationRequest(
  candidate: AdventureContinuationCandidate,
  themeId: string,
): GeneratorRunRequest {
  const style = worldStyleForTheme(themeId);
  return {
    generatorId: "rumour",
    themeId,
    useAI: true,
    options: {},
    instructions: [
      "Write one short, grounded next-adventure pitch from the player-visible hook below.",
      ...(style ? [`World style: ${style.name}. ${style.description}`] : []),
      "Keep all uncertainty explicit: treat unresolved leads as possibilities, never confirmed conspiracies or mandatory crises.",
      `Anchor type: ${candidate.anchorType}`,
      `Baseline title: ${candidate.playerSafeTitle}`,
      `Baseline premise: ${candidate.playerSafePremise}`,
      `Uncertainty: ${candidate.uncertainty}`,
    ].join("\n"),
    vaultContext: {
      themeId,
      categoryLabels: [],
      applyTemplate: false,
      neighbors: [],
      worldSample: [],
      existingTitles: [],
      labelSuggestions: [],
      includedContext: [],
    },
  };
}

function applySafeEnrichment(
  session: AdventureSession,
  candidate: AdventureContinuationCandidate,
  generated: { title?: string; content?: string },
): EnrichedContinuationResult {
  const nextTitle = generated.title?.trim().slice(0, 120);
  const nextPremise = generated.content?.trim().slice(0, 320);
  if (!nextTitle || !nextPremise) {
    return { candidate, enriched: false };
  }
  if (
    detectHiddenTextLeakage(session, nextTitle).length > 0 ||
    detectHiddenTextLeakage(session, nextPremise).length > 0
  ) {
    return { candidate, enriched: false };
  }
  return {
    candidate: {
      ...candidate,
      playerSafeTitle: nextTitle,
      playerSafePremise: nextPremise,
    },
    enriched: true,
  };
}

/**
 * Builds deterministic player-safe continuation pitches and optionally
 * polishes a chosen pitch via the existing generator gateway with full
 * offline/error fallback and secrecy validation.
 */
export class AdventureContinuationService {
  constructor(private readonly deps: ContinuationServiceDeps = {}) {}

  buildCandidates(
    session: AdventureSession,
    options: SelectContinuationOptions = {},
  ): AdventureContinuationSet {
    return selectAdventureContinuationCandidates(session, options);
  }

  async enrichCandidate(
    session: AdventureSession,
    candidate: AdventureContinuationCandidate,
    themeId = "workspace",
    signal?: AbortSignal,
  ): Promise<EnrichedContinuationResult> {
    signal?.throwIfAborted();
    const online =
      this.deps.isOnline?.() ??
      (typeof navigator === "undefined" || navigator.onLine);
    const enabled = this.deps.aiEnabled?.() ?? true;
    if (!this.deps.generateDraft || !enabled || !online) {
      return { candidate, enriched: false };
    }

    try {
      const generated = await this.deps.generateDraft(
        buildContinuationRequest(candidate, themeId),
        signal,
      );
      signal?.throwIfAborted();
      return applySafeEnrichment(session, candidate, generated);
    } catch (error) {
      if (signal?.aborted) throw error;
      return { candidate, enriched: false };
    }
  }
}
