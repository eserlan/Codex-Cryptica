import { allocatePromptBudget } from "./context-budget";
import type {
  AdventureSession,
  ResolvedSourceExcerpt,
  SuppliedRollOutcome,
} from "./types";

export interface AdventurePromptInput {
  session: AdventureSession;
  playerAction?: string;
  rollResolution?: SuppliedRollOutcome;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
}

export function buildAdventurePrompt(input: AdventurePromptInput) {
  const behavior = [
    "Act as the adventure GM.",
    "Never choose the player character's voluntary actions, dialogue, decisions, thoughts, or feelings.",
    "Canonical source records outrank provisional session material.",
    "Do not reveal unrevealed GM state; return explicit reveal IDs only when fictionally discovered.",
    "The GM-ONLY state block is not player knowledge and must never be copied into narration or roll copy.",
    "Return only the requested structured schema.",
  ].join(" ");
  const state = JSON.stringify({
    playerVisibleState: input.session.visibleState,
    "GM-ONLY state": input.session.hiddenState,
    provisionalFacts: input.session.provisionalFacts,
  });
  return allocatePromptBudget({
    behavior,
    state,
    input: JSON.stringify({
      playerAction: input.playerAction,
      rollResolution: input.rollResolution,
    }),
    anchors: input.anchors,
    relevant: input.relevant,
    transcript: JSON.stringify(
      input.session.turns.slice(-8).map((turn) => ({
        playerAction: turn.playerAction,
        narration: turn.narration,
      })),
    ),
  });
}
