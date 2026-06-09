import type { DefaultAIClientManager } from "$lib/services/ai/client-manager";
import type { GeneratorOutput } from "./base";

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

export async function generateMagicItem(
  clientManager: DefaultAIClientManager,
  options: {
    type?: string;
    rarity?: string;
    useAI?: boolean;
  } = {},
): Promise<GeneratorOutput> {
  const itemType =
    options.type ||
    magicItemConfig.types[
      Math.floor(Math.random() * magicItemConfig.types.length)
    ];
  const rarity =
    options.rarity ||
    magicItemConfig.rarities[
      Math.floor(Math.random() * magicItemConfig.rarities.length)
    ];

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
  const baseName =
    namePrefixes[Math.floor(Math.random() * namePrefixes.length)] +
    nameSuffixes[Math.floor(Math.random() * nameSuffixes.length)];
  const name = `${baseName} (${itemType})`;

  if (options.useAI !== false) {
    try {
      const prompt = `Generate a detailed RPG Magic Item in JSON format.
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
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

      const model = await clientManager.getModel(
        "",
        "gemini-3.1-flash-lite",
        "You are an assistant that generates detailed RPG campaign elements in JSON format.",
      );
      const response = await model.generateContent(prompt);
      const text = response.response.text().trim();
      const cleanText = text
        .replace(/^```json\s*/i, "")
        .replace(/```$/, "")
        .trim();
      const data = JSON.parse(cleanText);

      return {
        type: "item",
        title: data.title || name,
        content: data.content || "",
        lore: data.lore || "",
        labels: Array.isArray(data.labels)
          ? data.labels
          : ["rpg-item", "imported-draft"],
        status: "active",
      };
    } catch (err) {
      console.warn("AI generation failed, falling back to local tables:", err);
    }
  }

  const property =
    magicItemConfig.properties[
      Math.floor(Math.random() * magicItemConfig.properties.length)
    ];
  const history =
    magicItemConfig.histories[
      Math.floor(Math.random() * magicItemConfig.histories.length)
    ];

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
    content,
    lore,
    labels: ["rpg-item", "imported-draft"],
    status: "active",
  };
}
