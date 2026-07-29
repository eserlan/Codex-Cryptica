/**
 * Constants, configuration, and derived lookup tables for the Dungeon / Delve Generator.
 *
 * Per-genre content lives in `dungeon/genres/<genre>.ts`, one file per theme.
 * This module assembles those into the genre-keyed records the generator reads,
 * and owns the tables that are genre-independent (keyed by purpose or state
 * instead) plus the shared genre resolver.
 *
 * Structural inspiration: the paired-axis composition tables (builder × use,
 * entrance × composition, condition × cause) and the faction model (virtue/vice,
 * goal/obstacle) are patterned after the "Dungeon Seeds" and faction/agenda
 * procedures in the Cairn RPG Warden's Guide (2nd Edition) by Yochai Gal,
 * https://cairnrpg.com — text licensed CC BY-SA 4.0. All entries are original
 * prose written for Codex Cryptica; only the compositional *method* is
 * borrowed, not Cairn's table text.
 */

import { DUNGEON_GENRE_TABLES, byGenre } from "./dungeon/genres";

export { DUNGEON_GENRE_TABLES };
export type { DungeonGenreTables } from "./dungeon/genre-types";

/**
 * Resolve a genre-keyed table for a theme label.
 *
 * Theme labels from the UI carry qualifiers the tables don't ("Classic Fantasy"
 * -> "Fantasy"), so try the label, then its unqualified forms, then the Fantasy
 * default. Both the engine and the generator form MUST use this — when they had
 * separate copies with different fallbacks the dropdown offered options the
 * engine would never pick on its own.
 */
export function forGenre<T>(record: Record<string, T[]>, genre: string): T[] {
  return (
    record[genre] ??
    record[genre.replace(/^Classic /, "")] ??
    record[genre.replace(/ \/ .*/, "")] ??
    record["Fantasy"] ??
    record["Classic Fantasy"]
  );
}

/** Resolve the whole table set for a theme label, using the same aliasing as forGenre. */
export function forGenreTables(genre: string) {
  return (
    DUNGEON_GENRE_TABLES[genre] ??
    DUNGEON_GENRE_TABLES[genre.replace(/^Classic /, "")] ??
    DUNGEON_GENRE_TABLES[genre.replace(/ \/ .*/, "")] ??
    DUNGEON_GENRE_TABLES["Fantasy"]
  );
}

/** Sorted union of a field across every genre, so the unions can't drift. */
function unionOf(field: "purposes" | "currentStates"): string[] {
  const seen = new Set<string>();
  for (const tables of Object.values(DUNGEON_GENRE_TABLES)) {
    for (const value of tables[field]) seen.add(value);
  }
  return [...seen];
}

export const dungeonConfig = {
  /**
   * Union of every purpose across all genres — the fallback list, and the set
   * ORIGINAL_USE_BY_PURPOSE and the UI's help text must both cover.
   * Genre-specific subsets live in `purposesByGenre`.
   */
  purposes: unionOf("purposes"),
  /** Union of every current state across all genres. See `currentStatesByGenre`. */
  currentStates: unionOf("currentStates"),
  scales: [
    "Small Lair (2 Sectors)",
    "Medium Complex (3-4 Sectors)",
    "Sprawling Megadungeon (5+ Sectors)",
  ],
  /** Which purposes suit each genre — no data vaults in fantasy, no temples in cyberpunk. */
  purposesByGenre: byGenre("purposes"),
  /** Which current states suit each genre. */
  currentStatesByGenre: byGenre("currentStates"),
};

export const GENRE_HINTS: Record<string, string> = Object.fromEntries(
  Object.entries(DUNGEON_GENRE_TABLES).map(([label, t]) => [label, t.hint]),
);

export const SAMPLE_TITLES_BY_GENRE = byGenre("sampleTitles");
export const BUILDER_BY_GENRE = byGenre("builders");
export const ORIGINAL_USE_BY_GENRE = byGenre("originalUses");
export const ENTRANCE_BY_GENRE = byGenre("entrances");
export const COMPOSITION_BY_GENRE = byGenre("compositions");
export const CONDITION_BY_GENRE = byGenre("conditions");
export const CAUSE_BY_GENRE = byGenre("causes");
export const SECTORS_BY_GENRE = byGenre("sectors");
export const INHABITANTS_BY_GENRE = byGenre("inhabitants");
export const FACTION_NAMES_BY_GENRE = byGenre("factionNames");
export const SECRETS_BY_GENRE = byGenre("secrets");
export const HAZARDS_BY_GENRE = byGenre("hazards");
export const TREASURES_BY_GENRE = byGenre("treasures");
export const HOOKS_BY_GENRE = byGenre("hooks");
export const SIGNATURE_FEATURES_BY_GENRE = byGenre("signatureFeatures");

/**
 * What the delve was built for, keyed by the *selected purpose* rather than genre.
 * This is the primary source for the history sentence: the user picks "Mine & Shafts",
 * so the history must describe a mine — not an independently-rolled reliquary.
 * ORIGINAL_USE_BY_GENRE below is only the fallback for custom, user-entered purposes.
 */
export const ORIGINAL_USE_BY_PURPOSE: Record<string, string[]> = {
  "Temple & Shrine": [
    "a shrine to a god whose name is no longer spoken",
    "a pilgrimage sanctuary at the end of a holy road",
    "a reliquary for a captured god-shard",
    "an oracle's seat where the faithful came for answers",
  ],
  "Fortress & Citadel": [
    "a redoubt against an invasion that came anyway",
    "a garrison guarding the only pass through the mountains",
    "a command post for a war since lost to record",
    "a last-stand keep for an army in retreat",
  ],
  "Tomb & Catacomb": [
    "a burial vault for a dynasty that wanted to be remembered",
    "an ossuary for the honoured dead of a long siege",
    "a catacomb dug to hold more bodies than anyone expected",
    "a sealed barrow for a ruler who feared being disturbed",
  ],
  "Mine & Shafts": [
    "an excavation chasing a vein that ran deeper than anyone mapped",
    "a quarry cut for stone to build a city never finished",
    "a dig site following an ore that hummed when struck",
    "a shaft network worked by labour no one kept records of",
  ],
  "Research Facility": [
    "a laboratory for experiments the surface would not permit",
    "an observation post for something nobody understood",
    "a testing annex kept off every official map",
    "a study built to contain what it studied",
  ],
  "Prison & Vault": [
    "a high-security vault built to hold one specific thing",
    "an oubliette for prisoners meant to be forgotten",
    "a strongroom sealed by three keys held by three rivals",
    "a holding facility for something that could not be killed",
  ],
  "Natural Cavern Network": [
    "a natural cavern system later widened by hand",
    "a shelter carved into caves that were already ancient",
    "a warren adapted from a dried underground river",
    "a refuge in a cave system nobody had fully mapped",
  ],
  "Planar Anomaly": [
    "a containment ring around a tear in the world",
    "a waystation built where reality had already thinned",
    "an anchor-house holding a rift closed by force",
    "a gate-chamber for a passage that no longer leads where it did",
  ],
  "Data Vault & Archive": [
    "an archive for records too sensitive to keep on the grid",
    "a cold-storage vault for backups nobody admits exist",
    "a data haven built beyond any single jurisdiction",
    "a repository for research that was officially destroyed",
  ],
  "Bio-Containment Wing": [
    "a quarantine wing for a specimen that should never have been collected",
    "a containment lab for organisms grown rather than found",
    "an isolation ward built to fail safely, which it did not",
    "a sample vault for a biology no one could classify",
  ],
  "Fallout Shelter": [
    "a shelter stocked for a decade underground",
    "a continuity bunker for people deemed worth saving",
    "a hardened refuge built while there was still time",
    "a civil-defence complex for a population that never arrived",
  ],
  "Ancestral Mausoleum": [
    "a mausoleum built to outlast the family name",
    "a crypt for a bloodline that refused to end properly",
    "a family vault with more chambers than there were heirs",
    "a resting place designed so its occupants could be visited",
  ],
  "Pirate Cove & Smuggler's Hold": [
    "a hidden anchorage for ships that flew no flag",
    "a cargo hold for goods that never cleared a customs house",
    "a careening berth where hulls were scraped out of sight of the navy",
    "a shareout hall where a fleet divided what it took",
  ],
  "Mech Bay & Hangar": [
    "a maintenance bay for frames too large to service topside",
    "a scramble hangar cut into the rock for a garrison that never launched",
    "a salvage dock for chassis dragged back from the line",
    "a cold-storage hangar for frames mothballed after a ceasefire",
  ],
  "Rail Tunnel & Depot": [
    "a rail depot at the end of a line that was never completed",
    "a switching tunnel bored through the range in a single brutal season",
    "a freight siding for cargo the company preferred to move at night",
    "a terminus built for a boomtown that emptied before the rails arrived",
  ],
  "Clockwork Engine Works": [
    "an engine house driving every mechanism for a district above",
    "a pressure works built to power looms that no longer turn",
    "an automaton foundry assembling workers nobody had to pay",
    "a governor hall regulating pressure across half a city",
  ],
  "Black Site": [
    "an unlisted facility for detentions that were never recorded",
    "a deniable installation running a programme with no budget line",
    "an interrogation annex outside every applicable jurisdiction",
    "a debriefing complex for personnel who were reported missing",
  ],
};

/**
 * The delve's current physical condition, keyed by the *selected current state*
 * so the two never contradict — a "Sealed Vault" shouldn't also be described as
 * half-flooded and open to the weather. CONDITION_BY_GENRE below is the fallback
 * for custom, user-entered states.
 */
export const CONDITION_BY_STATE: Record<string, string[]> = {
  "Active Monster Lair": [
    "denned-in and reeking of its occupants",
    "strewn with bones and dragged-in spoil",
    "marked at every entrance with territorial warnings",
    "loud with something moving in the deeper halls",
  ],
  "Abandoned Ruins": [
    "silent and thick with dust",
    "picked over by scavengers and left open to the weather",
    "slowly collapsing under its own neglect",
    "overgrown at the threshold and dark within",
  ],
  "Sealed Vault": [
    "still airtight, its seals unbroken",
    "shut from the inside and never reopened",
    "intact behind a door nobody has managed to move",
    "preserved exactly as it was left, untouched by air or light",
  ],
  "Occupied Stronghold": [
    "fortified, patrolled, and clearly claimed",
    "repaired in a dozen crude places by its current holders",
    "watched from every approach",
    "converted to serve purposes its builders never intended",
  ],
  "Arcane / Tech Anomaly": [
    "humming with a power nobody installed",
    "behaving as though its own geometry has come loose",
    "cycling through states no one can predict",
    "warm where it should be cold, and silent where there should be noise",
  ],
  "Cursed Ruin": [
    "avoided by everything capable of reason",
    "wrong in a way that is difficult to name aloud",
    "quiet in a manner that feels deliberate",
    "marked with warnings in three languages, all of them old",
  ],
  "Overrun by Squatters": [
    "cluttered with makeshift shelters and cook-fires",
    "rewired and re-plumbed by people who needed it to work",
    "divided into territories by whoever arrived first",
    "busier than it has been in a century, and far less orderly",
  ],
  "Still Operational": [
    "running on the last of its original power",
    "performing its function with nobody left to need it",
    "maintained by systems that have outlived their purpose",
    "still lit, still cycling, still waiting for instruction",
  ],
  "Buried & Forgotten": [
    "sealed under collapse and only recently exposed",
    "missing from every map still in circulation",
    "reachable only through a breach nobody meant to make",
    "buried deep enough that its existence is disputed",
  ],
};

/**
 * What kind of faction this is, in plain language — deliberately genre-agnostic
 * so the same pool works whether the name that follows is a cult, a crew, or a
 * corporate strike team. Written with no proper names of its own, since it
 * always introduces a faction that already has one.
 */
export const FACTION_IDENTITIES: string[] = [
  "Displaced scavengers turned makeshift militia.",
  "A militant order fallen into extremism.",
  "Escaped laborers who never found a way out.",
  "A splinter cell of soldiers who refuse to stand down.",
  "Opportunists who arrived looking for loot and got trapped.",
  "The last remnant of the original garrison, still on duty.",
  "A criminal syndicate that claimed the ruins as new territory.",
  "True believers guarding what they think is sacred.",
];

/**
 * Generic, theme-agnostic faction traits — deliberately abstract so they hold
 * up for any genre, including ones without dedicated flavor tables above.
 */
export const FACTION_VIRTUES: string[] = [
  "Disciplined",
  "Curious",
  "Vigilant",
  "Devoted",
  "Patient",
  "Merciful",
  "Resourceful",
  "Proud",
];

export const FACTION_VICES: string[] = [
  "Paranoid",
  "Greedy",
  "Cruel",
  "Vengeful",
  "Reckless",
  "Deceitful",
  "Cowardly",
  "Wrathful",
];

/** Underlying motivation a faction's concrete goal serves — why they act, not what they're doing right now. */
export const FACTION_DRIVES: string[] = [
  "Survival",
  "Dominion",
  "Knowledge",
  "Vengeance",
  "Wealth",
  "Ascension",
  "Redemption",
  "Destruction",
  "Escape",
];

/**
 * Concrete, present-tense objectives inside this dungeon, keyed by drive.
 * Written as lowercase verb phrases so they can be embedded mid-sentence
 * ("want to X") or capitalized standalone for the Goal field.
 */
export const FACTION_GOALS_BY_DRIVE: Record<string, string[]> = {
  Survival: [
    "secure a defensible foothold before their supplies run out",
    "find a way out before whatever is hunting them closes in",
    "hold this ground long enough for reinforcements that may never come",
  ],
  Dominion: [
    "seize control of the routes leading to the dungeon's heart",
    "force every other faction here to answer to them",
    "claim this place as an unassailable seat of power",
  ],
  Knowledge: [
    "recover the records this place was built to protect",
    "decode the secret at the center of the dungeon before anyone else does",
    "map what lies beneath before it is lost again",
  ],
  Vengeance: [
    "settle a debt owed by whoever built this place",
    "destroy what remains of those who wronged them here",
    "expose a betrayal buried in this dungeon's history",
  ],
  Wealth: [
    "strip this place of everything valuable before rivals do",
    "secure a monopoly on whatever this dungeon still produces",
    "recover a specific fortune rumoured to be hidden here",
  ],
  Ascension: [
    "complete a transformation only this place makes possible",
    "claim a power left behind by whoever built this dungeon",
    "prove themselves worthy of what lies at the dungeon's heart",
  ],
  Redemption: [
    "complete an old rite of atonement buried in the deepest chamber",
    "recover what their bloodline abandoned generations ago",
    "cleanse this place of the failure that first drove them here",
  ],
  Destruction: [
    "collapse this place before its contents can be used again",
    "unmake whatever was sealed here before it wakes",
    "burn out anything of value so no one else can claim it",
  ],
  Escape: [
    "find a way out that does not require crossing hostile territory",
    "buy enough time to slip away before the situation collapses further",
    "smuggle something out before the dungeon is sealed again",
  ],
};

/**
 * Generic, theme-agnostic descriptor for a faction's leader — paired with a
 * placeholder name to give the faction a face without a per-genre table.
 */
export const FACTION_LEADER_DESCRIPTORS: string[] = [
  "a scarred veteran who trusts no orders from above",
  "a silver-tongued zealot who believes their own sermons",
  "an aging strategist playing a longer game than anyone realizes",
  "a ruthless upstart who clawed their way to the front",
  "a reluctant inheritor of a title they never wanted",
  "a true believer who has never once doubted the cause",
  "an exile making a new name in a place no one else wanted",
  "a self-made leader who answers to no council or creed",
];

/** A second, distinct named faction NPC — deliberately not a leader, so the faction has more than one face. */
export const FACTION_NOTABLE_DESCRIPTORS: string[] = [
  "a meticulous record-keeper who no longer fully trusts the leadership",
  "a young scout who knows every hidden route in and out",
  "an aging healer quietly rationing supplies no one else knows are running low",
  "a devoted believer who still holds to the founding cause completely",
  "a hardened enforcer who keeps the rank and file in line through fear",
  "a quiet go-between secretly passing word to the other faction",
  "a former outsider who joined recently and still questions the mission",
  "an old-timer who remembers why this all started and wishes they didn't",
];

/** Generic, theme-agnostic strategic advantage for a faction — deliberately not just a headcount. */
export const FACTION_STRENGTHS: string[] = [
  "a wide network of informants, more eyes than fists",
  "a strong defensive position, held by relatively few",
  "deep resources and hired muscle, thin on true believers",
  "detailed knowledge of routes no other faction has mapped",
  "functioning old-world equipment nobody else knows how to use",
  "a legitimacy the others lack, at least in name",
  "total command of the only safe way in or out",
  "unmatched mobility through ground the others cannot cross safely",
];

/**
 * What a faction believes it must do soon, or fears will happen if it
 * doesn't — the reason the current standoff cannot simply continue
 * indefinitely. Composed into the shared Faction Situation paragraph.
 */
export const FACTION_INSTABILITY_HOOKS: string[] = [
  "that balance will not hold once either side's obstacle breaks first",
  "a third party moving into the dungeon could collapse the standoff overnight",
  "whichever faction resolves its obstacle first will move on the other immediately",
  "neither side has the strength to end this outright, so the standoff persists by exhaustion alone",
  "a single misstep by either leader could turn the standoff into open war",
  "the balance holds only because both sides fear what victory would actually cost them",
];

/** Context a local origin/belief template can draw on to stay dungeon-specific. */
export interface FactionLoreContext {
  builder: string;
  cause: string;
  originalUse: string;
}

/** Why the faction exists and how it became connected to this dungeon — composed from the dungeon's own history seeds. */
export const FACTION_ORIGIN_TEMPLATES: Array<
  (ctx: FactionLoreContext) => string
> = [
  (ctx) =>
    `Descendants of ${ctx.builder}, drawn back by what was left unfinished here.`,
  (ctx) => `Survivors of ${ctx.cause}, who never found anywhere better to go.`,
  (ctx) =>
    `Outsiders who broke in through the damage left by ${ctx.cause}, and chose to stay.`,
  (ctx) =>
    `A splinter group who once served ${ctx.builder}, until they saw what this place was truly for.`,
  (ctx) =>
    `Later arrivals who repurposed ${ctx.originalUse} for their own ends.`,
  (ctx) =>
    `A faction that only formed after this place stopped serving ${ctx.originalUse}.`,
];

/** What the faction believes about the dungeon or the current conflict — composed from the same history seeds. */
export const FACTION_BELIEF_TEMPLATES: Array<
  (ctx: FactionLoreContext) => string
> = [
  (ctx) =>
    `They believe finishing what ${ctx.builder} started here will settle an old debt.`,
  (ctx) =>
    `They believe ${ctx.cause} was no accident, and that the truth is still buried somewhere close.`,
  (ctx) =>
    `They believe this place was never meant to become ${ctx.originalUse}, and that its true purpose is theirs to reclaim.`,
  (ctx) =>
    `They believe whoever controls this place controls what caused ${ctx.cause}.`,
  (ctx) =>
    `They believe leaving this place to rot would insult everything ${ctx.builder} built.`,
  () =>
    `They believe the other faction here fundamentally misunderstands what this place actually requires of them.`,
];

/** Generic connector flavor for non-linear pointcrawl routes between sectors. */
export const SECTOR_CONNECTORS: string[] = [
  "a collapsed passage just wide enough to crawl through",
  "a rope-and-plank bridge over open dark",
  "a hidden service route only the desperate would use",
  "a flooded stretch passable only by wading",
  "a narrow shaft requiring rope or climbing gear",
  "a sealed door that answers to force more readily than keys",
];
