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
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { buildRealmName, buildCapitalName } from "./realm-names";

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
  const data = parseFencedJson<Record<string, unknown>>(text);
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

  const capitalRoles = [
    `Its capital, ${capitalName}, serves as the seat of power and the heart of its culture.`,
    `${capitalName}, the capital, is where the real decisions are made — usually behind closed doors.`,
    `Power flows through ${capitalName}: whoever controls the capital controls the realm, and everyone knows it.`,
    `The capital, ${capitalName}, is both the realm's showcase and its most contested ground.`,
    `${capitalName} holds the realm together. Whether it can continue to do so is another question.`,
  ] as const;

  const societyDescriptions = [
    `The population lives under the tension of a realm at ${resolved.conflictLevel.toLowerCase()}. Loyalty is currency, and old alliances are being quietly renegotiated. The ruling class projects stability but its grip is tested daily.`,
    `Life for most people means navigating the gap between what the realm officially is and what it actually is. At ${resolved.conflictLevel.toLowerCase()}, that gap is wide enough to fall through.`,
    `The people have learned to read the signs of a realm under strain. Prices shift, officials grow terse, and certain names stop appearing in public discourse. The current ${resolved.conflictLevel.toLowerCase()} is not invisible — it is just unspoken.`,
    `Beneath the official order, the real social compact runs on favors, precedent, and carefully maintained fictions. A realm at ${resolved.conflictLevel.toLowerCase()} puts all three under pressure simultaneously.`,
    `The ruling class has managed the realm's tensions long enough to be good at it. What they are not good at is admitting how much has changed.`,
  ] as const;

  const kingdomHowToUse = [
    (n: string) =>
      `Use ${n} as the political backdrop for a campaign, the origin of a patron, or the prize in a succession conflict. The hidden trouble gives any visit the potential to escalate into something bigger.`,
    (n: string) =>
      `${n} works best as a pressure cooker — a setting where every faction the party works with is also playing against every other. The hidden trouble is the thing that makes it personal.`,
    (n: string) =>
      `Drop the party into ${n} when you need a setting with genuine political weight. They should be able to solve immediate problems while making the underlying ones worse.`,
    (n: string) =>
      `Use ${n} as the backdrop for missions that seem self-contained but gradually reveal that everything connects to the realm's central crisis.`,
    (n: string) =>
      `${n} is most useful when the party has to choose a side — and every side has something genuinely worth supporting and something genuinely worth opposing.`,
  ] as const;

  const content = `### The Realm
${realmName} is a ${resolved.scale.toLowerCase()} ${resolved.polityType.toLowerCase()} occupying ${resolved.geography.toLowerCase()} terrain. ${pickFrom(capitalRoles, rng)}${resolved.campaignContext ? ` In ${resolved.campaignContext}, it sits at the centre of the main conflict.` : ""}

### Government & Power
${rulerName} leads through a system of ${resolved.governmentStyle.toLowerCase()}. The realm's magic level is ${resolved.magicLevel.toLowerCase()}, which shapes both its military capability and its social order. ${trouble}.

### Society & Culture
${pickFrom(societyDescriptions, rng)}

### How to use it at the table
${pickFrom(kingdomHowToUse, rng)(realmName)}`;

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
