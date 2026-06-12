import type { DefaultAIClientManager } from "$lib/services/ai/client-manager";
import { NAME_BAN_PROMPT } from "./banned-names";
import { getSessionContext } from "./session-context";
import { type GeneratorOutput, generateName } from "./base";

export const themeToQuestGenre: Record<string, string> = {
  "Classic Fantasy": "Classic Fantasy",
  "Cyberpunk / Corporate": "Cyberpunk",
  "Vampire / Gothic Noir": "Dark Fantasy",
  "Sci-Fi / Space Opera": "Sci-Fi",
  "Modern Conspiracy": "Political Intrigue",
  "Post-Apocalyptic": "Post-Apocalyptic",
};

export const questConfig = {
  genres: [
    "Classic Fantasy",
    "Dark Fantasy",
    "Political Intrigue",
    "Horror",
    "Comedy",
  ],
  tones: ["Heroic", "Gritty", "Mysterious", "Comedic", "Tragic"],
  tonesByTheme: {
    "Classic Fantasy": ["Heroic", "Gritty", "Mysterious", "Comedic", "Tragic"],
    "Cyberpunk / Corporate": [
      "Noir",
      "Paranoid",
      "High-Octane",
      "Cynical",
      "Bleak",
    ],
    "Vampire / Gothic Noir": [
      "Dread",
      "Melancholic",
      "Sinister",
      "Brooding",
      "Tragic",
    ],
    "Sci-Fi / Space Opera": [
      "Epic",
      "Tense",
      "Mysterious",
      "Satirical",
      "Bleak",
    ],
    "Modern Conspiracy": ["Paranoid", "Tense", "Cynical", "Noir", "Bleak"],
    "Post-Apocalyptic": [
      "Gritty",
      "Desperate",
      "Bleak",
      "Defiant",
      "Melancholic",
    ],
  } as Record<string, string[]>,
  scopes: [
    "Local (village / district)",
    "Regional (kingdom / region)",
    "World-threatening",
  ],
  scopesByTheme: {
    "Classic Fantasy": [
      "Local (village / district)",
      "Regional (kingdom / region)",
      "World-threatening",
    ],
    "Cyberpunk / Corporate": [
      "Local (block / district)",
      "City-wide",
      "Corporate-scale",
    ],
    "Vampire / Gothic Noir": [
      "Local (neighbourhood / district)",
      "City-wide",
      "Ancient conspiracy",
    ],
    "Sci-Fi / Space Opera": [
      "Local (station / colony)",
      "Sector-wide",
      "Galaxy-threatening",
    ],
    "Modern Conspiracy": ["Local (city / district)", "National", "Global"],
    "Post-Apocalyptic": [
      "Local (settlement / zone)",
      "Regional (wasteland)",
      "Civilisation-scale",
    ],
  } as Record<string, string[]>,
  locationTypes: [
    "Ancient Dungeon",
    "Urban City",
    "Wilderness",
    "Cursed Ruin",
    "Coastal / Maritime",
    "Planar Realm",
  ],
  locationTypesByTheme: {
    "Classic Fantasy": [
      "Ancient Dungeon",
      "Cursed Ruin",
      "Wilderness",
      "Coastal / Maritime",
      "Feywild Crossing",
      "Dwarven Stronghold",
    ],
    "Cyberpunk / Corporate": [
      "Corporate Tower",
      "Underground Market",
      "Abandoned Factory",
      "Neon District",
      "Off-Grid Settlement",
      "Server Farm",
    ],
    "Vampire / Gothic Noir": [
      "Gothic Cathedral",
      "Haunted Manor",
      "Ancient Crypt",
      "Fog-Shrouded Port",
      "Secret Society Hall",
      "Underground Passage",
    ],
    "Sci-Fi / Space Opera": [
      "Space Station",
      "Alien Planet",
      "Derelict Ship",
      "Research Outpost",
      "Jump Gate Hub",
      "Colony World",
    ],
    "Modern Conspiracy": [
      "Urban City",
      "Abandoned Warehouse",
      "Government Facility",
      "Safe House",
      "International Airport",
      "Dark Web Hub",
    ],
    "Post-Apocalyptic": [
      "Ruined City",
      "Wasteland Outpost",
      "Vault / Bunker",
      "Irradiated Zone",
      "Raider Stronghold",
      "Pre-War Archive",
    ],
  } as Record<string, string[]>,
  threats: [
    "Monstrous Creature",
    "Corrupt Villain",
    "Rival Faction",
    "Ancient Curse",
    "Natural Disaster",
    "Betrayal from Within",
  ],
  threatsByTheme: {
    "Classic Fantasy": [
      "Monstrous Creature",
      "Corrupt Noble",
      "Rival Adventuring Party",
      "Ancient Curse",
      "Undead Rising",
      "Dragon's Influence",
    ],
    "Cyberpunk / Corporate": [
      "Rogue AI",
      "Corporate Extraction Team",
      "Street Gang",
      "Data Breach",
      "Corrupt Official",
      "Megacorp Rival",
    ],
    "Vampire / Gothic Noir": [
      "Elder Vampire",
      "Werewolf Pack",
      "Inquisitor",
      "Ancient Blood Curse",
      "Rival Bloodline",
      "Cult of the Damned",
    ],
    "Sci-Fi / Space Opera": [
      "Alien Threat",
      "Rogue AI",
      "Pirate Fleet",
      "Ancient Weapon System",
      "Galactic Bureaucracy",
      "Rival Faction",
    ],
    "Modern Conspiracy": [
      "Shadow Organisation",
      "Corrupt Official",
      "Intelligence Agency",
      "Assassin Cell",
      "Corporate Cover-Up",
      "Whistleblower Hunt",
    ],
    "Post-Apocalyptic": [
      "Raider Warlord",
      "Mutant Creature",
      "Resource War",
      "Faction Power Struggle",
      "Rogue Automaton",
      "Plague Outbreak",
    ],
  } as Record<string, string[]>,
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
  rewardsByTheme: {
    "Classic Fantasy": [
      "Coin plus a noble's favour",
      "Deed to a useful property",
      "Access to a restricted archive",
      "A magic item from the site",
      "Valuable information from the client",
      "Respect from a previously hostile faction",
    ],
    "Cyberpunk / Corporate": [
      "Cred plus a fixer's contact",
      "Access codes to a restricted network",
      "Safe house deed",
      "Prototype gear from the site",
      "Intel on a powerful corp",
      "Street cred with a major gang",
    ],
    "Vampire / Gothic Noir": [
      "Gold and a blood-debt cleared",
      "A safe haven in the city",
      "Access to forbidden archives",
      "An artefact from the crypt",
      "Blackmail material on a noble",
      "Passage through enemy territory",
    ],
    "Sci-Fi / Space Opera": [
      "Credits plus a nav contact",
      "Docking rights at a key station",
      "Access to a restricted database",
      "Salvaged tech from the site",
      "Intel on a rival faction",
      "Loyalty from a previously hostile crew",
    ],
    "Modern Conspiracy": [
      "Cash plus a government contact",
      "Access to a secure facility",
      "Safe identity documents",
      "Prototype tech from the site",
      "Intel on a shadow organisation",
      "Protection from a powerful agency",
    ],
    "Post-Apocalyptic": [
      "Supplies plus a settlement's protection",
      "Claim to a defensible location",
      "Access to pre-war tech",
      "Salvage rights to the site",
      "Intel on a raider stronghold",
      "Loyalty from a survivor faction",
    ],
  } as Record<string, string[]>,
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
  "lore": "GM-only details (markdown formatted) with these sections: '### Core Fields' (bullet list with '**📍 Setting**' and '**📅 Threat**', each a vivid one-sentence description with proper nouns), '### Complication' (a concrete mechanical or narrative pressure), '### Key NPC' (bullet with '**👤 Name**': motivation and secret), '### The Twist' (a paragraph revealing the hidden truth, ideally tying back to the party's past or the campaign context), '### Reward' (a paragraph describing what is gained and why it matters to the larger campaign).",
  "labels": ["rpg-quest", "quest-generator", "imported-draft"]
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

  const lore = `### Core Fields
- **📍 Setting**: ${locationName}, a ${locationType.toLowerCase()} shaped by ${genre.toLowerCase()} conventions and a ${tone.toLowerCase()} atmosphere.
- **📅 Threat**: A ${threat.toLowerCase()}, active long enough to leave evidence, earn fear, and create a power vacuum.

### Complication
${complication}

### Key NPC
- **👤 ${npcName}**: The immediate contact, patron, or obstacle. Their stated reason for involving the party is credible, but their personal stake runs deeper than they admit.

### The Twist
${twist}. Reveal this only once the party is committed — it should recast earlier scenes in a new light.

### Reward
${reward}. Beyond its face value, it opens a door in the wider campaign: a contact, a route, or a secret the party could not otherwise reach.`;

  return {
    type: "event",
    title: questName,
    content,
    lore,
    labels: ["rpg-quest", "quest-generator", "imported-draft"],
    status: "active",
  };
}
