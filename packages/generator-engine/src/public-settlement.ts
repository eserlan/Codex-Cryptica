/**
 * Public Settlement / Location generator — framework-free port of the SEO
 * settlement generator (`apps/web/src/lib/services/seo/generators/settlement.ts`).
 *
 * Framework-free per the unification plan (#1351): no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parseSettlementResponse, and falls back to
 * generateSettlementLocal. Session context is injected as a string.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";

export type Rng = () => number;
const defaultRng: Rng = () => Math.random();

function pickFrom<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function getRandomItems<T>(
  arr: readonly T[],
  count: number,
  rng: Rng = defaultRng,
): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export const settlementConfig = {
  sizes: [
    { name: "Hamlet", range: "50-100 inhabitants", pointsOfInterestCount: 1 },
    { name: "Village", range: "100-500 inhabitants", pointsOfInterestCount: 2 },
    { name: "Town", range: "500-5000 inhabitants", pointsOfInterestCount: 3 },
    { name: "City", range: "5000-20000 inhabitants", pointsOfInterestCount: 4 },
  ],
  economies: [
    "Agriculture",
    "Mining",
    "Trade Hub",
    "Fishing",
    "Black Market",
    "Arcane Study",
  ],
  governments: [
    "Council of Elders",
    "Feudal Lord",
    "Merchant Oligarchy",
    "Military Dictatorship",
    "Democracy",
    "Magocracy",
  ],
  notableLocations: [
    "The Rusty Anchor Tavern",
    "Temple of the Sun",
    "Grand Archive",
    "Whispering Woods Gate",
    "Vault of Secrets",
    "Alchemist's Greenhouse",
    "Market Bazaar",
    "Ruined Watchtower",
  ],
  factions: [
    "The Iron Shield Guard",
    "The Shadow Thieves Guild",
    "The Whispering Monks",
    "The Gilded Merchants",
    "The Arcane Assembly",
  ],
};

export interface SettlementGeneratorOptions {
  size?: string;
  economy?: string;
}

interface ResolvedSettlement {
  size: string;
  population: string;
  pointsOfInterestCount: number;
  economy: string;
  name: string;
}

function resolveSettlement(
  options: SettlementGeneratorOptions,
  rng: Rng,
): ResolvedSettlement {
  const sizeConfig =
    settlementConfig.sizes.find((s) => s.name === options.size) ||
    pickFrom(settlementConfig.sizes, rng);
  const economy = options.economy || pickFrom(settlementConfig.economies, rng);

  const namePrefixes = [
    "Cinderwall",
    "Stonebridge",
    "Coppergate",
    "Ashveil",
    "Saltmarsh",
    "Redthorn",
    "Greywarden",
    "Deepwell",
  ];
  const nameSuffixes = [
    " Crossing",
    " Keep",
    " Village",
    " Town",
    " Harbour",
    " Hollow",
    " Falls",
    " Ridge",
  ];

  return {
    size: sizeConfig.name,
    population: sizeConfig.range,
    pointsOfInterestCount: sizeConfig.pointsOfInterestCount,
    economy,
    name: pickFrom(namePrefixes, rng) + pickFrom(nameSuffixes, rng),
  };
}

export interface SettlementPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedSettlement;
}

export function buildSettlementPrompt(
  options: SettlementGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): SettlementPrompt {
  const resolved = resolveSettlement(options, rng);
  const { name, size, population, economy } = resolved;

  const userMessage = `Generate a detailed RPG Settlement in JSON format.
Options:
- Name: ${name}
- Size: ${size} (${population})
- Primary Economy: ${economy}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single string for the settlement name",
  "content": "A detailed multi-paragraph description (markdown formatted) describing the settlement's atmosphere, layout, and geography.",
  "lore": "Structured GM details (markdown formatted). Use EXACTLY this structure with ### headers and '- **Label**: Value' list items:\n### GM Reference Information\n- **Size**: size with population\n- **Primary Economy**: economy summary\n- **Government**: government type\n\n### Points of Interest\n- **📍 Location Name**: one-line purpose or detail (1-4 items)\n\n### Controlling Factions\n- **👥 Faction Name**: one-line influence summary",
  "labels": ["rpg-location", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

export function parseSettlementResponse(
  text: string,
  resolved: ResolvedSettlement,
): PublicGeneratorOutput {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  const data = JSON.parse(cleanText);
  return {
    type: "location",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-location", "imported-draft"],
    status: "active",
  };
}

export function generateSettlementLocal(
  options: SettlementGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const { size, population, economy, pointsOfInterestCount, name } =
    resolveSettlement(options, rng);
  const government = pickFrom(settlementConfig.governments, rng);
  const faction = pickFrom(settlementConfig.factions, rng);
  const locs = getRandomItems(
    settlementConfig.notableLocations,
    pointsOfInterestCount,
    rng,
  );

  const content = `### Description
${name} is a thriving ${size.toLowerCase()} situated along major geography channels. Its local architecture features sturdy foundations tailored to the environment, and its streets are active with citizens going about their daily routines.

### Atmosphere
The air is filled with the smells of local industries, and visitors are greeted with a blend of curiosity and wariness depending on the active hour. The economy is heavily focused on ${economy.toLowerCase()} operations, serving as the main source of income for local families.`;

  const lore = `### GM Reference Information
- **Size**: ${size} (${population})
- **Primary Economy**: ${economy}
- **Government**: ${government}

### Points of Interest
${locs.map((l) => `- **📍 ${l}**: A crucial hub of local activity.`).join("\n")}

### Controlling Factions
- **👥 ${faction}**: Maintains significant influence over the local district's rules and affairs.`;

  return {
    type: "location",
    title: name,
    summary: "",
    content,
    lore,
    labels: ["rpg-location", "imported-draft"],
    status: "active",
  };
}
