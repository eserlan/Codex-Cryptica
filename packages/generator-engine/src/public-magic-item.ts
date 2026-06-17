/**
 * Public Magic Item generator — framework-free port of the SEO magic-item
 * generator (`apps/web/src/lib/services/seo/generators/magic-item.ts`).
 *
 * Framework-free per the unification plan (#1351): no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parseMagicItemResponse, and falls back to
 * generateMagicItemLocal. Session context is injected as a string.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";

export type Rng = () => number;
const defaultRng: Rng = () => Math.random();

function pickFrom<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)];
}

export const magicItemConfig = {
  types: [
    "Weapon",
    "Armor",
    "Wand",
    "Ring",
    "Amulet",
    "Potion",
    "Scroll",
    "Wondrous Item",
  ],
  rarities: ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"],
  properties: [
    "Glows faintly in the presence of undead, flashing red when danger is close.",
    "Whispers ancient prophecies to the wearer in their sleep, which are usually vague.",
    "Allows the user to speak with small forest animals, but they only talk about food.",
    "Increases the user's running speed, but leaves a trail of harmless sparks.",
    "Can store a single memory to be retrieved later by touching the surface.",
    "Grants resistance to cold, but the wearer always feels slightly chilly inside.",
  ],
  histories: [
    "Forged in the heart of a dying star by ancient dwarven smiths of old.",
    "Recovered from the hoard of a red dragon that ravaged the northern kingdoms.",
    "Worn by a legendary paladin who fell during the Siege of Shadowkeep.",
    "Discovered inside a hollow tree trunk deep within the Feywild.",
    "Created by a mad wizard who vanished into their own pocket dimension.",
  ],
};

export interface MagicItemGeneratorOptions {
  type?: string;
  rarity?: string;
}

interface ResolvedMagicItem {
  itemType: string;
  rarity: string;
  name: string;
}

function resolveMagicItem(
  options: MagicItemGeneratorOptions,
  rng: Rng,
): ResolvedMagicItem {
  const itemType = options.type || pickFrom(magicItemConfig.types, rng);
  const rarity = options.rarity || pickFrom(magicItemConfig.rarities, rng);

  const namePrefixes = [
    "Dread",
    "Aether",
    "Frost",
    "Shadow",
    "Soul",
    "Solar",
    "Storm",
    "Whisper",
    "Rune",
  ];
  const nameSuffixes = [
    "bringer",
    "weaver",
    "ward",
    "shard",
    "reaper",
    "binder",
    "heart",
    "caller",
  ];
  const baseName = pickFrom(namePrefixes, rng) + pickFrom(nameSuffixes, rng);

  return { itemType, rarity, name: `${baseName} (${itemType})` };
}

export interface MagicItemPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedMagicItem;
}

export function buildMagicItemPrompt(
  options: MagicItemGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): MagicItemPrompt {
  const resolved = resolveMagicItem(options, rng);
  const { name, itemType, rarity } = resolved;

  const userMessage = `Generate a detailed RPG Magic Item in JSON format.
Options:
- Name: ${name}
- Type: ${itemType}
- Rarity: ${rarity}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single string for the magic item name",
  "content": "A detailed description (markdown formatted) describing the item's appearance, materials, and passive feelings when held.",
  "lore": "Structured GM details (markdown formatted) detailing its magical properties, rarity, curse (if any), and legendary backstory.",
  "labels": ["rpg-item", "imported-draft"]
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

export function parseMagicItemResponse(
  text: string,
  resolved: ResolvedMagicItem,
): PublicGeneratorOutput {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  const data = JSON.parse(cleanText);
  return {
    type: "item",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-item", "imported-draft"],
    status: "active",
  };
}

export function generateMagicItemLocal(
  options: MagicItemGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const { itemType, rarity, name } = resolveMagicItem(options, rng);
  const property = pickFrom(magicItemConfig.properties, rng);
  const history = pickFrom(magicItemConfig.histories, rng);

  const content = `### Description
The ${name} is a uniquely crafted ${itemType.toLowerCase()} that displays a high degree of precision in its construction. Made from materials rare to this region, it feels slightly warm or cool to the touch depending on the active wielder's alignment.`;

  const lore = `### GM Reference Information
- **Type**: ${itemType}
- **Rarity**: ${rarity}

### Magical Properties
- **Passive Effect**: ${property}

### Lore & History
${history}`;

  return {
    type: "item",
    title: name,
    summary: "",
    content,
    lore,
    labels: ["rpg-item", "imported-draft"],
    status: "active",
  };
}
