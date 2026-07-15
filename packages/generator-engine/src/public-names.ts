/**
 * Public names generator — framework-free port of the SEO names generator.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";

export const nameGeneratorConfig = {
  cultures: [
    "Generic Fantasy",
    "High Elf",
    "Dark Elf",
    "Dwarven",
    "Halfling",
    "Orcish",
    "Norse / Viking",
    "Roman / Latin",
    "Celtic / Gaelic",
    "Eastern / Asian-inspired",
    "Coastal Common",
    "Island Creole",
    "Sailor's Nickname",
    "Naval Officer",
    "Privateer Alias",
    "Dockside Trade Name",
    "Sea-Cult Liturgical",
    "High-Seas Epithet",
    "Free-Port Mixed",
    "Weird-Sea Relic",
  ],
  culturesByTheme: {
    "Classic Fantasy": [
      "Generic Fantasy",
      "High Elf",
      "Dark Elf",
      "Dwarven",
      "Halfling",
      "Orcish",
      "Norse / Viking",
      "Roman / Latin",
      "Celtic / Gaelic",
      "Eastern / Asian-inspired",
    ],
    "Cyberpunk / Corporate": [
      "Street Handle",
      "Corporate Professional",
      "Japanese-inspired",
      "Eastern European",
      "Latin American",
      "Synthetic / AI",
      "Gang / Crew",
      "Hacker Alias",
    ],
    "Vampire / Gothic Noir": [
      "Old European Aristocracy",
      "Victorian English",
      "French Gothic",
      "Romanian / Slavic",
      "Italian Renaissance",
      "Secret Society",
      "Occult / Latin",
    ],
    "Sci-Fi / Space Opera": [
      "Colonial Human",
      "Alien-sounding",
      "Station-born",
      "Military Call Sign",
      "Megacorp Branding",
      "Synthetic / Android",
      "Starship Names",
    ],
    "Modern Conspiracy": [
      "American",
      "British",
      "Cover Identity",
      "Codename",
      "Eastern European",
      "Agency Alias",
    ],
    "Post-Apocalyptic": [
      "Wasteland Moniker",
      "Scavver Nickname",
      "Pre-War Surname",
      "Tribal",
      "Raider Handle",
      "Vault-born",
    ],
    Pirate: [
      "Coastal Common",
      "Island Creole",
      "Sailor's Nickname",
      "Naval Officer",
      "Privateer Alias",
      "Dockside Trade Name",
      "Sea-Cult Liturgical",
      "High-Seas Epithet",
      "Free-Port Mixed",
      "Weird-Sea Relic",
    ],
  } as Record<string, string[]>,
  genders: ["Any", "Masculine", "Feminine", "Neutral / Ambiguous"],
  nameTypes: ["Person", "Place", "Faction", "Item"],
  culturePrefixes: {
    "Generic Fantasy": [
      "Ael",
      "Bran",
      "Cael",
      "Dax",
      "El",
      "Fael",
      "Kael",
      "Lyr",
      "Morg",
      "Nal",
      "Thor",
      "Vael",
    ],
    "High Elf": [
      "Aer",
      "Caer",
      "El",
      "Gal",
      "Ith",
      "Lae",
      "Mir",
      "Sil",
      "Thal",
      "Var",
      "Wyn",
      "Zin",
    ],
    "Dark Elf": [
      "Driz",
      "Mal",
      "Nath",
      "Riz",
      "Sol",
      "Szor",
      "Ul",
      "Vir",
      "Xan",
      "Zaer",
      "Zin",
      "Vy",
    ],
    Dwarven: [
      "Bal",
      "Dur",
      "Glor",
      "Grim",
      "Kat",
      "Kaz",
      "Mag",
      "Nar",
      "Thor",
      "Tor",
      "Ulf",
      "Vor",
    ],
    Halfling: [
      "Bil",
      "Cor",
      "Del",
      "Fil",
      "Gob",
      "Mer",
      "Pip",
      "Rose",
      "Sam",
      "Tom",
      "Wil",
      "Bun",
    ],
    Orcish: [
      "Druk",
      "Grak",
      "Grom",
      "Krag",
      "Mog",
      "Nar",
      "Rok",
      "Skul",
      "Thok",
      "Urg",
      "Vrak",
      "Zug",
    ],
    "Norse / Viking": [
      "Arn",
      "Bjor",
      "Dag",
      "Eil",
      "Gunn",
      "Hal",
      "Ing",
      "Leif",
      "Rag",
      "Sigr",
      "Thor",
      "Ulf",
    ],
    "Roman / Latin": [
      "Aem",
      "Aur",
      "Bru",
      "Cal",
      "Cas",
      "Cor",
      "Flav",
      "Jul",
      "Marc",
      "Octa",
      "Sext",
      "Val",
    ],
    "Celtic / Gaelic": [
      "Aed",
      "Bran",
      "Caill",
      "Conn",
      "Donn",
      "Eoch",
      "Fearg",
      "Niall",
      "Ruad",
      "Taig",
      "Uar",
      "Cunn",
    ],
    "Eastern / Asian-inspired": [
      "Akira",
      "Chen",
      "Hiro",
      "Jin",
      "Kai",
      "Li",
      "Ren",
      "Ryu",
      "Shen",
      "Tao",
      "Wei",
      "Zhen",
    ],
    "Coastal Common": [
      "Cal",
      "Cor",
      "El",
      "Jas",
      "Mar",
      "Mara",
      "Ner",
      "Oren",
      "Rin",
      "Sela",
      "Tav",
      "Vey",
    ],
    "Island Creole": [
      "Ayo",
      "Bela",
      "Caro",
      "Davi",
      "Imara",
      "Kesi",
      "Luma",
      "Niko",
      "Suri",
      "Toma",
      "Yara",
      "Zemi",
    ],
    "Sailor's Nickname": [
      "Black",
      "Blue",
      "Brass",
      "Cinder",
      "Gale",
      "Lantern",
      "Red",
      "Salt",
      "Storm",
      "Tide",
      "Weather",
      "Wreck",
    ],
    "Naval Officer": [
      "Al",
      "Bel",
      "Cor",
      "Dun",
      "Esm",
      "Farr",
      "Garr",
      "Hal",
      "Mar",
      "Or",
      "Ser",
      "Val",
    ],
    "Privateer Alias": [
      "Ash",
      "Crown",
      "Dagger",
      "Fox",
      "Grey",
      "Iron",
      "Jade",
      "Kestrel",
      "Morrow",
      "Night",
      "Quill",
      "Vigil",
    ],
    "Dockside Trade Name": [
      "Anchor",
      "Barrel",
      "Copper",
      "Crate",
      "Gull",
      "Keel",
      "Ledger",
      "Mast",
      "Net",
      "Rope",
      "Tallow",
      "Wharf",
    ],
    "Sea-Cult Liturgical": [
      "Abyss",
      "Brine",
      "Drowned",
      "Ebb",
      "Foam",
      "Moon",
      "Pearl",
      "Reef",
      "Salt",
      "Tide",
      "Undertow",
      "Wave",
    ],
    "High-Seas Epithet": [
      "Captain",
      "Commodore",
      "First",
      "Old",
      "Red",
      "Saint",
      "Sable",
      "Seven",
      "Silver",
      "Three",
      "True",
      "Widow",
    ],
    "Free-Port Mixed": [
      "Ari",
      "Bex",
      "Caro",
      "Dax",
      "Eli",
      "Fara",
      "Juno",
      "Kato",
      "Lio",
      "Mina",
      "Rafe",
      "Zara",
    ],
    "Weird-Sea Relic": [
      "Astra",
      "Cair",
      "Dread",
      "Elder",
      "Fath",
      "Gloam",
      "Harrow",
      "Lumen",
      "Mire",
      "Nacre",
      "Thal",
      "Vesper",
    ],
  } as Record<string, string[]>,
  cultureSuffixes: {
    "Generic Fantasy": [
      "dar",
      "eth",
      "gorn",
      "ius",
      "mar",
      "morn",
      "ra",
      "ric",
      "thas",
      "val",
      "wen",
      "thor",
    ],
    "High Elf": [
      "ael",
      "aith",
      "ara",
      "ath",
      "elan",
      "iath",
      "ien",
      "ira",
      "is",
      "ith",
      "on",
      "rial",
    ],
    "Dark Elf": [
      "ace",
      "arn",
      "bra",
      "dra",
      "fein",
      "ica",
      "inae",
      "ra",
      "rix",
      "ssa",
      "tra",
      "vra",
    ],
    Dwarven: [
      "ak",
      "ald",
      "ar",
      "ek",
      "im",
      "in",
      "kin",
      "nar",
      "rek",
      "rim",
      "rin",
      "uk",
    ],
    Halfling: [
      "ble",
      "boro",
      "buck",
      "fast",
      "foot",
      "fur",
      "good",
      "hill",
      "penny",
      "seed",
      "wise",
      "wool",
    ],
    Orcish: [
      "ash",
      "dar",
      "gash",
      "grak",
      "gruk",
      "kul",
      "lash",
      "mok",
      "rak",
      "skrag",
      "thak",
      "ugh",
    ],
    "Norse / Viking": [
      "ald",
      "bjorn",
      "dís",
      "eit",
      "gar",
      "helm",
      "nar",
      "rún",
      "stein",
      "ulf",
      "vald",
      "var",
    ],
    "Roman / Latin": [
      "anus",
      "ella",
      "ia",
      "ianus",
      "illa",
      "ina",
      "inus",
      "io",
      "ius",
      "lia",
      "ona",
      "us",
    ],
    "Celtic / Gaelic": [
      "ach",
      "all",
      "an",
      "ard",
      "as",
      "dha",
      "ech",
      "en",
      "inn",
      "on",
      "ua",
      "ugh",
    ],
    "Eastern / Asian-inspired": [
      "bo",
      "fa",
      "ji",
      "ko",
      "lan",
      "lei",
      "li",
      "mei",
      "na",
      "ro",
      "shi",
      "xia",
    ],
    "Coastal Common": [
      "a",
      "an",
      "el",
      "en",
      "et",
      "ia",
      "in",
      "is",
      "o",
      "ora",
      "ar",
      "a",
    ],
    "Island Creole": [
      "do",
      "la",
      "li",
      "mi",
      "na",
      "ni",
      "ko",
      "ra",
      "ro",
      "se",
      "ta",
      "ya",
    ],
    "Sailor's Nickname": [
      "fin",
      "hand",
      "hook",
      "mark",
      "runner",
      "sail",
      "song",
      "tide",
      "wake",
      "ward",
      "watch",
      "wind",
    ],
    "Naval Officer": [
      "aine",
      "court",
      "ford",
      "grave",
      "ley",
      "mere",
      "mont",
      "ric",
      "ton",
      "ward",
      "well",
      "wick",
    ],
    "Privateer Alias": [
      "bane",
      "crest",
      "drift",
      "fall",
      "glass",
      "lock",
      "mark",
      "shade",
      "spear",
      "wake",
      "ward",
      "wing",
    ],
    "Dockside Trade Name": [
      "house",
      "keeper",
      "line",
      "man",
      "mouth",
      "scale",
      "song",
      "trade",
      "turner",
      "watch",
      "wright",
      "yard",
    ],
    "Sea-Cult Liturgical": [
      "born",
      "caller",
      "choir",
      "fall",
      "keeper",
      "mouth",
      "prayer",
      "reader",
      "singer",
      "tide",
      "veil",
      "ward",
    ],
    "High-Seas Epithet": [
      "Ash",
      "Bell",
      "Crown",
      "Eye",
      "Fin",
      "Gale",
      "Hand",
      "Jack",
      "Mast",
      "Pike",
      "Sable",
      "Star",
    ],
    "Free-Port Mixed": [
      "a",
      "bel",
      "do",
      "en",
      "ia",
      "in",
      "is",
      "o",
      "ra",
      "ri",
      "ta",
      "ya",
    ],
    "Weird-Sea Relic": [
      "ael",
      "ane",
      "ara",
      "eth",
      "eus",
      "ion",
      "is",
      "or",
      "oth",
      "os",
      "une",
      "yra",
    ],
  } as Record<string, string[]>,
};

export interface NamesGeneratorOptions {
  theme?: string;
  culture?: string;
  gender?: string;
  nameType?: string;
  count?: string;
  context?: string;
}

export interface ResolvedNames {
  culture: string;
  gender: string;
  nameType: string;
  count: number;
  context?: string;
  entityType: PublicGeneratorOutput["type"];
  title: string;
}

export interface NamesPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedNames;
}

function entityTypeForNameType(
  nameType: string,
): PublicGeneratorOutput["type"] {
  return nameType === "Place"
    ? "location"
    : nameType === "Faction"
      ? "faction"
      : nameType === "Item"
        ? "item"
        : "character";
}

function resolveNames(options: NamesGeneratorOptions): ResolvedNames {
  const culture = options.culture || nameGeneratorConfig.cultures[0];
  const gender = options.gender || nameGeneratorConfig.genders[0];
  const nameType = options.nameType || nameGeneratorConfig.nameTypes[0];
  const count = Math.max(1, parseInt(options.count || "10", 10) || 10);
  return {
    culture,
    gender,
    nameType,
    count,
    context: options.context?.trim() || undefined,
    entityType: entityTypeForNameType(nameType),
    title: `${culture} Names — ${nameType}`,
  };
}

export function buildNamesPrompt(
  options: NamesGeneratorOptions = {},
): NamesPrompt {
  const resolved = resolveNames(options);
  const { culture, gender, nameType, count, context } = resolved;
  const userMessage = `Generate ${count} ${nameType.toLowerCase()} names for a tabletop RPG in JSON format.
Options:
${options.theme ? `- Setting / Genre: ${options.theme} — names must fit this genre's conventions.\n` : ""}- Culture / Style: ${culture}
- Gender / Presentation: ${gender}
- Name Type: ${nameType}
- Count: ${count}
${context ? `- Context: ${context}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "content": "A brief lead sentence describing the naming style, followed by a markdown list of all ${count} names. Format each name as '- **Name**: one-sentence flavour note'.",
  "lore": "GM notes (markdown formatted) with sections for Culture, Style, and Usage Suggestions covering how to use these names in a campaign.",
  "labels": ["fantasy-name", "name-generator", "imported-draft"]
}
${NAME_BAN_PROMPT}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

export function parseNamesResponse(
  text: string,
  resolved: ResolvedNames,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: resolved.entityType,
    title: resolved.title,
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["fantasy-name", "name-generator", "imported-draft"],
    status: "active",
  };
}

export function generateNamesLocal(
  options: NamesGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveNames(options);
  const prefixes =
    nameGeneratorConfig.culturePrefixes[resolved.culture] ||
    nameGeneratorConfig.culturePrefixes["Generic Fantasy"];
  const suffixes =
    nameGeneratorConfig.cultureSuffixes[resolved.culture] ||
    nameGeneratorConfig.cultureSuffixes["Generic Fantasy"];

  const generated: string[] = [];
  for (let i = 0; i < resolved.count; i++) {
    const prefix = pickFrom(prefixes, rng);
    const suffix = pickFrom(suffixes, rng);
    generated.push(prefix.charAt(0).toUpperCase() + prefix.slice(1) + suffix);
  }

  const nameList = generated
    .map(
      (n) =>
        `- **${n}**: Traditional ${resolved.culture} style ${resolved.nameType.toLowerCase()} name.`,
    )
    .join("\n");

  const content = `These names represent the traditional ${resolved.culture} style for ${resolved.nameType.toLowerCase()}s, filtered for a ${resolved.gender.toLowerCase()} register.\n\n${nameList}`;

  const lore = `### Generator Settings
- **Culture**: ${resolved.culture}
- **Gender / Presentation**: ${resolved.gender}
- **Name Type**: ${resolved.nameType}

### Usage Suggestions
Use these names for any ${resolved.nameType.toLowerCase()} in a ${resolved.culture.toLowerCase()}-influenced setting. Combine or modify them freely — drop a syllable, add a prefix, or append a title or epithet for variation.`;

  return {
    type: resolved.entityType,
    title: resolved.title,
    content,
    lore,
    labels: ["fantasy-name", "name-generator", "imported-draft"],
    status: "active",
  };
}
