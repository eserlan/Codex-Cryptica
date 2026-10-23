/**
 * Rolls a few creative dimensions in code before a story generator writes
 * anything, so the model does not reach for its most familiar concept. Pure
 * functions; the random source is injected, following `villain-diversity.ts`.
 *
 * Genre fit works in three layers:
 * 1. Most entries describe a shape, not a setting, so they fit any genre.
 * 2. Concrete entries are tagged with genre families, not individual genres.
 * 3. The prompt asks the model to express the choices in the genre's terms.
 */

import { type Rng, defaultRng, pickFrom } from "./random-utils";

export type GenreFamily =
  "pre-industrial" | "gothic" | "modern" | "space" | "post-apocalyptic";

export type ConceptDimension =
  "situation" | "conflictSource" | "distinctiveElement" | "stakeKind";

export interface ConceptEntry {
  id: string;
  label: string;
  /** One line the prompt gives the model so it can honour the choice. */
  guidance: string;
  /** Genre families this entry suits. Absent means it suits any genre. */
  families?: readonly GenreFamily[];
  /** Grim material, kept away from hopeful tones and the optimistic genre. */
  dark?: boolean;
}

export interface ConceptChoice {
  dimension: ConceptDimension;
  id: string;
  label: string;
  guidance: string;
}

const OPTIMISTIC_GENRE = "Optimistic Exploration Sci-Fi";
const HOPEFUL_TONE = "Hopeful";

const entry = (
  id: string,
  label: string,
  guidance: string,
  extra: Pick<ConceptEntry, "families" | "dark"> = {},
): ConceptEntry => ({ id, label, guidance, ...extra });

const PRE = ["pre-industrial"] as const;
const GOTHIC = ["gothic"] as const;
const MODERN = ["modern"] as const;
const SPACE = ["space"] as const;
const POST = ["post-apocalyptic"] as const;

export const CONCEPT_DIMENSIONS: Record<
  ConceptDimension,
  readonly ConceptEntry[]
> = {
  situation: [
    entry(
      "someone-not-who-they-claim",
      "someone is not who they claim to be",
      "someone the party trusts is not who they claim to be",
    ),
    entry(
      "shared-resource-failing",
      "a shared resource is failing",
      "a resource everyone depends on is failing, and the cause is disputed",
    ),
    entry(
      "two-communities-one-need",
      "two communities need the same thing",
      "two communities need the same thing, and neither will give way first",
    ),
    entry(
      "old-promise-called-in",
      "an old promise is being called in",
      "an old promise made by one person is now being called in by another",
    ),
    entry(
      "expert-error-covered",
      "an expert's error is being covered up",
      "an expert's mistake is being hidden to protect a reputation",
    ),
    entry(
      "rescue-against-deadline",
      "a rescue is racing a deadline",
      "someone must be reached before a fixed deadline",
    ),
    entry(
      "unverifiable-newcomer",
      "a newcomer brings a claim nobody can check",
      "a newcomer brings a claim that no one can check without travel",
    ),
    entry(
      "routine-task-reveals",
      "a routine task has revealed something it should not",
      "an ordinary job has uncovered something its employer wants buried",
    ),
    entry(
      "procedure-due-before-deadline",
      "a ritual or procedure must be completed before a deadline",
      "a formal procedure must be completed before a fixed deadline, and failing it has consequences",
      { families: PRE },
    ),
    entry(
      "audit-about-to-expose",
      "an audit is about to expose a quiet crime",
      "an audit is about to expose a crime that several people have hidden",
      { families: MODERN },
    ),
    entry(
      "audit-about-to-expose-space",
      "an inspection is about to expose a fault",
      "a mandatory inspection is about to reveal a fault someone has hidden",
      { families: SPACE },
    ),
    entry(
      "settlement-splitting",
      "a survivor settlement is splitting over one choice",
      "a survivor settlement is splitting over one decision that cannot be undone",
      { families: POST },
    ),
    entry(
      "blame-on-wrong-people",
      "a disaster is being blamed on the wrong people",
      "a disaster is being blamed on people who did not cause it",
    ),
    entry(
      "staged-mishap",
      "a staged mishap or accident",
      "what appears to be an accident, natural death, or coincidence was deliberately arranged",
    ),
    entry(
      "vanishing-without-trace",
      "a vanishing without obvious physical trace",
      "someone disappeared under circumstances that seem physically or procedurally impossible",
    ),
    entry(
      "secret-pact-fracturing",
      "a secret pact or conspiracy is fracturing",
      "an illicit agreement between influential parties is collapsing under blackmail, fear, or betrayal",
    ),
    entry(
      "unexplained-manifestation",
      "an unexplained phenomenon or anomaly",
      "an uncanny occurrence, localized blight, or recurring manifestation has no clear physical source",
    ),
    entry(
      "false-accusation-deflection",
      "a calculated false accusation",
      "suspicion was deliberately steered toward a vulnerable party to conceal the real responsible actor",
    ),
    entry(
      "disputed-succession-tampering",
      "tampering with authority or inheritance",
      "a formal transfer of title, office, or estate was secretly manipulated from within",
    ),
  ],
  conflictSource: [
    entry(
      "personal-rivalry",
      "an old friendship or rivalry",
      "a personal relationship between two people is at the centre of it",
    ),
    entry(
      "institution-rules",
      "an institution with its own rules",
      "a council, guild or office enforces rules that favour a few",
    ),
    entry(
      "natural-forces",
      "natural forces",
      "weather, disease, flood or drought is pushing people into conflict",
    ),
    entry(
      "competing-claims",
      "competing claims on one place",
      "two groups hold legitimate claims on the same place",
    ),
    entry(
      "rival-ambition",
      "a rival's ambition",
      "a rival is quietly working to gain something at the group's expense",
    ),
    entry(
      "hidden-loyalty",
      "a hidden loyalty",
      "someone inside the group answers to an outside power",
    ),
    entry(
      "secret-kept-too-long",
      "a secret kept too long",
      "a secret that has been kept for years is starting to leak",
    ),
    entry(
      "ideological-sabotage",
      "ideological sabotage",
      "the perpetrator is driven by a radical doctrine, principle, or cause rather than material greed",
    ),
    entry(
      "blackmail-pressure",
      "blackmail or extortion pressure",
      "someone is acting under duress because an opponent holds leverage over them",
    ),
    entry(
      "uncontrolled-contagion-anomaly",
      "an uncontrolled anomaly or contagion",
      "an experiment, cursed residue, or contaminant has escaped its originator's control",
    ),
    entry(
      "jurisdictional-standoff",
      "a jurisdictional standoff",
      "competing authorities or factions refuse to cooperate, creating space for the deed",
    ),
    entry(
      "machine-misbehaves",
      "a machine or system that misbehaves",
      "a machine or system the community relies on behaves wrongly",
      { families: MODERN },
    ),
    entry(
      "machine-misbehaves-space",
      "a ship's system that misbehaves",
      "a ship's system the crew relies on behaves in a way no one expected",
      { families: SPACE },
    ),
    entry(
      "machine-misbehaves-post",
      "salvaged machinery that misbehaves",
      "salvaged machinery the settlement depends on fails in an unexpected way",
      { families: POST },
    ),
    entry(
      "supernatural-oath",
      "an oath or spirit",
      "an old oath or spirit is pressing on the present",
      { families: PRE },
    ),
    entry(
      "curse-or-spirit",
      "a curse or restless spirit",
      "a curse or restless spirit is pressing on the living",
      { families: GOTHIC },
    ),
  ],
  distinctiveElement: [
    entry(
      "unusual-trade",
      "a person with an unusual trade",
      "a character whose trade is unusual and gives them useful knowledge",
    ),
    entry(
      "seasonal-place",
      "a place that changes with the seasons",
      "a place that changes dramatically across the year",
    ),
    entry(
      "unquestioned-custom",
      "a social custom nobody questions",
      "a social custom everyone follows without knowing why",
    ),
    entry(
      "environmental-condition",
      "an environmental condition",
      "a persistent condition in the environment, such as fog, heat or a strange light",
    ),
    entry(
      "disputed-object",
      "an object with a disputed history",
      "an object whose history no two people tell the same way",
    ),
    entry(
      "fixed-date-event",
      "an event that falls on a fixed date",
      "a recurring event whose date matters to several people",
    ),
    entry(
      "grazing-feud",
      "a feud over a grazing right",
      "a grazing right that two families each claim by old custom",
    ),
    entry(
      "river-mill",
      "a mill that powers the whole valley",
      "a water-powered mill that the whole valley depends on and quarrels over",
      { families: PRE },
    ),
    entry(
      "night-bathhouse",
      "a bathhouse open only at night",
      "a bathhouse that opens only after dark and keeps its own records",
      { families: GOTHIC },
    ),
    entry(
      "orbital-hatch",
      "an orbital station with one hatch",
      "an orbital station whose only usable hatch is controlled by one office",
      { families: SPACE },
    ),
    entry(
      "machine-market",
      "a market run by machines",
      "a market whose stalls are run by automated sellers",
      { families: MODERN },
    ),
    entry(
      "scrap-shrine",
      "a shrine of salvaged circuits",
      "a shrine built from salvaged parts that people treat as sacred",
      { families: POST },
    ),
    entry(
      "buried-square",
      "a public square built over a grave",
      "a public square was built over a mass grave, and no one talks about it",
      { dark: true },
    ),
  ],
  stakeKind: [
    entry("a-life", "a life", "a person's life depends on the outcome"),
    entry(
      "a-reputation",
      "a reputation",
      "a family or institution's reputation depends on the outcome",
    ),
    entry(
      "a-territory",
      "a territory",
      "control of a territory depends on the outcome",
    ),
    entry(
      "a-secret",
      "a secret",
      "a secret that someone will kill to keep depends on the outcome",
    ),
    entry(
      "an-heirloom",
      "an heirloom",
      "an heirloom with real value depends on the outcome",
    ),
    entry(
      "a-vote",
      "a vote",
      "a vote that changes who holds power depends on the outcome",
    ),
    entry(
      "a-supply",
      "a shared supply",
      "a supply everyone needs depends on the outcome",
    ),
    entry(
      "a-freedom",
      "a person's freedom",
      "someone's freedom depends on the outcome",
    ),
    entry(
      "sealed-cargo",
      "a cargo of sealed goods",
      "a sealed cargo of goods that someone will pay dearly for depends on the outcome",
      { families: [...PRE, ...SPACE] },
    ),
    entry(
      "corporate-patent",
      "a corporate patent",
      "a corporate patent worth a fortune depends on the outcome",
      { families: MODERN },
    ),
    entry(
      "water-ration",
      "a water ration",
      "a water ration that keeps a settlement alive depends on the outcome",
      { families: POST },
    ),
    entry(
      "forgotten-massacre",
      "a massacre the authorities want forgotten",
      "the record of a massacre that authorities want forgotten depends on the outcome",
      { dark: true },
    ),
  ],
};

const GENRE_FAMILY = new Map<string, GenreFamily>([
  ["Classic Fantasy", "pre-industrial"],
  ["Pirate", "pre-industrial"],
  ["Western / Frontier", "pre-industrial"],
  ["Steampunk", "pre-industrial"],
  ["Vampire / Gothic Noir", "gothic"],
  ["Cosmic Horror", "gothic"],
  ["Modern Conspiracy", "modern"],
  ["Superhero / Comic Book", "modern"],
  ["Cyberpunk / Corporate", "modern"],
  ["Sci-Fi / Space Opera", "space"],
  ["Space Opera Resistance", "space"],
  [OPTIMISTIC_GENRE, "space"],
  ["Space Western", "space"],
  ["Lancer", "space"],
  ["Post-Apocalyptic", "post-apocalyptic"],
]);

/** The genre family for a known genre, or undefined for a custom one. */
export function genreFamily(genre: string): GenreFamily | undefined {
  return GENRE_FAMILY.get(genre);
}

/** Entries of one dimension that may be drawn for this genre and tone. */
export function conceptPool(
  dimension: ConceptDimension,
  genre: string,
  tone: string,
): ConceptEntry[] {
  const family = genreFamily(genre);
  const darkBlocked = tone === HOPEFUL_TONE || genre === OPTIMISTIC_GENRE;
  return CONCEPT_DIMENSIONS[dimension].filter((item) => {
    if (item.dark && darkBlocked) return false;
    if (!item.families?.length) return true;
    return family !== undefined && item.families.includes(family);
  });
}

/**
 * One choice per dimension. Entries in `avoidIds` are skipped while others
 * remain; if every entry is avoided, the full pool is used rather than none.
 */
export function rollConcept(
  genre: string,
  tone: string,
  rng: Rng = defaultRng,
  avoidIds: ReadonlySet<string> = new Set(),
): ConceptChoice[] {
  return (Object.keys(CONCEPT_DIMENSIONS) as ConceptDimension[]).map(
    (dimension) => {
      const pool = conceptPool(dimension, genre, tone);
      const fresh = pool.filter((item) => !avoidIds.has(item.id));
      const picked = pickFrom(fresh.length ? fresh : pool, rng);
      return {
        dimension,
        id: picked.id,
        label: picked.label,
        guidance: picked.guidance,
      };
    },
  );
}

const MYSTERY_SITUATIONS: Record<string, readonly string[]> = {
  theft: [
    "routine-task-reveals",
    "shared-resource-failing",
    "two-communities-one-need",
  ],
  murder: [
    "staged-mishap",
    "expert-error-covered",
    "blame-on-wrong-people",
    "false-accusation-deflection",
  ],
  disappearance: [
    "vanishing-without-trace",
    "rescue-against-deadline",
    "someone-not-who-they-claim",
    "unverifiable-newcomer",
  ],
  conspiracy: [
    "secret-pact-fracturing",
    "someone-not-who-they-claim",
    "routine-task-reveals",
    "disputed-succession-tampering",
  ],
  "strange phenomenon": [
    "unexplained-manifestation",
    "shared-resource-failing",
    "machine-misbehaves",
    "machine-misbehaves-space",
    "machine-misbehaves-post",
  ],
  other: [
    "staged-mishap",
    "false-accusation-deflection",
    "disputed-succession-tampering",
    "unexplained-manifestation",
    "secret-pact-fracturing",
    "two-communities-one-need",
    "old-promise-called-in",
    "expert-error-covered",
  ],
};

const MYSTERY_CONFLICTS: Record<string, readonly string[]> = {
  murder: [
    "personal-rivalry",
    "rival-ambition",
    "secret-kept-too-long",
    "blackmail-pressure",
  ],
  disappearance: [
    "hidden-loyalty",
    "blackmail-pressure",
    "personal-rivalry",
    "supernatural-oath",
  ],
  conspiracy: [
    "institution-rules",
    "hidden-loyalty",
    "ideological-sabotage",
    "jurisdictional-standoff",
  ],
  "strange phenomenon": [
    "natural-forces",
    "curse-or-spirit",
    "uncontrolled-contagion-anomaly",
    "machine-misbehaves",
  ],
  other: [
    "competing-claims",
    "ideological-sabotage",
    "blackmail-pressure",
    "jurisdictional-standoff",
    "institution-rules",
    "secret-kept-too-long",
  ],
};

export interface BiasedConceptOptions {
  preferredSituations?: readonly string[];
  preferredConflicts?: readonly string[];
  rng?: Rng;
  avoidIds?: ReadonlySet<string>;
}

/**
 * Rolls creative dimensions with optional preferred situations and conflict mechanisms,
 * while allowing other dimensions to draw naturally from the genre and tone pool.
 */
export function rollBiasedConcept(
  genre: string,
  tone: string,
  options: BiasedConceptOptions = {},
): ConceptChoice[] {
  const {
    preferredSituations,
    preferredConflicts,
    rng = defaultRng,
    avoidIds = new Set(),
  } = options;

  if (!preferredSituations?.length && !preferredConflicts?.length) {
    return rollConcept(genre, tone, rng, avoidIds);
  }

  return (Object.keys(CONCEPT_DIMENSIONS) as ConceptDimension[]).map(
    (dimension) => {
      const pool = conceptPool(dimension, genre, tone);
      let candidatePool = pool;
      if (dimension === "situation" && preferredSituations?.length) {
        const matches = pool.filter((item) =>
          preferredSituations.includes(item.id),
        );
        if (matches.length) candidatePool = matches;
      } else if (dimension === "conflictSource" && preferredConflicts?.length) {
        const matches = pool.filter((item) =>
          preferredConflicts.includes(item.id),
        );
        if (matches.length) candidatePool = matches;
      }

      const fresh = candidatePool.filter((item) => !avoidIds.has(item.id));
      const candidates = fresh.length ? fresh : candidatePool;
      const picked = pickFrom(candidates.length ? candidates : pool, rng);
      return {
        dimension,
        id: picked.id,
        label: picked.label,
        guidance: picked.guidance,
      };
    },
  );
}

/**
 * Preferred situations per one-shot / adventure emphasis.
 */
export const ADVENTURE_EMPHASIS_SITUATIONS: Record<string, readonly string[]> =
  {
    "investigation / mystery": [
      "routine-task-reveals",
      "someone-not-who-they-claim",
      "staged-mishap",
      "vanishing-without-trace",
    ],
    exploration: [
      "unexplained-manifestation",
      "unverifiable-newcomer",
      "rescue-against-deadline",
    ],
    action: [
      "rescue-against-deadline",
      "settlement-splitting",
      "staged-mishap",
      "blame-on-wrong-people",
    ],
    intrigue: [
      "secret-pact-fracturing",
      "false-accusation-deflection",
      "disputed-succession-tampering",
      "someone-not-who-they-claim",
    ],
    survival: [
      "shared-resource-failing",
      "settlement-splitting",
      "two-communities-one-need",
    ],
  };

/**
 * Preferred conflict sources per one-shot / adventure emphasis.
 */
export const ADVENTURE_EMPHASIS_CONFLICTS: Record<string, readonly string[]> = {
  "investigation / mystery": [
    "secret-kept-too-long",
    "blackmail-pressure",
    "rival-ambition",
  ],
  exploration: ["natural-forces", "uncontrolled-contagion-anomaly"],
  action: ["competing-claims", "rival-ambition", "ideological-sabotage"],
  intrigue: [
    "blackmail-pressure",
    "jurisdictional-standoff",
    "institution-rules",
    "hidden-loyalty",
  ],
  survival: [
    "natural-forces",
    "uncontrolled-contagion-anomaly",
    "competing-claims",
  ],
};

/**
 * Preferred situations per heist type.
 */
export const HEIST_SITUATIONS: Record<string, readonly string[]> = {
  theft: [
    "audit-about-to-expose",
    "routine-task-reveals",
    "competing-claims",
    "expert-error-covered",
    "false-accusation-deflection",
    "secret-pact-fracturing",
  ],
  rescue: [
    "rescue-against-deadline",
    "someone-not-who-they-claim",
    "blame-on-wrong-people",
  ],
  sabotage: [
    "staged-mishap",
    "uncontrolled-contagion-anomaly",
    "shared-resource-failing",
    "ideological-sabotage",
  ],
  extraction: [
    "someone-not-who-they-claim",
    "rescue-against-deadline",
    "secret-pact-fracturing",
  ],
  information: [
    "audit-about-to-expose",
    "routine-task-reveals",
    "false-accusation-deflection",
    "disputed-succession-tampering",
  ],
  "plant evidence": [
    "false-accusation-deflection",
    "secret-pact-fracturing",
    "blame-on-wrong-people",
  ],
  assassination: [
    "staged-mishap",
    "procedure-due-before-deadline",
    "someone-not-who-they-claim",
  ],
};

/**
 * Preferred conflict sources per heist type.
 */
export const HEIST_CONFLICTS: Record<string, readonly string[]> = {
  theft: [
    "competing-claims",
    "blackmail-pressure",
    "rival-ambition",
    "secret-kept-too-long",
  ],
  rescue: ["hidden-loyalty", "jurisdictional-standoff", "institution-rules"],
  sabotage: ["ideological-sabotage", "rival-ambition", "competing-claims"],
  extraction: [
    "hidden-loyalty",
    "jurisdictional-standoff",
    "institution-rules",
  ],
  information: [
    "secret-kept-too-long",
    "blackmail-pressure",
    "institution-rules",
  ],
  "plant evidence": [
    "blackmail-pressure",
    "institution-rules",
    "jurisdictional-standoff",
  ],
  assassination: [
    "rival-ambition",
    "ideological-sabotage",
    "secret-kept-too-long",
  ],
};

/**
 * Rolls creative dimensions tailored to a specific heist type.
 */
export function rollHeistConcept(
  genre: string,
  tone: string,
  heistType?: string,
  rng: Rng = defaultRng,
  avoidIds: ReadonlySet<string> = new Set(),
): ConceptChoice[] {
  const norm = heistType?.trim().toLowerCase();
  if (!norm) return rollConcept(genre, tone, rng, avoidIds);
  return rollBiasedConcept(genre, tone, {
    preferredSituations: HEIST_SITUATIONS[norm],
    preferredConflicts: HEIST_CONFLICTS[norm],
    rng,
    avoidIds,
  });
}

/**
 * Preferred situations for political council vote scenarios.
 */
export const COUNCIL_VOTE_SITUATIONS: readonly string[] = [
  "disputed-succession-tampering",
  "two-communities-one-need",
  "secret-pact-fracturing",
  "shared-resource-failing",
  "settlement-splitting",
  "false-accusation-deflection",
  "audit-about-to-expose",
];

/**
 * Preferred conflict sources for political council vote scenarios.
 */
export const COUNCIL_VOTE_CONFLICTS: readonly string[] = [
  "institution-rules",
  "jurisdictional-standoff",
  "blackmail-pressure",
  "secret-pact-fracturing",
  "competing-claims",
  "rival-ambition",
  "hidden-loyalty",
];

/**
 * Rolls creative dimensions tailored to a contentious council vote.
 */
export function rollCouncilVoteConcept(
  genre: string,
  tone: string,
  rng: Rng = defaultRng,
  avoidIds: ReadonlySet<string> = new Set(),
): ConceptChoice[] {
  return rollBiasedConcept(genre, tone, {
    preferredSituations: COUNCIL_VOTE_SITUATIONS,
    preferredConflicts: COUNCIL_VOTE_CONFLICTS,
    rng,
    avoidIds,
  });
}

/**
 * Rolls creative dimensions tailored to a specific adventure or one-shot emphasis.
 */
export function rollAdventureConcept(
  genre: string,
  tone: string,
  emphasis?: string,
  rng: Rng = defaultRng,
  avoidIds: ReadonlySet<string> = new Set(),
): ConceptChoice[] {
  const norm = emphasis?.trim().toLowerCase();
  if (!norm) return rollConcept(genre, tone, rng, avoidIds);
  return rollBiasedConcept(genre, tone, {
    preferredSituations: ADVENTURE_EMPHASIS_SITUATIONS[norm],
    preferredConflicts: ADVENTURE_EMPHASIS_CONFLICTS[norm],
    rng,
    avoidIds,
  });
}

/**
 * Rolls creative dimensions tailored to a specific mystery type, preventing
 * non-theft investigations from defaulting to stolen-object structures.
 */
export function rollMysteryConcept(
  genre: string,
  tone: string,
  mysteryType?: string,
  rng: Rng = defaultRng,
  avoidIds: ReadonlySet<string> = new Set(),
): ConceptChoice[] {
  const normType = mysteryType?.trim().toLowerCase();
  if (!normType) {
    return rollConcept(genre, tone, rng, avoidIds);
  }
  return rollBiasedConcept(genre, tone, {
    preferredSituations: MYSTERY_SITUATIONS[normType],
    preferredConflicts: MYSTERY_CONFLICTS[normType],
    rng,
    avoidIds,
  });
}

const DIMENSION_NAMES: Record<ConceptDimension, string> = {
  situation: "Situation",
  conflictSource: "Source of conflict",
  distinctiveElement: "Distinctive element",
  stakeKind: "What is at stake",
};

/** The prompt block for rolled choices; empty when there are none. */
export function formatConceptBlock(choices: readonly ConceptChoice[]): string {
  if (choices.length === 0) return "";
  return [
    "Concept constraints for this case. Build the story around these choices, expressed in this genre's own terms. The campaign context still overrides them where it conflicts.",
    ...choices.map(
      (choice) => `- ${DIMENSION_NAMES[choice.dimension]}: ${choice.guidance}`,
    ),
  ].join("\n");
}
