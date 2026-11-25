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
  ) => Promise<{ title?: string; summary?: string }>;
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
    generatorId: "quest",
    themeId,
    useAI: true,
    options: {
      genre: candidate.genreHint ?? style?.name ?? "Genre-agnostic",
    },
    instructions: [
      "Return one concise next-adventure pitch grounded only in the selected player-visible hook below.",
      "Use the required quest generator output contract, but keep its summary to one complete sentence and its title short.",
      "Do not add causes, motives, characters, places, or events absent from the hook. Preserve uncertainty; this is a possible direction, not a confirmed fact or mandatory crisis.",
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
  generated: { title?: string; summary?: string },
): EnrichedContinuationResult {
  const nextTitle = generated.title?.trim();
  const nextPremise = generated.summary?.trim();
  if (
    !nextTitle ||
    !nextPremise ||
    nextTitle.length > 100 ||
    nextPremise.length > 320
  ) {
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
