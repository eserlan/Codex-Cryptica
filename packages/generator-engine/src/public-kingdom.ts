/**
 * Public Kingdom generator — framework-free port of the kingdom half of the
 * SEO kingdom/nation generator.
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parseKingdomResponse, and falls back to
 * generateKingdomLocal. Session context is injected as a string.
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

export const kingdomConfig = {
  polityTypes: [
    "Kingdom",
    "Empire",
    "City-State",
    "Duchy",
    "Theocracy",
    "Tribal Confederation",
    "Republic",
    "Protectorate",
  ],
  governmentStyles: [
    "Hereditary dynasty",
    "Elected council",
    "Military dictatorship",
    "Theocratic rule",
    "Oligarchy",
    "Constitutional government",
    "Tribal / clan elders",
  ],
  geographies: [
    "Temperate highlands",
    "Coastal plains",
    "Dense forest",
    "Arid desert",
    "Arctic tundra",
    "Island archipelago",
    "River delta",
    "Mountain range",
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
  magicLevels: [
    "No magic",
    "Rare and feared",
    "Common but regulated",
    "Widely practiced",
    "Magic-dependent society",
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

export interface KingdomGeneratorOptions {
  polityType?: string;
  governmentStyle?: string;
  geography?: string;
  scale?: string;
  conflictLevel?: string;
  magicLevel?: string;
  campaignContext?: string;
}

export interface ResolvedKingdom {
  polityType: string;
  governmentStyle: string;
  geography: string;
  scale: string;
  conflictLevel: string;
  magicLevel: string;
  campaignContext?: string;
  namingDirective: string;
  varianceSeed: number;
}

export interface KingdomPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedKingdom;
}

const KINGDOM_NAMING_STYLES = [
  "Use a compound place-word as the realm name (e.g. 'Ashenveil Kingdom', 'Irongate Empire', 'Duskwall Duchy').",
  "Use an ancient-sounding invented root as the realm name (e.g. 'Kaelthas', 'Vorath', 'Myreth Dominion').",
  "Use a short descriptive phrase as the realm name (e.g. 'The Iron March', 'The Sundered Coast', 'The Pale Reach').",
];

function resolveKingdom(
  options: KingdomGeneratorOptions,
  rng: Rng,
): ResolvedKingdom {
  return {
    polityType: options.polityType || pickFrom(kingdomConfig.polityTypes, rng),
    governmentStyle:
      options.governmentStyle || pickFrom(kingdomConfig.governmentStyles, rng),
    geography: options.geography || pickFrom(kingdomConfig.geographies, rng),
    scale: options.scale || kingdomConfig.scales[2],
    conflictLevel:
      options.conflictLevel || pickFrom(kingdomConfig.conflictLevels, rng),
    magicLevel: options.magicLevel || kingdomConfig.magicLevels[2],
    campaignContext: options.campaignContext?.trim() || undefined,
    namingDirective: pickFrom(KINGDOM_NAMING_STYLES, rng),
    varianceSeed: Math.floor(rng() * 99991) + 10,
  };
}

export function buildKingdomPrompt(
  options: KingdomGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): KingdomPrompt {
  const resolved = resolveKingdom(options, rng);
  const systemInstruction = `You are an expert RPG campaign writer. You generate immediately usable fantasy kingdoms and political entities for tabletop GMs in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "The realm's name — invented. Use one of: a compound place-word ('Ashenveil Kingdom', 'Stonemark Empire'), an ancient-sounding root ('Kaelthas', 'Vorath'), or a short descriptive ('The Iron March', 'The Sundered Coast'). Avoid 'Eldoria', 'Arandor', 'Valdris', and any name that sounds like a stock fantasy placeholder.",
  "summary": "One sentence: the kingdom's defining character and why a GM should use it.",
  "content": "Markdown. Use exactly these four section headers in order: '### The Realm', '### Government & Power', '### Society & Culture', '### How to use it at the table'. Each section: 3-5 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure:\\n### At a Glance\\n- **Polity Type**: ${resolved.polityType}\\n- **Ruler**: invented name and one-line description\\n- **Capital**: invented name and one-line description\\n- **Scale**: population/territory summary\\n- **Magic Level**: ${resolved.magicLevel}\\n- **Conflict Level**: ${resolved.conflictLevel}\\n- **Hidden Problem**: the tension simmering beneath the surface\\n- **Immediate Hook**: one-sentence GM hook\\n### Major Factions\\n- **Name**: one-line description (2-3 factions)\\n### Rumours & Hooks\\n- short hook (2-3 bullet points)\\n### Entity Seeds\\n- list of 4-5 Codex entity types (e.g. '**Character**: The regent', '**Faction**: The merchant guild', '**Location**: The capital city')",
  "labels": ["2-4 lowercase tags, plus 'rpg-kingdom', 'kingdom-generator', 'imported-draft'"]
}

QUALITY RULES:
- The ruler must have a name, a defining trait, and a secret motive.
- Each faction should have a clear agenda that creates tension with another faction.
- Rumours should be specific and actionable — something a party could investigate.
- Entity seeds should suggest concrete Codex entries a GM would actually create.
- All names must be invented — avoid generic English words as names.
- ${NAME_BAN_PROMPT}
${sessionContext}`;

  const userMessage = `Generate a fantasy kingdom. Variation seed: ${resolved.varianceSeed}.
- Polity Type: ${resolved.polityType}
- Government Style: ${resolved.governmentStyle}
- Geography: ${resolved.geography}
- Scale: ${resolved.scale}
- Conflict Level: ${resolved.conflictLevel}
- Magic Level: ${resolved.magicLevel}${resolved.campaignContext ? `\n- Campaign Context: ${resolved.campaignContext}` : ""}
- Naming Directive: ${resolved.namingDirective}`;

  return { systemInstruction, userMessage, resolved };
}

export function parseKingdomResponse(text: string): PublicGeneratorOutput {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  const data = JSON.parse(cleanText) as Record<string, unknown>;
  return {
    type: "faction",
    title: typeof data.title === "string" ? data.title : "The Unnamed Realm",
    summary: typeof data.summary === "string" ? data.summary : "",
    content: typeof data.content === "string" ? data.content : "",
    lore: typeof data.lore === "string" ? data.lore : "",
    labels: Array.isArray(data.labels)
      ? data.labels.filter(
          (label): label is string => typeof label === "string",
        )
      : ["rpg-kingdom", "kingdom-generator", "imported-draft"],
    status: "active",
  };
}

export function generateKingdomLocal(
  options: KingdomGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveKingdom(options, rng);
  const trouble = pickFrom(kingdomConfig.troubles, rng);
  const rulerName = generateName(rng);
  const factionName1 = `The ${generateName(rng)} ${pickFrom(["Order", "Council", "League", "Brotherhood", "Guild"], rng)}`;
  const factionName2 = `The ${generateName(rng)} ${pickFrom(["Compact", "Circle", "Assembly", "Society", "House"], rng)}`;
  const realmName = buildRealmName(resolved.polityType, rng);
  const capitalName = buildCapitalName(rng);

  const summary = `A ${resolved.conflictLevel.toLowerCase()} ${resolved.polityType.toLowerCase()} set in ${resolved.geography.toLowerCase()}, ruled by a ${resolved.governmentStyle.toLowerCase()}.`;

  const content = `### The Realm
${realmName} is a ${resolved.scale.toLowerCase()} ${resolved.polityType.toLowerCase()} occupying ${resolved.geography.toLowerCase()} terrain. Its capital, ${capitalName}, serves as the seat of power and the heart of its culture.${resolved.campaignContext ? ` In ${resolved.campaignContext}, it sits at the centre of the main conflict.` : ""}

### Government & Power
${rulerName} leads through a system of ${resolved.governmentStyle.toLowerCase()}. The realm's magic level is ${resolved.magicLevel.toLowerCase()}, which shapes both its military capability and its social order. ${trouble}.

### Society & Culture
The population lives under the tension of a realm at ${resolved.conflictLevel.toLowerCase()}. Loyalty is currency, and old alliances are being quietly renegotiated. The ruling class projects stability but its grip is tested daily.

### How to use it at the table
Use ${realmName} as the political backdrop for a campaign, the origin of a patron, or the prize in a succession conflict. The hidden trouble gives any visit the potential to escalate into something bigger.`;

  const lore = `### At a Glance
- **Polity Type**: ${resolved.polityType}
- **Ruler**: ${rulerName} — calculating, cautious, and sitting on a secret
- **Capital**: ${capitalName} — walled, busy, and watched
- **Scale**: ${resolved.scale}
- **Magic Level**: ${resolved.magicLevel}
- **Conflict Level**: ${resolved.conflictLevel}
- **Hidden Problem**: ${trouble}
- **Immediate Hook**: A royal messenger arrived three days ago and has not been seen since

### Major Factions
- **${factionName1}**: Controls access to the realm's key resource and wants more influence at court
- **${factionName2}**: Opposes the current ruler — quietly, for now

### Rumours & Hooks
- The ruler has been sending unmarked correspondence to a foreign power
- A border garrison was found abandoned — no bodies, no signs of battle
- ${factionName1} is recruiting outside its usual membership

### Entity Seeds
- **👤 ${rulerName} (ruler)**: The ruler of the kingdom.
- **👥 ${factionName1}**: A major faction within the kingdom.
- **👥 ${factionName2}**: A rival faction within the kingdom.
- **📍 ${capitalName} (capital)**: The capital city.
- **📅 Crisis behind ${trouble.split("—")[0].trim()}**: The active campaign threat.`;

  return {
    type: "faction",
    title: realmName,
    summary,
    content,
    lore,
    labels: ["rpg-kingdom", "kingdom-generator", "imported-draft"],
    status: "active",
  };
}
