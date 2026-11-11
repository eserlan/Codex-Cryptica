import { allocatePromptBudget } from "./context-budget";
import { playerScenarioCollectionProjection } from "./scenario-state";
import { ensureScenarioSecrets } from "./hidden-state";
import { worldEntryPacing } from "./world-entry-pacing";
import { projectVisibleState } from "./prompt-state";
import { candidateScenariosForLocation } from "./contextual-rumours";
import type {
  AdventureSession,
  ResolvedSourceExcerpt,
  SuppliedRollOutcome,
} from "./types";

/** The Vault's chosen genre or theme, used to steer the GM's voice. */
export interface AdventureWorldStyle {
  name: string;
  description: string;
}

export interface AdventurePromptInput {
  worldStyle?: AdventureWorldStyle;
  session: AdventureSession;
  phase: "opening" | "action" | "roll-resolution";
  playerAction?: string;
  rollResolution?: SuppliedRollOutcome;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
}

export function buildAdventurePrompt(input: AdventurePromptInput) {
  const scenarios = candidateScenariosForLocation(input.session);
  const focusedScenarioId = input.session.scenarioCollection?.focusedScenarioId;
  const worldEntry = input.session.worldEntry;
  const phaseInstruction =
    input.phase === "opening"
      ? "This is the opening scene. No player action is expected yet; introduce an immediate situation and return a complete or roll-required proposal instead of asking the player for input."
      : input.phase === "roll-resolution"
        ? "This is a roll resolution. Apply the supplied roll outcome to the pending situation and return the resulting complete proposal."
        : "This is an action turn. Resolve the player's submitted action and return a complete or roll-required proposal.";
  const behavior = [
    "Act as the adventure GM.",
    ...(worldEntry ? worldEntryBehavior(worldEntry, input.session) : []),
    phaseInstruction,
    ...worldStyleBehavior(input.worldStyle),
    "Never choose the player character's voluntary actions, dialogue, decisions, thoughts, or feelings.",
    'You are the world, so speak in the fiction. Never say what has or has not been "established", never refer to your own knowledge or to being an AI, and never refuse a harmless question about the scene.',
    "Scene details are yours to decide: when the player asks about, or hands you, a detail nobody has fixed yet (time of day, weather, light, a minor NPC's name, a price, a distance), choose a fitting answer in character and commit it. If the player says you decide, decide. The ban on inventing precise calendar dates does not apply to scene details; keep a detail consistent once chosen.",
    "A character may not know something, but a reply must never be a dead end. Let the NPC offer a name, point to someone or somewhere that knows more, or let the player notice a visible clue. When the player repeats a question about the same unknown, someone present offers a concrete observable clue or safe lead; do not disclose GM-only truths, and reveal scenario secrets only through justified fictional discovery.",
    "Do not repeat the ambient detail (sounds, hearth, cups, weather) used in the previous turn; vary the sensory colour or leave it out. If the last few turns stayed in one scene without new information, change something: someone arrives or leaves, an object or sound draws attention, or an off-screen consequence reaches the scene. Never decide the player's response.",
    "Places: currentPlace is where the player is now and knownPlaces lists the places they have been to; people and facts listed under elsewhere are not here unless the story brings them back. When the player travels to a different place, set moveTo: use placeId for a known place, or name (with a short relation such as \"below Tiny village\") for a new one. Never set moveTo for movement inside the same place, and keep a place's recorded name instead of inventing a variant. People who should travel with the player must appear in this turn's activeCharacters patch.",
    "Canonical source records outrank provisional session material.",
    ...(scenarios.length
      ? [
          "For an active scenario, portray an evolving situation rather than an assigned quest; never force objectives, rewards, scripted beats or a climax.",
          "Progressive elaboration ladder: actively pursued rumours escalate across three bounded stages: hearsay (unverified talk) -> actionable-clue (concrete witness, clue or trail) -> revelation-crisis (core truth uncovered, moral dilemma, active confrontation or urgent consequence). Advance at most one stage per turn using elaborateScenarios.",
          "Voluntary engagement: when the player investigates an emerging lead, consequential actions must advance the situation, reveal a credible witness, expose a discoverable clue, or resolve the matter; avoid endlessly substituting unrelated mundane chores.",
          "Peaceful/off-script: if the player ignores or declines a lead, or pursues ordinary daily life, allow peaceful exploration without forced villains, artificial deadlines, or mandatory combat.",
          "A rumour may be exaggerated, mistaken, harmless or mundane. It does not need to become an adventure.",
          "Never rewrite the original GM-only scenario truth merely to manufacture a twist or prolong play.",
          "Present actors with credible motives and reactions; new developments must follow established facts or player actions.",
          "Respect the player's right to ignore, abandon, revisit or resolve a situation without forcing escalation.",
          "Distinguish hearsay, observation and interpretation. Only reveal scenario secrets through justified fictional discovery.",
          "The GM-ONLY scenario block is secret preparation and must never be paraphrased into narration, hints, suggested actions, roll prompts or recaps before disclosure.",
          "When all scenarios are resolved or abandoned, or when the player pursues everyday life, portray ongoing unscripted world activity, routine tasks, peaceful interactions or travel without manufacturing artificial crises or forcing a new quest.",
        ]
      : []),
    "World time is elapsed fictional minutes since adventure entry, not device time; the chosen Vault date may have only year precision. Never invent a precise calendar date or advance based on chat turn count.",
    "Return timeAdvance only for a completed turn when meaningful fictional time actually passes: waiting, sleeping, travel or an explicitly timed event. Supply whole positive minutes, a causal description and a developments array (possibly empty). Do not advance merely for talking or because another model response occurred.",
    "TimeAdvance developments are GM-ONLY events tied to existing hidden gmThreads or open scenario IDs; describe credible actions or consequences by those actors during the elapsed time. Only generate events consistent with their motives, available time, prior facts and observed actions. Do not force dramatic escalation. Update the same gmThreads through hiddenPatch when its state genuinely changes.",
    "When in-world time passes or the player returns to a location with off-screen consequences, describe the observable aftermath rather than treating the world as frozen, and reveal the consequence secret via revealSecretIds only upon justified discovery.",
    "Never copy timeAdvance.developments into narration, suggested actions or player-visible state unless the player has a justified way to observe the consequences. Do not reveal hidden rumours just because hours passed.",
    "Do not reveal unrevealed GM state; return explicit reveal IDs only when fictionally discovered.",
    "The GM-ONLY state block is not player knowledge and must never be copied into narration or roll copy.",
    "Source excerpts are world knowledge, not proof of character knowledge. Preserve period applicability and uncertainty labels; retrieved secrets or hidden identities are never revealed merely because they were retrieved.",
    "Source excerpt lore is GM-only: use it to drive consequences and reveals, but never state it to the player unless it is fictionally discovered.",
    "When a meaningful new player-visible person, place, faction, item, event, or clue enters play, add one concise provisionalFacts entry (including scenarioId if linked to a scenario) so the player may choose to save it to Codex. Never include any canonical/source record or fact already present in the supplied state; do not add fleeting details, duplicates, or any GM-only information.",
    "For every newly created fact (including add entries, location, situation, hidden state, and provisionalFacts), omit id. IDs are assigned when the turn is committed. Include an id only to update, remove, or reveal existing state.",
    "Omit optional fields when they have no value; never use empty strings as placeholder IDs.",
    "Narration may be up to 2,000 characters; all other text fields must be 600 characters or fewer.",
    "Include exactly three concise suggestedActions. They are optional player choices, never actions you have decided for the character.",
    "Return only the requested structured schema.",
  ].join(" ");
  const state = JSON.stringify({
    playerVisibleState: projectVisibleState(input.session),
    playerScenarios: playerScenarioCollectionProjection(input.session),
    "GM-ONLY scenarios": scenarios.map((scenario) => ({
      id: scenario.id,
      status: scenario.status,
      anchorRefs: scenario.anchorRefs,
      ...(scenario.knowledge === "unheard"
        ? { unheardLead: scenario.playerVisible }
        : {}),
      focused: scenario.id === focusedScenarioId,
      knowledge: scenario.knowledge,
      stage: scenario.stage,
      origin: scenario.origin,
      baselineTruth: scenario.gmOnly,
      ...(scenario.pressure ? { pressure: scenario.pressure } : {}),
      hiddenEvents: scenario.events.filter(
        (event) => event.visibility === "gm",
      ),
      secretBindings: scenario.secretBindings,
      revealedSecretIds: scenario.revealedSecretIds,
    })),
    // Includes registered scenario secrets so their IDs can be revealed.
    "GM-ONLY state": ensureScenarioSecrets(input.session).hiddenState,
    "GM-ONLY fictional time": input.session.worldTime,
    provisionalFacts: input.session.provisionalFacts,
    pendingRoll:
      input.phase === "roll-resolution" ? input.session.pendingRoll : undefined,
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

const MAX_STYLE_TEXT = 300;

function worldStyleBehavior(style?: AdventureWorldStyle): string[] {
  const name = style?.name.replace(/\s+/g, " ").trim().slice(0, 80);
  const description = style?.description
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_STYLE_TEXT);
  if (!name || !description) return [];
  return [
    `World style: the Vault is set in a "${name}" world: ${description} Use this genre's vocabulary, props, institutions and tone in narration and NPC speech, so the world reads as that genre rather than generic fantasy. Stay inside the genre: do not introduce technology, magic or tropes from other genres, and canonical source records still outrank this style.`,
  ];
}

function worldEntryBehavior(
  worldEntry: NonNullable<AdventureSession["worldEntry"]>,
  session: AdventureSession,
): string[] {
  const pacing = worldEntryPacing(session);
  return [
    "This is an open-ended World Entry scene in an existing Vault, not a pre-written quest. Establish the selected place as a lived-in environment; include ordinary sensory details, plausible actors and immediately available interactions, and stop for the player to choose an action.",
    "Do not force a villain, danger, quest, investigation, reward, objective, climax or timed twist merely to make the start exciting. An uneventful scene or a quiet conversation is valid.",
    "GM-only world-entry scenarios are situations already unfolding in the world, NOT rumours the player already knows or canonical Vault facts. Respect established sources, date and location; leave any incompatible seed unnoticed rather than contradicting canon.",
    "A seed can surface in many ways, not only through conversation: physical traces, locals behaving differently, objects or notices, consequences such as closures, shortages, price changes or extra guards, people affected by it, or overheard talk. Choose whatever fits the current scene and the seed's hidden truth.",
    "Signs are small, observable and deniable: show what can be seen or heard, never the GM truth, and never frame a sign as a quest, objective or obligation. The player may ignore it.",
    "For scenarioCollection seeds, knowledge=unheard means unnoticed. When a player-visible sign or hearsay surfaces, include its scenario ID in revealScenarioIds; this atomically marks it heard and records a discovery event. This reveals only the lead, never its GM truth. Advance at most one stage per turn. Legacy gmThreads alone use hiddenPatch.gmThreads for visibility updates.",
    "Candidate rumours and leads are contextual to the player's current location. When the player asks an NPC about local news, gossip or rumours, or looks around for local leads: draw upon a fitting unnoticed seed for the current settlement or scene, and include its scenario ID in revealScenarioIds to record the discovery. Present it strictly as local hearsay or opinion, never as an assigned quest, mission objective or obligation. If no seed fits or the area is quiet, report ordinary peaceful life or that all has been quiet (a meaningful empty result) without inventing forced conflict.",
    "When the player explores, asks around or investigates a sign, naturally reveal at most one further plausible lead, clue or hearsay from the relevant seed. Do not dump every seed, assign quests or turn every mundane interaction into an ominous event.",
    "Avoid endlessly substituting unrelated chores (such as fetching water or fixing windows) when the player actively asks about local news or pursues an emerging lead. Show observable consequences and actionable choices. A quiet conversation may stay quiet, but the surrounding world should still feel lived in.",
    "Keep each seeded secret's original GM truth unchanged. A seed's underlying situation develops only when committed player actions or explicit in-world time passage justify it; otherwise only its visibility changes. Never raise a situation's stakes merely because another chat turn passed.",
    "When a sign is present in the scene, one suggestedAction may invite a closer look at it, phrased as an option, never as accepting a quest. When speaking with locals in a settlement, one suggestedAction may offer asking about local news.",
    ...(pacing?.signDue
      ? [
          `PACING: At least ${pacing.quietTurns} turns have passed without any world-entry seed surfacing. In this turn, weave one small background sign from a fitting unnoticed seed into the scene, and include its scenario ID in revealScenarioIds to record the discovery; for legacy gmThreads use hiddenPatch.gmThreads.`,
        ]
      : []),
    "Use only period-appropriate established sources as current facts. Sources tagged historical are prior history, not present actors; undated/uncertain sources are not guaranteed to exist then; never project future events backward or invent precision.",
    "The selected start date is in-world time, not device time. Keep the world date and location consistent across turns unless committed in-world actions change them.",
    "When the player returns to a previously visited location, reflect established facts, prior conversations, and committed scenario consequences. Do not reset or contradict what has already transpired.",
    ...(worldEntry.intent === "scene"
      ? [
          "Respect the player's scene request as a setup, without determining their response.",
        ]
      : worldEntry.intent === "opportunity"
        ? [
            "Offer one plausible local situation that the player may ignore. No quest is accepted automatically.",
          ]
        : [
            "Begin with open exploration and routine local activity, not an obligatory plot hook. The opening may weave in one small background sign from a seed.",
          ]),
  ];
}
