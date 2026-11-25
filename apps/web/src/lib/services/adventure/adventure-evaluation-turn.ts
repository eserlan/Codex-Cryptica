import {
  applyCompletedTurn,
  buildAdventureRecap,
  createPlayerTranscript,
  resolveRecordedRoll,
  type AdventureSession,
  type AdventureTurnProposal,
  type EvaluationTurn,
  type GenerationMetadata,
  type ResolvedSourceExcerpt,
} from "@codex/adventure-engine";
import type { AdventureGenerationInfo } from "@codex/ai-engine";
import type {
  AdventureEvaluationCase,
  AdventureEvaluationStep,
  EvaluationCommit,
  EvaluationProposal,
} from "./adventure-evaluation-model";

const GENERATION_METADATA_KEYS = [
  "modelKey",
  "reasoningEffort",
  "transport",
  "threadMode",
  "resetReason",
  "directorDelivery",
  "requestChars",
  "sourceCounts",
  "scenarioIds",
] as const;

function generationMetadataFromInfo(
  info: AdventureGenerationInfo | undefined,
): GenerationMetadata | undefined {
  if (!info) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of GENERATION_METADATA_KEYS) {
    if (info[key] !== undefined) out[key] = info[key];
  }
  return out as GenerationMetadata;
}

export function commitProposal(
  session: AdventureSession,
  proposal: EvaluationProposal,
  testCase: AdventureEvaluationCase,
  step: AdventureEvaluationStep,
  index: number,
  commitNow: () => string,
): EvaluationCommit {
  if (proposal.kind !== "complete")
    return { session, failed: false, committed: false };
  const generation = generationMetadataFromInfo(proposal.generationInfo);
  const metadata = {
    turnId: `${testCase.id}-turn-${index + 1}`,
    inputId: `${testCase.id}-input-${index + 1}`,
    now: commitNow(),
    playerAction: step.playerAction,
    ...(generation ? { generation } : {}),
  };
  const committed =
    step.phase === "roll-resolution"
      ? resolveRecordedRoll(session, proposal, metadata)
      : applyCompletedTurn(session, proposal, metadata);
  return committed.ok
    ? { session: committed.value, failed: false, committed: true }
    : { session, failed: true, committed: false };
}

export function makeEvaluationTurn(
  testCase: AdventureEvaluationCase,
  step: AdventureEvaluationStep,
  proposal: AdventureTurnProposal,
  previousSession: AdventureSession,
  session: AdventureSession,
  commitFailed: boolean,
  anchors: ResolvedSourceExcerpt[],
  relevant: ResolvedSourceExcerpt[],
): EvaluationTurn {
  return {
    narration:
      proposal.kind === "complete"
        ? proposal.narration
        : (proposal.setupNarration ?? ""),
    playerCharacterName: testCase.playerCharacterName,
    playerAction: step.playerAction,
    proposal,
    ...(commitFailed ? { commitFailed: true } : {}),
    previousSession,
    session,
    canaries: [
      ...(step.canaries ?? testCase.canaries),
      ...(step.forbiddenNpcKnowledge ?? []),
    ],
    gmOnlyLore: [
      ...(testCase.gmOnlyLore ?? []),
      ...(step.gmOnlyLore ?? []),
      ...anchors.flatMap((anchor) => (anchor.lore ? [anchor.lore] : [])),
      ...relevant.flatMap((excerpt) => (excerpt.lore ? [excerpt.lore] : [])),
    ],
    recap: buildAdventureRecap(session),
    transcript: createPlayerTranscript(session),
  };
}
