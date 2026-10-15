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
    "most scenes turn on concrete evidence the players can examine, at least two plausible suspects or theories, and deductions the players make themselves",
  Intrigue:
    "most scenes are social: at least two factions with competing interests, leverage the party can gain and spend, and factions that react to what the party does",
  Survival:
    "most scenes are hazards and hard choices about named, scarce resources (food, light, water, ammunition) that run down, a threat that escalates, and trade-offs where every option costs something",
  Exploration:
    'most scenes are about routes, discoveries and the place itself. The scenes form a small map, not a corridor: at least one scene leads to two others by different routes with different risks and finds ("next" lists both); at least one optional location holds a reward, a shortcut or useful information; each location has a landmark the players can steer by; and a discovery in one scene opens or closes a route in another',
};

export const CLOCK_RULE =
  'ONE clock with two drivers: a schedule that advances it whatever the party does (at the end of each essential scene, or at fixed moments in the fiction such as each sunset), and risky choices (failing a challenge, forcing a route) that advance it sooner or add a complication. Cautious play must never stop it, and clever shortcuts are not punished more than failure. 3–6 ticks; "deadline" is what happens at the last tick, the only irreversible step. If the fiction counts something (bell notes, nights, seals), that count IS the ticks and the numbers match. If the threat began before the adventure (the bell already rang), the clock starts on a later tick; say which in "advances".';

export const ENDINGS_RULE =
  "At least two endings, each reached by a different player decision. If two endings share an action (both break the seal), the condition says exactly what decides between them (for example, whether the captive consented first). Characters who can choose for themselves (a captive, a spirit, an ally) have their own wishes: the party earns their choice and never simply dictates it.";

export const COMMITMENT_RULE =
  "Anything the briefing blames for the crisis (a broken rite, a missing object) matters to the solution, or the briefing says why it no longer does. Anyone the hook says is in danger can be saved during the adventure, in a named scene and at a cost; no rescue is left until after the session. If an NPC moves between locations, the scene says how they got there.";

export const PACING_RULE =
  'Never restate time in prose (no "Act I: 40 minutes"); scene "minutes" are the only time budget.';
