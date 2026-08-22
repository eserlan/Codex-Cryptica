import { allocatePromptBudget } from "./context-budget";
import type {
  AdventureSession,
  ResolvedSourceExcerpt,
  SuppliedRollOutcome,
} from "./types";

export interface AdventurePromptInput {
  session: AdventureSession;
  phase: "opening" | "action" | "roll-resolution";
  playerAction?: string;
  rollResolution?: SuppliedRollOutcome;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
}

export function buildAdventurePrompt(input: AdventurePromptInput) {
  const phaseInstruction =
    input.phase === "opening"
      ? "This is the opening scene. No player action is expected yet; introduce an immediate situation and return a complete or roll-required proposal instead of asking the player for input."
      : input.phase === "roll-resolution"
        ? "This is a roll resolution. Apply the supplied roll outcome to the pending situation and return the resulting complete proposal."
        : "This is an action turn. Resolve the player's submitted action and return a complete or roll-required proposal.";
  const behavior = [
    "Act as the adventure GM.",
    phaseInstruction,
    "Never choose the player character's voluntary actions, dialogue, decisions, thoughts, or feelings.",
    "Canonical source records outrank provisional session material.",
    "Do not reveal unrevealed GM state; return explicit reveal IDs only when fictionally discovered.",
    "The GM-ONLY state block is not player knowledge and must never be copied into narration or roll copy.",
    "Source excerpt lore is GM-only: use it to drive consequences and reveals, but never state it to the player unless it is fictionally discovered.",
    "When a meaningful new player-visible person, place, faction, item, event, or clue enters play, add one concise provisionalFacts entry so the player may choose to save it to Codex. Never include any canonical/source record or fact already present in the supplied state; do not add fleeting details, duplicates, or any GM-only information.",
    "Omit optional fields when they have no value; never use empty strings as placeholder IDs.",
    "Narration may be up to 2,000 characters; all other text fields must be 600 characters or fewer.",
    "Include exactly three concise suggestedActions. They are optional player choices, never actions you have decided for the character.",
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
      adventure: {
        title: input.session.title,
        premise: input.session.premise,
        playerCharacter: input.session.playerCharacter,
      },
      phase: input.phase,
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
