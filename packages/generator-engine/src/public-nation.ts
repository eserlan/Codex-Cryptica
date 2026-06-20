/**
 * Public Nation generator — framework-free port of the nation half of the SEO
 * kingdom/nation generator.
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parseNationResponse, and falls back to
 * generateNationLocal. Session context is injected as a string.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";

export type Rng = () => number;
const defaultRng: Rng = () => Math.random();

function pickFrom<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateName(rng: Rng = defaultRng): string {
  const prefixes = [
    "Ael",
    "Bran",
    "Cael",
    "Dax",
    "Kael",
    "Morg",
    "Thor",
    "Vael",
  ];
  const suffixes = ["dar", "wen", "ric", "mar", "thas", "gar", "rin", "on"];
  return `${pickFrom(prefixes, rng)}${pickFrom(suffixes, rng)}`;
}

const REALM_ROOTS = [
  "Ashenveil",
  "Stonemark",
  "Duskwall",
  "Irongate",
  "Coldmere",
  "Blackthorn",
  "Salthaven",
  "Greymarch",
  "Embervale",
  "Cinderfall",
  "Hollowreach",
  "Dunmere",
  "Thornwall",
  "Wraithfen",
  "Brokenridge",
  "Dawnspire",
  "Moorholt",
  "Saltfang",
  "Stormbreak",
  "Halveth",
  "Vorreth",
  "Kaelthas",
  "Myreth",
  "Vorath",
  "Dunrath",
  "Solvane",
  "Krethis",
  "Aelvorn",
  "Norrith",
  "Caldreth",
];

const CAPITAL_WORDS = [
  "Veth",
  "Dorn",
  "Rath",
  "Moor",
  "Holt",
  "Fen",
  "Wick",
  "Crest",
  "Gate",
  "Hold",
  "Keep",
  "Reach",
  "Wall",
  "Ford",
  "Vale",
];

function buildRealmName(polityType: string, rng: Rng): string {
  return `The ${pickFrom(REALM_ROOTS, rng)} ${polityType}`;
}

function buildCapitalName(rng: Rng): string {
  const a = pickFrom(REALM_ROOTS, rng).replace(/\s.*/, "").slice(0, 5);
  const b = pickFrom(CAPITAL_WORDS, rng);
  return `${a}${b.toLowerCase()}`;
}

export const nationConfig = {
  genres: [
    "Fantasy",
    "Dark Fantasy",
    "Pirate",
    "Cyberpunk",
    "Sci-Fi",
    "Modern",
    "Horror",
    "Post-Apocalyptic",
    "Western",
    "Steampunk",
    "Lancer",
    "Space Opera Resistance",
    "Optimistic Exploration Sci-Fi",
  ],
  polityTypesByGenre: {
    Fantasy: [
      "Kingdom",
      "Empire",
      "City-State",
      "Duchy",
      "Theocracy",
      "Tribal Confederation",
      "Republic",
      "Protectorate",
    ],
    "Dark Fantasy": [
      "Cursed Realm",
      "Necromancer's Domain",
      "Warlord Territory",
      "Fallen Empire",
      "Plague State",
    ],
    Pirate: [
      "Free Port",
      "Pirate Confederation",
      "Merchant Republic",
      "Privateer Kingdom",
      "Smuggler's Haven",
    ],
    Cyberpunk: [
      "Megacorp-State",
      "Gang Territory",
      "Free Zone",
      "Corporate Enclave",
      "Tech Oligarchy",
    ],
    "Sci-Fi": [
      "Interstellar Federation",
      "Colony Authority",
      "Trade Consortium",
      "Military Junta",
      "Hive Mind Territory",
    ],
    Modern: [
      "Nation-State",
      "Autonomous Region",
      "Rogue State",
      "International Bloc",
      "Failed State",
    ],
    Horror: [
      "Cursed Domain",
      "Cult Territory",
      "Isolated Community",
      "Shadow Government",
      "Quarantine Zone",
    ],
    "Post-Apocalyptic": [
      "Warlord Territory",
      "Survivor Settlement",
      "Cult Domain",
      "Scavenger Confederation",
      "Bunker State",
    ],
    Western: [
      "Territory",
      "Frontier Confederation",
      "Railroad Authority",
      "Outlaw Republic",
      "Native Nation",
    ],
    Steampunk: [
      "Industrial Empire",
      "Guild Confederacy",
      "Aetheric Protectorate",
      "Colonial Administration",
      "Airship Sovereignty",
    ],
    Lancer: [
      "Union Administrative Zone",
      "Colonial Provisional Authority",
      "Heterodox Mech Sovereignty",
      "Corporate Extraction Concession",
      "Liberation Council Territory",
    ],
    "Space Opera Resistance": [
      "Galactic Empire",
      "Planetary Republic",
      "Occupied Territory",
      "Federated System",
      "Rebel Alliance",
    ],
    "Optimistic Exploration Sci-Fi": [
      "United Planetary Federation",
      "Democratic Star Union",
      "Scientific Directorate",
      "Allied Worlds Council",
      "Neutral System Alliance",
    ],
  } as Record<string, string[]>,
  governmentStyles: [
    "Hereditary dynasty",
    "Elected council",
    "Military dictatorship",
    "Theocratic rule",
    "Oligarchy",
    "Constitutional government",
    "Tribal / clan elders",
    "Corporate board",
    "Revolutionary committee",
  ],
  scales: [
    "City-state (single settlement)",
    "Small region (handful of towns)",
    "Mid-sized nation",
    "Large empire (many provinces)",
    "Continent-spanning dominion",
  ],
  conflictLevels: [
    "At peace",
    "Simmering tensions",
    "Open conflict",
    "Total war",
    "Post-war recovery",
  ],
  troubles: [
    "The ruling class is fracturing over a succession crisis",
    "A powerful faction is quietly positioning to seize control",
    "An economic collapse is being hidden from the public",
    "A border dispute is being deliberately escalated by a third party",
    "A secret the ruler is keeping could delegitimise the entire state",
    "An internal resistance movement is closer to open revolt than anyone admits",
  ],
};

export interface NationGeneratorOptions {
  genre?: string;
  polityType?: string;
  governmentStyle?: string;
  scale?: string;
  conflictLevel?: string;
  campaignContext?: string;
}

export interface ResolvedNation {
  genre: string;
  polityType: string;
  governmentStyle: string;
  scale: string;
  conflictLevel: string;
  campaignContext?: string;
  varianceSeed: number;
}

export interface NationPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedNation;
}

function resolveNation(
  options: NationGeneratorOptions,
  rng: Rng,
): ResolvedNation {
  const genre = options.genre || pickFrom(nationConfig.genres, rng);
  const polityTypes =
    nationConfig.polityTypesByGenre[genre] ??
    nationConfig.polityTypesByGenre["Fantasy"];

  return {
    genre,
    polityType: options.polityType || pickFrom(polityTypes, rng),
    governmentStyle:
      options.governmentStyle || pickFrom(nationConfig.governmentStyles, rng),
    scale: options.scale || nationConfig.scales[2],
    conflictLevel:
      options.conflictLevel || pickFrom(nationConfig.conflictLevels, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    varianceSeed: Math.floor(rng() * 99991) + 10,
  };
}

export function buildNationPrompt(
  options: NationGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): NationPrompt {
  const resolved = resolveNation(options, rng);
  const systemInstruction = `You are an expert RPG campaign writer. You generate immediately usable political entities for tabletop GMs in JSON format. You write in the register of the specified genre — a cyberpunk megacorp-state reads nothing like a fantasy kingdom.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "The entity's name — genre-appropriate and invented. Fantasy: compound place-word or ancient-sounding root. Cyberpunk: corp acronym or district name. Sci-Fi: designation or colonial name. Avoid generic placeholders like 'Eldoria', 'The Republic', or 'New Earth'.",
  "summary": "One sentence: the entity's defining character and why a GM should use it.",
  "content": "Markdown. Use exactly these four section headers in order: '### The State', '### Power Structure', '### Society & Tensions', '### How to use it at the table'. Each section: 3-5 tight sentences. Write in the genre's register. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure:\\n### At a Glance\\n- **Type**: polity type\\n- **Leader / Authority**: name and one-line description (genre-appropriate)\\n- **Centre of Power**: name and one-line description\\n- **Scale**: territory/population summary\\n- **Conflict Level**: current state\\n- **Hidden Problem**: the tension simmering beneath the surface\\n- **Immediate Hook**: one-sentence GM hook\\n### Power Blocs\\n- **Name**: one-line description (2-3 factions/blocs)\\n### Rumours & Hooks\\n- short hook (2-3 bullet points)\\n### Entity Seeds\\n- list of 4-5 Codex entity types that naturally emerge from this state",
  "labels": ["2-4 lowercase genre-appropriate tags, plus 'rpg-nation', 'nation-generator', 'imported-draft'"]
}

QUALITY RULES:
- Everything — names, concerns, technology, terminology — must fit the genre.
- The leader/authority must have a name, a defining trait, and a secret motive.
- Each power bloc should have an agenda that creates tension.
- Rumours should be specific and actionable.
- Entity seeds should suggest concrete Codex entries a GM would actually create.
- ${NAME_BAN_PROMPT}
${sessionContext}`;

  const userMessage = `Generate a political entity. Variation seed: ${resolved.varianceSeed}.
- Genre / Setting: ${resolved.genre}
- Polity Type: ${resolved.polityType}
- Government Style: ${resolved.governmentStyle}
- Scale: ${resolved.scale}
- Conflict Level: ${resolved.conflictLevel}${resolved.campaignContext ? `\n- Campaign Context: ${resolved.campaignContext}` : ""}`;

  return { systemInstruction, userMessage, resolved };
}

export function parseNationResponse(text: string): PublicGeneratorOutput {
  const cleanText = text
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  const data = JSON.parse(cleanText);

  return {
    type: "faction",
    title: data.title || "The Unnamed State",
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-nation", "nation-generator", "imported-draft"],
    status: "active",
  };
}

export function generateNationLocal(
  options: NationGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveNation(options, rng);
  const trouble = pickFrom(nationConfig.troubles, rng);
  const leaderName = generateName(rng);
  const bloc1 = `The ${generateName(rng)} ${pickFrom(["Bloc", "Council", "Front", "Syndicate", "Coalition"], rng)}`;
  const bloc2 = `The ${generateName(rng)} ${pickFrom(["Faction", "Assembly", "Circle", "Committee", "Network"], rng)}`;
  const isFantasyGenre =
    resolved.genre === "Fantasy" ||
    resolved.genre === "Dark Fantasy" ||
    resolved.genre === "Pirate";
  const stateName = isFantasyGenre
    ? buildRealmName(resolved.polityType, rng)
    : `${generateName(rng).split(" ")[0]} ${resolved.polityType}`;
  const capitalName = isFantasyGenre
    ? buildCapitalName(rng)
    : generateName(rng).split(" ")[0];

  const summary = `A ${resolved.conflictLevel.toLowerCase()} ${resolved.polityType.toLowerCase()} operating under ${resolved.governmentStyle.toLowerCase()}.`;

  const content = `### The State
${stateName} is a ${resolved.scale.toLowerCase()} ${resolved.polityType.toLowerCase()} under ${resolved.governmentStyle.toLowerCase()}. Its centre of power, ${capitalName}, is where decisions are made and deals are struck.${resolved.campaignContext ? ` In ${resolved.campaignContext}, it is a key player in the main conflict.` : ""}

### Power Structure
${leaderName} holds authority, but that authority is contested. ${trouble}. Those closest to power know the cracks are showing.

### Society & Tensions
The population lives under a state at ${resolved.conflictLevel.toLowerCase()}. Loyalty is shifting, old alliances are being renegotiated, and the ruling structure is projecting strength it may not have.

### How to use it at the table
Use ${stateName} as a campaign backdrop, the source of a mission, or the prize in a power struggle. The hidden problem gives any encounter with its institutions the potential to spiral.`;

  const lore = `### At a Glance
- **Type**: ${resolved.polityType}
- **Leader / Authority**: ${leaderName} — in control, for now
- **Centre of Power**: ${capitalName}
- **Scale**: ${resolved.scale}
- **Conflict Level**: ${resolved.conflictLevel}
- **Hidden Problem**: ${trouble}
- **Immediate Hook**: A key official has gone silent — their office is stonewalling

### Power Blocs
- **${bloc1}**: Controls a critical resource or access point; wants formal recognition
- **${bloc2}**: Opposes the current leadership — quietly building leverage

### Rumours & Hooks
- ${leaderName} has been meeting with representatives of a rival power in secret
- A key installation went dark last week; the official explanation doesn't add up
- ${bloc1} is moving money through channels it has no business using

### Entity Seeds
- **👤 ${leaderName} (leader)**: The leader of the nation.
- **👥 ${bloc1}**: A key faction or power bloc.
- **👥 ${bloc2}**: A rival faction or power bloc.
- **📍 ${capitalName} (centre of power)**: The main centre of power.
- **📅 Crisis — ${trouble}**: The active campaign threat.`;

  return {
    type: "faction",
    title: stateName,
    summary,
    content,
    lore,
    labels: ["rpg-nation", "nation-generator", "imported-draft"],
    status: "active",
  };
}
