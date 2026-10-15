/**
 * Gameplay rules shared by the single-call prompt, the staged prompts and the
 * review, so the three never drift apart. The playability checks in
 * `one-shot-integrity.ts` look for the same things.
 */

/** What each emphasis must deliver as play, not just as theme. */
export const EMPHASIS_HINT: Record<string, string> = {
  Action:
    "at least half the scenes after the opening are combat or hazard, with enemy tactics, battlefield hazards and shifting conditions, and objectives beyond defeating the enemy",
  "Investigation / mystery":
    "most scenes turn on concrete evidence the players can examine, at least two plausible suspects or theories, and deductions the players make themselves. At least one discovery complicates or overturns the obvious theory instead of confirming it",
  Intrigue:
    "most scenes are social: at least two factions with competing interests, leverage the party can gain and spend, and factions that react to what the party does",
  Survival:
    "most scenes are hazards and hard choices about named, scarce resources (food, light, water, ammunition) that run down, a threat that escalates, and trade-offs where every option costs something",
  Exploration:
    'most scenes are about routes, discoveries and the place itself. The scenes form a small map, not a corridor: at least one scene leads to two others by different routes with different risks and finds ("next" lists both); at least one optional location holds a reward, a shortcut or useful information; each location has a landmark the players can steer by; and a discovery in one scene opens or closes a route in another',
};

export const CLOCK_RULE =
  'ONE clock with two drivers: a schedule that advances it whatever the party does (at the end of each essential scene, or at fixed moments in the fiction such as each sunset), and risky choices (failing a challenge, forcing a route) that advance it sooner or add a complication. Cautious play must never stop it, and clever shortcuts are not punished more than failure. 3–6 ticks; "deadline" is what happens at the last tick, the only irreversible step. Count the schedule along the essential scenes: a party that plays carefully reaches the finale, and can finish it, with at least one tick to spare, so only failure or delay sets off the deadline. If the fiction counts something (bell notes, nights, seals), that count IS the ticks and the numbers match. If the threat began before the adventure (the bell already rang), the clock starts on a later tick; say which in "advances".';

export const ENDINGS_RULE =
  "At least two endings, each reached by a different player decision. If two endings share an action (both break the seal), the condition says exactly what decides between them (for example, whether the captive consented first). Each consequence says what changes afterwards and differs from the others; a partial ending says exactly what was won, what was lost and what agreement or danger remains. Characters who can choose for themselves (a captive, a spirit, an ally) have their own wishes: the party earns their choice and never simply dictates it.";

export const COMMITMENT_RULE =
  "Anything the briefing blames for the crisis (a broken rite, a missing object) matters to the solution, or the briefing says why it no longer does. Anyone the hook says is in danger can be saved during the adventure, in a named scene and at a cost; no rescue is left until after the session. If an NPC moves between locations, the scene says how they got there.";

/** Where people and important objects are, scene by scene. */
export const CONTINUITY_RULE =
  'Each named NPC and important object (a cart, a relic, a key) is in one place at a time. Before writing a scene, check where each one was last: someone free and present in one scene cannot be trapped, missing or captive in the next unless a scene says how it happened, and an object left behind is still there. Conditional text ("if the party never rescued them") matches where they actually were. If two scenes need the same kind of person in different places, use two named people.';

/** What a finale requirement is, so only clues are expected before it. */
export const REQUIREMENT_RULE =
  'Each finale requirement has a "kind": "clue" for information the party must learn before the finale (found in an earlier essential scene), "action" for something the party does or wins, possibly in the finale itself (its sceneIds say where), or "outcome" for a result of the finale, such as consent given or a restoration made. List outcomes in endings rather than requirements where you can.';

export const PACING_RULE =
  'Never restate time in prose (no "Act I: 40 minutes"); scene "minutes" are the only time budget.';

/**
 * The facts the checks rely on are given as data, not only prose, so code can
 * count and compare them. The text around them is still the model's to write.
 */
export const CLOCK_DATA_RULE =
  '"schedule" lists, in order, the moments the clock advances whatever the party does, from: "start", "scene-end" (the end of every essential scene before the finale), "scene-end-after-opening", "finale-start", "finale-middle", "timed" (a fixed moment in the story, such as each sunset). Do not write the count of ticks in prose; "ticks" has at least two more entries than the schedule advances before the finale. Set "startsAt" (2–6) only if the threat began before play. "pushes" says what else moves it on (failures, rests) or complicates things (shortcuts). "advances" is written from the schedule and may be left empty.';

export const WHEREABOUTS_RULE =
  '"whereabouts" on each scene says where each NPC and important object is as it begins: "who" is an NPC id or an object\'s name, "kind" is "npc" or "object", "state" is one of free, hiding, hostile, here, trapped, captive, missing, and "where" is the place. Whenever someone goes between free and trapped, captive or missing, or an object changes place, "how" says how, in that scene. A scene never lists someone as trapped or missing unless an earlier scene or its own "how" explains it.';

export const ROUTES_RULE =
  '"routes" on a scene with more than one scene in "next" says what each way onward risks ("risk") and what it finds ("find"), and the routes differ.';

export const THEORIES_RULE =
  '"theories" (mysteries): 2–3 explanations the players might hold, each with "id", "name", "summary" and "isTrue" (exactly one is true); mark the one they will reach for first "obvious": true. Each clue lists the theory ids it "supports" and "contradicts". At least one clue contradicts the obvious theory, at least two support the true one, and every theory is backed or ruled out by something.';

export const DECISIONS_RULE =
  '"decisions" are 2–4 yes-or-no choices the party makes, each with "id" and "question". A decision that matters only after an earlier answer has "when" (for example { "pact": true }), and is then not counted otherwise: put the main path first (old binding, new pact, release) and ask about consent only on the pact path. Each ending has "requires": an object of decision id to true or false. Every combination of answers must lead to exactly one ending, so the endings between them cover all of them; an ending with no "requires" is the result for anything else.';

export const THREAD_DATA_RULE =
  'Each thread has "kind" ("rescue", "rule", "history", "promise" or "protect") and "about" (the NPC id, or the object\'s name, it concerns). A rescue is about an NPC who is trapped, captive or missing in a scene. "protect" is for people who are safe but depend on the outcome (sick children, a village that needs the cure): no scene has to show them in danger.';

export const RESOURCE_RULE =
  '"resources" (Survival, 2–4): each has "id", "name" (food, light, warmth), "start" (boxes the party has, 2–9), "unit" (what one box stands for), "spends" (each with "sceneId", "what" and "amount" in boxes) and "whenEmpty". Resources are spent in at least two scenes, so a choice in scene 1 changes what is possible in scene 3, and the boxes a careful party must spend before the finale stay below the start. Never leave the GM to invent how much the party has.';
