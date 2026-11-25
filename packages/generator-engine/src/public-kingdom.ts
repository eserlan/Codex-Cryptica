import { withPublicCreativeCue } from "./public-creative-diversity";
/**
 * Public Kingdom generator — framework-free port of the kingdom half of the
 * SEO kingdom/nation generator.
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parseKingdomResponse, and falls back to
 * generateKingdomLocal. Session context is injected as a string.
 */

import type { PublicGeneratorOutput } from "./public-generator-types";
import { NAME_BAN_PROMPT } from "./public-npc";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { buildRealmName, buildCapitalName } from "./realm-names";
import { formatCampaignContextBlock } from "./campaign-context";
import { buildKingdomDetails } from "./public-kingdom-details";
import { distinctNames } from "./public-social-hub";
import { withArticle } from "./public-settlement-community";

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
- Magic Level: ${resolved.magicLevel}${formatCampaignContextBlock(resolved.campaignContext)}
- Naming Directive: ${resolved.namingDirective}`;

  return {
    systemInstruction,
    userMessage: withPublicCreativeCue(userMessage, "place", rng),
    resolved,
  };
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

const KINGDOM_TABLE_USES = [
  (_title: string, prose: string) =>
    `Use ${prose} as the political backdrop for a campaign, the home of a patron, or the prize in a struggle for power. The hidden problem gives any visit a way to grow into something bigger.`,
  (title: string) =>
    `${title} works best as a pressure cooker: every faction the party works with is also playing against the others, and the hidden problem is what makes it personal.`,
  (_title: string, prose: string) =>
    `Drop the party into ${prose} when you need a setting with real political weight. They should be able to solve the immediate problems while making the underlying one worse.`,
  (_title: string, prose: string) =>
    `Use ${prose} as the backdrop for missions that seem self-contained but slowly reveal that everything connects to the hidden problem.`,
  (title: string) =>
    `${title} is most useful when the party has to choose a side, and each side has something worth supporting and something worth opposing.`,
] as const;

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The realm's name mid-sentence: "the Vorath Kingdom", not "The Vorath Kingdom". */
function realmInProse(title: string): string {
  return title.replace(/^The /, "the ");
}

export function generateKingdomLocal(
  options: KingdomGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveKingdom(options, rng);
  const trouble = pickFrom(kingdomConfig.troubles, rng);
  const [rulerName, factionRoot1, factionRoot2] = distinctNames(rng);
  const factionName1 = `The ${factionRoot1} ${pickFrom(["Order", "Council", "League", "Brotherhood", "Guild"], rng)}`;
  const factionName2 = `The ${factionRoot2} ${pickFrom(["Compact", "Circle", "Assembly", "Society", "House"], rng)}`;
  const realmName = buildRealmName(resolved.polityType, rng);
  const capitalName = buildCapitalName(rng);
  const realmProse = realmInProse(realmName);
  const details = buildKingdomDetails({ ...resolved, trouble }, rng);

  const summary = `${capitalise(withArticle(resolved.polityType.trim().toLowerCase()))} in ${details.setting}, ruled by ${details.ruledBy} and ${details.conflictState}.`;

  const content = `### The Realm
${realmName} lies in ${details.setting} and holds ${details.territory}. ${details.seat}, ${capitalName}, is ${details.capitalNote}.

### Government & Power
${details.power(rulerName)} ${details.magicLine} ${trouble}.

### Society & Culture
${details.society}

### How to use it at the table
${pickFrom(KINGDOM_TABLE_USES, rng)(realmName, realmProse)}`;

  const campaignSection = resolved.campaignContext
    ? `\n\n### Campaign Context\n${resolved.campaignContext}`
    : "";

  const lore = `### At a Glance
- **Polity Type**: ${resolved.polityType}
- **Ruler**: ${rulerName}, ${details.rulerNote}
- **Capital**: ${capitalName}, ${details.capitalNote}
- **Scale**: ${resolved.scale}
- **Magic Level**: ${resolved.magicLevel}
- **Conflict Level**: ${resolved.conflictLevel}
- **Hidden Problem**: ${trouble}
- **Immediate Hook**: ${details.hook}

### Major Factions
- **${factionName1}**: Controls ${details.resource}, and wants more say in how the realm is run
- **${factionName2}**: ${details.opposition}

### Rumours & Hooks
${details.rumours.map((rumour) => `- ${rumour}`).join("\n")}

### Entity Seeds
- **👤 ${rulerName} (ruler)**: Head of ${realmProse}, and the person the hidden problem threatens most.
- **👥 ${factionName1}**: The faction that holds ${details.resource}.
- **👥 ${factionName2}**: The ruler's main opposition.
- **📍 ${capitalName} (capital)**: ${capitalise(details.capitalNote)}.
- ${details.troubleSeed}${campaignSection}`;

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
