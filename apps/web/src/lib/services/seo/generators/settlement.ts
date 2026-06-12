import type { DefaultAIClientManager } from "$lib/services/ai/client-manager";
import { NAME_BAN_PROMPT } from "./banned-names";
import { getSessionContext } from "./session-context";
import { type GeneratorOutput, getRandomItems } from "./base";

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

export async function generateSettlement(
  clientManager: DefaultAIClientManager,
  options: {
    size?: string;
    economy?: string;
    useAI?: boolean;
  } = {},
): Promise<GeneratorOutput> {
  const sizeConfig =
    settlementConfig.sizes.find((s) => s.name === options.size) ||
    settlementConfig.sizes[
      Math.floor(Math.random() * settlementConfig.sizes.length)
    ];
  const size = sizeConfig.name;
  const population = sizeConfig.range;
  const economy =
    options.economy ||
    settlementConfig.economies[
      Math.floor(Math.random() * settlementConfig.economies.length)
    ];

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
  const name =
    namePrefixes[Math.floor(Math.random() * namePrefixes.length)] +
    nameSuffixes[Math.floor(Math.random() * nameSuffixes.length)];

  if (options.useAI !== false) {
    try {
      const prompt = `Generate a detailed RPG Settlement in JSON format.
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
${getSessionContext()}
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
        type: "location",
        title: data.title || name,
        content: data.content || "",
        lore: data.lore || "",
        labels: Array.isArray(data.labels)
          ? data.labels
          : ["rpg-location", "imported-draft"],
        status: "active",
      };
    } catch (err) {
      console.warn("AI generation failed, falling back to local tables:", err);
    }
  }

  const government =
    settlementConfig.governments[
      Math.floor(Math.random() * settlementConfig.governments.length)
    ];
  const faction =
    settlementConfig.factions[
      Math.floor(Math.random() * settlementConfig.factions.length)
    ];
  const locs = getRandomItems(
    settlementConfig.notableLocations,
    sizeConfig.pointsOfInterestCount,
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
    content,
    lore,
    labels: ["rpg-location", "imported-draft"],
    status: "active",
  };
}
