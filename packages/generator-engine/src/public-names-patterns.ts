/**
 * Name patterns for the fantasy cultures, so a quick roll follows the chosen
 * name type: people get a surname, places read as places, factions as groups
 * and items as named objects. Other genres keep their own syllable tables.
 */

import { type Rng, pickFrom } from "./random-utils";

export type NameParts = "full" | "first";

type SurnameStyle =
  | "compound"
  | "elven"
  | "dwarven"
  | "orcish"
  | "patronymic"
  | "celtic"
  | "syllabic"
  | "homely";

const SURNAME_STYLES: Record<string, SurnameStyle> = {
  "Generic Fantasy": "compound",
  "High Elf": "elven",
  "Dark Elf": "syllabic",
  Dwarven: "dwarven",
  Halfling: "homely",
  Orcish: "orcish",
  "Norse / Viking": "patronymic",
  "Roman / Latin": "syllabic",
  "Celtic / Gaelic": "celtic",
  "Eastern / Asian-inspired": "syllabic",
};

/** Cultures that use these patterns; the rest keep single generated names. */
export const PATTERNED_CULTURES: readonly string[] =
  Object.keys(SURNAME_STYLES);

const COMPOUND_PARTS: Record<
  "compound" | "elven" | "dwarven" | "orcish" | "homely",
  [readonly string[], readonly string[]]
> = {
  compound: [
    [
      "Ash",
      "Black",
      "Bright",
      "Hallow",
      "Iron",
      "Raven",
      "Stone",
      "Thorn",
      "Wolf",
      "Grey",
      "Oak",
      "Storm",
    ],
    [
      "ford",
      "wood",
      "hart",
      "well",
      "spire",
      "brook",
      "wick",
      "fist",
      "vale",
      "mantle",
      "crest",
      "bourne",
    ],
  ],
  elven: [
    [
      "Moon",
      "Silver",
      "Star",
      "Dawn",
      "Mist",
      "Sun",
      "Wind",
      "Leaf",
      "Gold",
      "Night",
      "Dew",
      "Swan",
    ],
    [
      "whisper",
      "leaf",
      "song",
      "bough",
      "shade",
      "glade",
      "petal",
      "brook",
      "veil",
      "wing",
      "light",
      "thorn",
    ],
  ],
  dwarven: [
    [
      "Iron",
      "Stone",
      "Copper",
      "Deep",
      "Granite",
      "Anvil",
      "Coal",
      "Gold",
      "Battle",
      "Rune",
      "Flint",
      "Bronze",
    ],
    [
      "fist",
      "helm",
      "beard",
      "hammer",
      "forge",
      "delve",
      "shield",
      "axe",
      "vein",
      "brow",
      "mantle",
      "hold",
    ],
  ],
  orcish: [
    [
      "Skull",
      "Bone",
      "Blood",
      "Iron",
      "Ash",
      "Gut",
      "Black",
      "Grim",
      "Rot",
      "War",
      "Tusk",
      "Scar",
    ],
    [
      "splitter",
      "crusher",
      "maw",
      "fang",
      "hide",
      "biter",
      "render",
      "claw",
      "gore",
      "tooth",
      "breaker",
      "eye",
    ],
  ],
  homely: [
    [
      "Tea",
      "Under",
      "Good",
      "Brandy",
      "Thistle",
      "Honey",
      "Apple",
      "Green",
      "Proud",
      "Bramble",
      "Hay",
      "Butter",
    ],
    [
      "leaf",
      "bough",
      "barrel",
      "foot",
      "down",
      "wick",
      "bottle",
      "hill",
      "field",
      "burrow",
      "gather",
      "brook",
    ],
  ],
};

const PLACE_SUFFIXES = [
  "mere",
  "hold",
  "ford",
  "wick",
  "reach",
  "vale",
  "haven",
  "fell",
  "march",
  "crest",
  "moor",
  "barrow",
];
const PLACE_FEATURES = [
  "Hollow",
  "Crossing",
  "Keep",
  "Falls",
  "Downs",
  "Rest",
  "Watch",
  "Gate",
];
const FACTION_ADJECTIVES = [
  "Ashen",
  "Silver",
  "Hollow",
  "Crimson",
  "Veiled",
  "Iron",
  "Gilded",
  "Last",
  "Quiet",
  "Sable",
  "Thorned",
  "Waking",
];
const FACTION_GROUPS = [
  "Concord",
  "Circle",
  "Compact",
  "Brotherhood",
  "Covenant",
  "Company",
  "Wardens",
  "Lantern-Bearers",
  "Assembly",
  "Guild",
  "Order",
  "Kindred",
];
const FACTION_EMBLEMS = [
  "Silver Thorn",
  "Broken Crown",
  "Pale Flame",
  "Seventh Gate",
  "Drowned Bell",
  "Iron Rose",
  "Last Lantern",
  "Hidden Star",
];
const ITEM_ADJECTIVES = [
  "Ashen",
  "Whispering",
  "Gilded",
  "Hollow",
  "Sunken",
  "Weeping",
  "Starforged",
  "Thorned",
  "Pale",
  "Unbroken",
];
const ITEM_OBJECTS = [
  "Lantern",
  "Blade",
  "Crown",
  "Chalice",
  "Mantle",
  "Horn",
  "Key",
  "Ring",
  "Codex",
  "Spear",
  "Mirror",
  "Compass",
];

function compound(
  style: keyof typeof COMPOUND_PARTS,
  rng: Rng,
  spread: PatternContext["spread"],
): string {
  const [first, second] = COMPOUND_PARTS[style];
  return pickFrom(first, rng) + spread(second);
}

function patronymicEnding(gender: string, rng: Rng): string {
  if (gender === "Feminine") return "dottir";
  if (gender === "Masculine") return "son";
  return rng() < 0.5 ? "son" : "dottir";
}

function celticPrefix(gender: string, rng: Rng): string {
  if (gender === "Feminine") return "Nic";
  if (gender === "Masculine") return "Mac";
  return rng() < 0.5 ? "Mac" : "Nic";
}

function surname(style: SurnameStyle, context: PatternContext): string {
  const { root, gender, rng } = context;
  switch (style) {
    case "patronymic":
      return root() + patronymicEnding(gender, rng);
    case "celtic":
      return `${celticPrefix(gender, rng)} ${root()}`;
    case "syllabic":
      return root();
    default:
      return compound(style, rng, context.spread);
  }
}

export interface PatternContext {
  culture: string;
  gender: string;
  nameType: string;
  parts: NameParts;
  /** One culture-flavoured syllabic name, e.g. "Vaelric". */
  root: () => string;
  /** A short culture-flavoured opening syllable, e.g. "Vael". */
  stem: () => string;
  /** Pick from a list, avoiding words already used in this batch. */
  spread: (list: readonly string[]) => string;
  rng: Rng;
}

/** One patterned name, or null when the culture has no patterns. */
export function patternedName(context: PatternContext): string | null {
  const style = SURNAME_STYLES[context.culture];
  if (!style) return null;
  const { root, rng, spread } = context;
  switch (context.nameType) {
    case "Place": {
      const place = context.stem() + spread(PLACE_SUFFIXES);
      return rng() < 0.65 ? place : `${place} ${pickFrom(PLACE_FEATURES, rng)}`;
    }
    case "Faction":
      return rng() < 0.6
        ? `The ${pickFrom(FACTION_ADJECTIVES, rng)} ${spread(FACTION_GROUPS)}`
        : `${spread(FACTION_GROUPS)} of the ${pickFrom(FACTION_EMBLEMS, rng)}`;
    case "Item":
      return rng() < 0.5
        ? `${root()}'s ${spread(ITEM_OBJECTS)}`
        : `The ${pickFrom(ITEM_ADJECTIVES, rng)} ${spread(ITEM_OBJECTS)}`;
    case "Person": {
      const first = root();
      if (context.parts === "first") return first;
      return `${first} ${surname(style, context)}`;
    }
    default:
      return root();
  }
}
