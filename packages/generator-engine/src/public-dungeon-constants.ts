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

export const FACTION_GOALS: string[] = [
  "Survival",
  "Dominion",
  "Knowledge",
  "Vengeance",
  "Wealth",
  "Ascension",
  "Redemption",
  "Destruction",
];

export const FACTION_OBSTACLES: string[] = [
  "a dwindling food and resource supply",
  "a rival faction sharing these halls",
  "an ancient guardian bound to stop them",
  "their own internal discord and mistrust",
  "a slow curse eating away at their numbers",
  "the watchful eyes of something far older",
  "a debt owed to a power outside these walls",
  "time — whatever they're planning, it's nearly too late",
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
