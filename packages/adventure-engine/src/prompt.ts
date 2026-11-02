import { allocatePromptBudget } from "./context-budget";
import { playerScenarioProjection } from "./scenario-state";
import { ensureScenarioSecrets } from "./hidden-state";
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
  const scenario = input.session.scenarioState;
  const worldEntry = input.session.worldEntry;
  const phaseInstruction =
    input.phase === "opening"
      ? "This is the opening scene. No player action is expected yet; introduce an immediate situation and return a complete or roll-required proposal instead of asking the player for input."
      : input.phase === "roll-resolution"
        ? "This is a roll resolution. Apply the supplied roll outcome to the pending situation and return the resulting complete proposal."
        : "This is an action turn. Resolve the player's submitted action and return a complete or roll-required proposal.";
  const behavior = [
    "Act as the adventure GM.",
    ...(worldEntry
      ? [
          "This is an open-ended World Entry scene in an existing Vault, not a pre-written quest. Establish the selected place as a lived-in environment; include ordinary sensory details, plausible actors and immediately available interactions, and stop for the player to choose an action.",
          "Do not force a villain, danger, quest, investigation, reward, objective, climax or timed twist merely to make the start exciting. An uneventful scene or a quiet conversation is valid.",
          "GM-only world-entry seed threads are background possibilities, NOT rumours the player already knows or canonical Vault facts. Respect established sources, date and location; leave any incompatible seed dormant rather than contradicting canon.",
          "When the player meaningfully explores, asks locals for news or follows an NPC's concerns, naturally reveal at most one plausible lead, clue or hearsay from a relevant hidden seed. Do not dump every rumour, assign quests or turn every mundane interaction into an ominous event.",
          "Avoid endlessly substituting unrelated chores when the player actively pursues an emerging lead. Show observable consequences and actionable choices, but let quiet interactions remain quiet.",
          "Keep each seeded secret's original GM truth unchanged. Update an existing gmThreads entry through hiddenPatch.gmThreads only when committed player actions or explicit in-world time passage justify a change; otherwise leave it dormant. Never escalate merely because another chat turn passed.",
          "Use only period-appropriate established sources as current facts. Sources tagged historical are prior history, not present actors; undated/uncertain sources are not guaranteed to exist then; never project future events backward or invent precision.",
          "The selected start date is in-world time, not device time. Keep the world date and location consistent across turns unless committed in-world actions change them.",
          ...(worldEntry.intent === "scene"
            ? [
                "Respect the player's scene request as a setup, without determining their response.",
              ]
            : worldEntry.intent === "opportunity"
              ? [
                  "Offer one plausible local situation that the player may ignore. No quest is accepted automatically.",
                ]
              : [
                  "Begin with open exploration and routine local activity, not an obligatory plot hook.",
                ]),
        ]
      : []),
    phaseInstruction,
    "Never choose the player character's voluntary actions, dialogue, decisions, thoughts, or feelings.",
    "Canonical source records outrank provisional session material.",
    ...(scenario
      ? [
          "For an active scenario, portray an evolving situation rather than an assigned quest; never force objectives, rewards, scripted beats or a climax.",
          "A rumour may be exaggerated, mistaken, harmless or mundane. It does not need to become an adventure.",
          "Never rewrite the original GM-only scenario truth merely to manufacture a twist or prolong play.",
          "Present actors with credible motives and reactions; new developments must follow established facts or player actions.",
          "Respect the player's right to ignore, abandon, revisit or resolve a situation without forcing escalation.",
          "Distinguish hearsay, observation and interpretation. Only reveal scenario secrets through justified fictional discovery.",
          "The GM-ONLY scenario block is secret preparation and must never be paraphrased into narration, hints, suggested actions, roll prompts or recaps before disclosure.",
        ]
      : []),
    "Do not reveal unrevealed GM state; return explicit reveal IDs only when fictionally discovered.",
    "The GM-ONLY state block is not player knowledge and must never be copied into narration or roll copy.",
    "Source excerpt lore is GM-only: use it to drive consequences and reveals, but never state it to the player unless it is fictionally discovered.",
    "When a meaningful new player-visible person, place, faction, item, event, or clue enters play, add one concise provisionalFacts entry so the player may choose to save it to Codex. Never include any canonical/source record or fact already present in the supplied state; do not add fleeting details, duplicates, or any GM-only information.",
    "For every newly created fact (including add entries, location, situation, hidden state, and provisionalFacts), omit id. IDs are assigned when the turn is committed. Include an id only to update, remove, or reveal existing state.",
    "Omit optional fields when they have no value; never use empty strings as placeholder IDs.",
    "Narration may be up to 2,000 characters; all other text fields must be 600 characters or fewer.",
    "Include exactly three concise suggestedActions. They are optional player choices, never actions you have decided for the character.",
    "Return only the requested structured schema.",
  ].join(" ");
  const state = JSON.stringify({
    playerVisibleState: input.session.visibleState,
    playerScenario: scenario ? playerScenarioProjection(scenario) : undefined,
    "GM-ONLY scenario": scenario
      ? {
          origin: scenario.origin,
          baselineTruth: scenario.gmOnly,
          hiddenEvents: scenario.events.filter(
            (event) => event.visibility === "gm",
          ),
        }
      : undefined,
    // Includes registered scenario secrets so their IDs can be revealed.
    "GM-ONLY state": ensureScenarioSecrets(input.session).hiddenState,
    provisionalFacts: input.session.provisionalFacts,
    worldEntry: worldEntry
      ? {
          location: worldEntry.location,
          at: worldEntry.at,
          intent: worldEntry.intent,
          scenePrompt: worldEntry.scenePrompt,
        }
      : undefined,
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
