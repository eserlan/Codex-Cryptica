/**
 * Option-keyed detail for the offline kingdom draft (#5242).
 *
 * The offline kingdom used to echo each form choice into a fixed sentence
 * ("leads through a system of hereditary dynasty", "a realm at at peace") and
 * print the same ruler note, capital note, hook, faction agendas and rumours
 * on every run. Each detail here is keyed by the option that should drive it,
 * with a fallback that reuses a typed-in custom value, so every choice on the
 * page reaches the draft in readable prose.
 */

import { pickRandomItems, type Rng } from "./random-utils";

interface GovernmentDetail {
  /** Completes "ruled by …". */
  ruledBy: string;
  rulerNote: string;
  power: (ruler: string) => string;
}

const GOVERNMENT_DETAILS: Record<string, GovernmentDetail> = {
  "Hereditary dynasty": {
    ruledBy: "a hereditary dynasty",
    rulerNote:
      "heir to a long bloodline, proud of it, and without a trusted successor",
    power: (ruler) =>
      `${ruler} holds the throne by right of birth, and the great houses weigh every decision against the strength of the bloodline's claim.`,
  },
  "Elected council": {
    ruledBy: "an elected council",
    rulerNote:
      "first among the councillors, re-elected by a margin narrow enough to worry about",
    power: (ruler) =>
      `${ruler} speaks for an elected council, and every major decision needs votes that have to be bought, begged or traded for.`,
  },
  "Military dictatorship": {
    ruledBy: "a military dictatorship",
    rulerNote:
      "a general who never stood down, trusted by the army and by few others",
    power: (ruler) =>
      `${ruler} rules through the army. Orders come from the barracks, and the old offices of state carry out what they are told.`,
  },
  "Theocratic rule": {
    ruledBy: "its high clergy",
    rulerNote:
      "high priest of the state faith, who claims every decree comes from the gods",
    power: (ruler) =>
      `${ruler} governs as the voice of the state faith, so dissent is treated as heresy as well as treason.`,
  },
  Oligarchy: {
    ruledBy: "an oligarchy of wealthy families",
    rulerNote:
      "head of the richest ruling family, in the chair because the others could not agree on a rival",
    power: (ruler) =>
      `${ruler} chairs a small circle of wealthy families who own most of what is worth owning, and the law bends to their ledgers.`,
  },
  "Constitutional government": {
    ruledBy: "a constitutional government",
    rulerNote:
      "a chancellor bound by a written charter, and testing how far it bends",
    power: (ruler) =>
      `${ruler} governs under a written charter. Courts and assemblies can block a decree, which makes every reform slow and every emergency tempting.`,
  },
  "Tribal / clan elders": {
    ruledBy: "a council of clan elders",
    rulerNote:
      "the eldest voice at the clan fire, respected, ageing and openly courted by would-be successors",
    power: (ruler) =>
      `${ruler} is the senior voice among the clan elders. Decisions are reached by agreement at the clan fire, and any clan can walk away.`,
  },
};

/** The seat line for a single-settlement realm, where the capital is the realm. */
const SINGLE_CITY_SCALE = "City-state (single settlement)";

const SCALE_TERRITORY: Record<string, string> = {
  [SINGLE_CITY_SCALE]: "a single city and the land that feeds it",
  "Small region (handful of towns)":
    "a handful of market towns and the villages between them",
  "Mid-sized nation": "several provinces, a few large cities and many villages",
  "Large empire (many provinces)":
    "many provinces, some of them conquered within living memory",
  "Continent-spanning dominion":
    "most of a continent, governed through distant viceroys",
};

interface GeographyDetail {
  /** Completes "in …". */
  setting: string;
  capitalNote: string;
  resource: string;
  rumour: string;
}

const GEOGRAPHY_DETAILS: Record<string, GeographyDetail> = {
  "Temperate highlands": {
    setting: "the temperate highlands",
    capitalNote: "a hill fortress above the main valley road",
    resource: "the upland wool trade and the drove roads",
    rumour:
      "Shepherds in the high pastures have been told to drive their flocks south early this year",
  },
  "Coastal plains": {
    setting: "the coastal plains",
    capitalNote: "a harbour city behind a long sea wall",
    resource: "the harbours and the grain ships",
    rumour:
      "A grain ship docked at the capital with its hold sealed and its crew forbidden to land",
  },
  "Dense forest": {
    setting: "deep forest",
    capitalNote: "a timber-walled city in a great clearing",
    resource: "the timber rights and the forest roads",
    rumour:
      "Woodcutters have stopped going past the old boundary stones, and none of them will say why",
  },
  "Arid desert": {
    setting: "the desert",
    capitalNote: "an oasis city whose wells are guarded day and night",
    resource: "the wells and the caravan routes",
    rumour:
      "One of the deep wells on the caravan road has been poisoned, or so the drivers claim",
  },
  "Arctic tundra": {
    setting: "the frozen tundra",
    capitalNote: "a stone city built around hot springs",
    resource: "the fur trade and the winter stores",
    rumour:
      "The winter stores in the capital are lower than the official count, and someone is keeping the count",
  },
  "Island archipelago": {
    setting: "an island archipelago",
    capitalNote: "a port on the largest island, reached only by sea",
    resource: "the ferries and the sea lanes between the islands",
    rumour: "Two of the outer islands have stopped sending their tithe boats",
  },
  "River delta": {
    setting: "a river delta",
    capitalNote: "a city of canals and stilt houses where the river splits",
    resource: "the river tolls and the dykes",
    rumour:
      "The dyke wardens have been paid to leave one stretch of the river bank unrepaired",
  },
  "Mountain range": {
    setting: "the mountains",
    capitalNote: "a city cut into the mountainside above the only pass",
    resource: "the mines and the mountain passes",
    rumour:
      "A mine shaft was sealed overnight with the miners' tools still inside",
  },
};

interface ConflictDetail {
  /** Completes "ruled by … and …". */
  state: string;
  society: string;
  opposition: string;
}

const CONFLICT_DETAILS: Record<string, ConflictDetail> = {
  "At peace": {
    state: "at peace for now",
    society:
      "Years of peace have made the realm comfortable. Trade is steady, the roads are mostly safe, and few people want to hear that anything is wrong.",
    opposition:
      "Wants the ruler gone, but has no excuse to act while the realm is at peace",
  },
  "Simmering tensions": {
    state: "close to boiling over",
    society:
      "Tension shows in small ways: prices creep up, officials grow terse, and certain names stop being said in public. Nobody has drawn a blade yet.",
    opposition:
      "Opposes the ruler quietly, and is waiting for the tension to give it an opening",
  },
  "Open conflict": {
    state: "in open conflict",
    society:
      "Fighting has broken out, and everyone has had to pick a side or pretend not to. Levies are being raised, and refugees fill the roads to the capital.",
    opposition:
      "Fights the ruler openly, and holds at least one fortified town",
  },
  "Total war": {
    state: "fighting a total war",
    society:
      "The whole realm is at war. Harvests go to the army, the young go to the front, and anyone who speaks against the war is watched.",
    opposition:
      "Is secretly negotiating with the enemy to end the war on its own terms",
  },
  "Post-war recovery": {
    state: "rebuilding after a war",
    society:
      "The war is over, but the damage is not. Burnt villages are being rebuilt, veterans are coming home to no work, and old grudges are being settled quietly.",
    opposition: "Blames the ruler for the war's losses and wants a reckoning",
  },
};

const MAGIC_LINES: Record<string, string> = {
  "No magic":
    "There is no working magic in the realm. Armies, courts and healers rely on steel, law and herbs, and tales of sorcery are dismissed as foreign nonsense.",
  "Rare and feared":
    "Magic is rare and feared. The few who can use it hide the gift or serve the state under close watch, and an accusation of sorcery is a handy political weapon.",
  "Common but regulated":
    "Magic is common but licensed. Practitioners register with the state, battle mages serve in the army, and unlicensed casting is a crime.",
  "Widely practiced":
    "Magic is part of everyday life, from the healer's charm to the mage who keeps the city lamps lit, and much of the realm's wealth depends on it.",
  "Magic-dependent society":
    "The realm cannot run without magic. Its harvests, defences and roads depend on spellwork, so whoever controls the mages controls everything else.",
};

interface TroubleDetail {
  hook: string;
  rumours: readonly string[];
  seed: string;
}

const TROUBLE_DETAILS: Record<string, TroubleDetail> = {
  "The ruling class is fracturing over a succession crisis": {
    hook: "A young claimant asks the party to escort them to the capital before the succession is settled without them",
    rumours: [
      "Two rival claimants have each been proclaimed in a different city",
      "The ruler's physician was dismissed on the night the ruler fell ill",
      "A noble house has started paying its guards double",
    ],
    seed: "**📅 The succession dispute**: The rival claims, when they will be decided, and who backs each claimant.",
  },
  "A powerful faction is quietly positioning to seize control": {
    hook: "A guard captain in the capital offers the party gold to look the other way at the next change of watch",
    rumours: [
      "Arms are being moved into the capital hidden in grain carts",
      "Several officials loyal to the ruler have been sent to distant posts",
      "The ruler's kitchens have been told to expect more guests than usual",
    ],
    seed: "**📅 The planned coup**: When the faction means to strike, and the officials it has already bought.",
  },
  "An economic collapse is being hidden from the public": {
    hook: "A treasury clerk tries to sell the party the real account books before fleeing the realm",
    rumours: [
      "The new coins weigh less than the old ones",
      "Foreign merchants have started refusing payment in the realm's coin",
      "The mint has been working through the night for a month",
    ],
    seed: "**📅 The hidden collapse**: How long the treasury can keep up the pretence, and who has seen the real accounts.",
  },
  "A border dispute is being deliberately escalated by a third party": {
    hook: "A border patrol brings in a prisoner carrying orders written in a third realm's cipher",
    rumours: [
      "Both sides of the border have found the same forged orders",
      "A foreign envoy has been seen meeting officers from both armies",
      "Someone burned a border watchtower and left the other side's colours behind",
    ],
    seed: "**📅 The border incident**: The clash being staged, and the outside power that gains from it.",
  },
  "A secret the ruler is keeping could delegitimise the entire state": {
    hook: "An old archivist asks the party to recover a document from a sealed archive before the ruler's agents burn it",
    rumours: [
      "A copy of the founding treaty has gone missing from the archive",
      "A travelling singer was arrested for a song about the ruler's mother",
      "Pages have been cut from the temple's register of births",
    ],
    seed: "**📅 The secret coming out**: What the ruler is hiding, who has proof, and when it will surface.",
  },
  "An internal resistance movement is closer to open revolt than anyone admits":
    {
      hook: "A smith asks the party to deliver a crate of tools to a village, and the crate is far too heavy for tools",
      rumours: [
        "Tax collectors have stopped visiting three villages in the north",
        "Pamphlets against the ruler appear overnight on temple doors",
        "A militia drills in the woods at night and calls it a hunting club",
      ],
      seed: "**📅 The rising**: The day the resistance plans to act, and what will set it off.",
    },
};

export interface KingdomDetailInput {
  governmentStyle: string;
  geography: string;
  scale: string;
  conflictLevel: string;
  magicLevel: string;
  trouble: string;
}

export interface KingdomDetails {
  ruledBy: string;
  rulerNote: string;
  power: (ruler: string) => string;
  territory: string;
  /** Opens the capital sentence: "Its capital" or, for a city-state, "The city itself". */
  seat: string;
  setting: string;
  capitalNote: string;
  resource: string;
  conflictState: string;
  society: string;
  opposition: string;
  magicLine: string;
  hook: string;
  rumours: string[];
  troubleSeed: string;
}

function lower(value: string): string {
  return value.trim().toLowerCase();
}

function governmentDetailFor(style: string): GovernmentDetail {
  return (
    GOVERNMENT_DETAILS[style] ?? {
      ruledBy: `a system of ${lower(style)}`,
      rulerNote: `the current head of a government built on ${lower(style)}`,
      power: (ruler) =>
        `${ruler} holds power under the realm's system of ${lower(style)}, and knows exactly who would gain if it changed.`,
    }
  );
}

function geographyDetailFor(geography: string): GeographyDetail {
  const setting = lower(geography);
  return (
    GEOGRAPHY_DETAILS[geography] ?? {
      setting,
      capitalNote: `the oldest settlement in the realm, shaped by its ${setting}`,
      resource: `the routes through the ${setting}`,
      rumour: `Travellers say something has changed out in the ${setting}, and the wardens are not saying what`,
    }
  );
}

function conflictDetailFor(conflictLevel: string): ConflictDetail {
  const level = lower(conflictLevel);
  return (
    CONFLICT_DETAILS[conflictLevel] ?? {
      state: `facing ${level}`,
      society: `The realm is living through ${level}, and the strain shows in the markets, the courts and the barracks.`,
      opposition: `Opposes the ruler, and sees ${level} as its chance`,
    }
  );
}

function troubleDetailFor(trouble: string): TroubleDetail {
  return (
    TROUBLE_DETAILS[trouble] ?? {
      hook: "A messenger sent to the capital last week has not been seen since, and the party is asked to find out why",
      rumours: [
        `People at court say the trouble runs deeper than anyone admits: ${lower(trouble)}`,
        "A minor official resigned and left the capital the same night",
      ],
      seed: "**📅 The hidden crisis**: What happens if nobody deals with it, and who gains if it grows.",
    }
  );
}

/** Builds the option-driven lines of an offline kingdom draft. */
export function buildKingdomDetails(
  input: KingdomDetailInput,
  rng: Rng,
): KingdomDetails {
  const government = governmentDetailFor(input.governmentStyle);
  const geography = geographyDetailFor(input.geography);
  const conflict = conflictDetailFor(input.conflictLevel);
  const trouble = troubleDetailFor(input.trouble);
  return {
    ruledBy: government.ruledBy,
    rulerNote: government.rulerNote,
    power: government.power,
    territory:
      SCALE_TERRITORY[input.scale] ??
      `territory on the scale of ${lower(input.scale)}`,
    seat: input.scale === SINGLE_CITY_SCALE ? "The city itself" : "Its capital",
    setting: geography.setting,
    capitalNote: geography.capitalNote,
    resource: geography.resource,
    conflictState: conflict.state,
    society: conflict.society,
    opposition: conflict.opposition,
    magicLine:
      MAGIC_LINES[input.magicLevel] ??
      `Magic in the realm is ${lower(input.magicLevel)}, and both the army and the courts have had to adapt to that.`,
    hook: trouble.hook,
    rumours: [...pickRandomItems(trouble.rumours, 2, rng), geography.rumour],
    troubleSeed: trouble.seed,
  };
}
