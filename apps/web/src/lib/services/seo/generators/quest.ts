import type { DefaultAIClientManager } from "$lib/services/ai/client-manager";
import { type GeneratorOutput, generateName } from "./base";

export const questConfig = {
  genres: [
    "Classic Fantasy",
    "Dark Fantasy",
    "Political Intrigue",
    "Horror",
    "Comedy",
  ],
  tones: ["Heroic", "Gritty", "Mysterious", "Comedic", "Tragic"],
  scopes: [
    "Local (village / district)",
    "Regional (kingdom / region)",
    "World-threatening",
  ],
  locationTypes: [
    "Ancient Dungeon",
    "Urban City",
    "Wilderness",
    "Cursed Ruin",
    "Coastal / Maritime",
    "Planar Realm",
  ],
  threats: [
    "Monstrous Creature",
    "Corrupt Villain",
    "Rival Faction",
    "Ancient Curse",
    "Natural Disaster",
    "Betrayal from Within",
  ],
  hooks: [
    "A local official offers a reward to find a missing heir before a rival claims the title.",
    "Strange lights above the old tower have kept the village awake for three nights.",
    "A caravan was found empty on the road — no blood, no tracks, just silence.",
    "An imprisoned criminal offers the location of a cache in exchange for a pardon.",
    "A temple guardian collapses mid-ceremony, whispering a single forbidden name.",
    "A child wanders into town carrying an item that should not exist.",
  ],
  complications: [
    "The client is hiding their true motive — the real target is someone the party knows.",
    "The threat has already moved; the location the party was sent to is a decoy.",
    "A second party has been hired for the same job and has a head start.",
    "The threat is connected to a powerful patron who expects the party to look away.",
    "Completing the job requires breaking a law the party has respected until now.",
    "The reward will not be paid unless the job is done silently and officially denied.",
  ],
  twists: [
    "Villain is protecting something valuable",
    "Client's ally is the real enemy",
    "Location holds a campaign-changing secret",
    "Threat must be bargained with, not killed",
    "Party's own past caused this situation",
    "Two factions both claim the prize",
  ],
  rewards: [
    "Coin plus a local power's favor",
    "Deed to a useful property",
    "Access to a restricted archive",
    "A magic item from the site",
    "Valuable information from the client",
    "Respect from a previously hostile faction",
  ],
};

export async function generateQuestHook(
  clientManager: DefaultAIClientManager,
  options: {
    genre?: string;
    tone?: string;
    scope?: string;
    locationType?: string;
    threat?: string;
    twist?: string;
    reward?: string;
    campaignContext?: string;
    useAI?: boolean;
  } = {},
): Promise<GeneratorOutput> {
  const genre =
    options.genre ||
    questConfig.genres[Math.floor(Math.random() * questConfig.genres.length)];
  const tone =
    options.tone ||
    questConfig.tones[Math.floor(Math.random() * questConfig.tones.length)];
  const scope =
    options.scope ||
    questConfig.scopes[Math.floor(Math.random() * questConfig.scopes.length)];
  const locationType =
    options.locationType ||
    questConfig.locationTypes[
      Math.floor(Math.random() * questConfig.locationTypes.length)
    ];
  const threat =
    options.threat ||
    questConfig.threats[Math.floor(Math.random() * questConfig.threats.length)];
  const twist =
    options.twist ||
    questConfig.twists[Math.floor(Math.random() * questConfig.twists.length)];
  const reward =
    options.reward ||
    questConfig.rewards[Math.floor(Math.random() * questConfig.rewards.length)];
  const campaignContext = options.campaignContext?.trim();
  const questName = `${generateName()}'s ${["Gambit", "Bargain", "Reckoning", "Shadow", "Legacy", "Trial"][Math.floor(Math.random() * 6)]}`;

  if (options.useAI !== false) {
    try {
      const prompt = `Generate a detailed RPG quest hook in JSON format.
Options:
- Genre: ${genre}
- Tone: ${tone}
- Scope: ${scope}
- Location Type: ${locationType}
- Main Threat: ${threat}
- Twist: ${twist}
- Reward: ${reward}
${campaignContext ? `- Campaign Context: ${campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative quest name (3-6 words)",
  "content": "A detailed multi-paragraph quest hook (markdown formatted) describing the situation, what the party is asked to do, the location, the key NPC involved, and how it fits the campaign context if provided.",
  "lore": "Structured GM details (markdown formatted) with sections for core fields, complication, key NPC, twist, and reward.",
  "labels": ["rpg-quest", "quest-generator", "imported-draft"]
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
        type: "event",
        title: data.title || questName,
        content: data.content || "",
        lore: data.lore || "",
        labels: Array.isArray(data.labels)
          ? data.labels
          : ["rpg-quest", "quest-generator", "imported-draft"],
        status: "active",
      };
    } catch (err) {
      console.warn("AI generation failed, falling back to local tables:", err);
    }
  }

  const hook =
    questConfig.hooks[Math.floor(Math.random() * questConfig.hooks.length)];
  const complication =
    questConfig.complications[
      Math.floor(Math.random() * questConfig.complications.length)
    ];
  const npcName = generateName();
  const locationName = `The ${generateName()} ${locationType}`;

  const content = `### The Hook
${hook}

${campaignContext ? `### Campaign Fit\nThis quest ties into ${campaignContext}. The threat and location should reflect existing tensions or unresolved threads.\n` : ""}### Location
${locationName} serves as the primary setting — a ${locationType.toLowerCase()} shaped by ${genre.toLowerCase()} conventions and a ${tone.toLowerCase()} atmosphere.

### Key NPC
**${npcName}** is the immediate contact, patron, or obstacle. Their stated reason for hiring the party is credible enough, but their personal stake runs deeper than they admit.

### Threat
The central danger is a ${threat.toLowerCase()}. It has been active long enough to leave evidence, earn fear, and create a power vacuum that others are already trying to fill.`;

  const lore = `### GM Reference Information
- **Genre**: ${genre}
- **Tone**: ${tone}
- **Scope**: ${scope}
- **Location Type**: ${locationType}
- **Main Threat**: ${threat}

### Complication
${complication}

### Twist
${twist}

### Reward
${reward}`;

  return {
    type: "event",
    title: questName,
    content,
    lore,
    labels: ["rpg-quest", "quest-generator", "imported-draft"],
    status: "active",
  };
}
