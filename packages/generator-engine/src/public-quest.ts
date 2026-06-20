/**
 * Public Quest generator — framework-free port of the SEO quest generator
 * (`apps/web/src/lib/services/seo/generators/quest.ts`).
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client, no
 * sessionStorage. The web page builds the prompt here, runs it through
 * aiClientManager, parses with parseQuestResponse, and falls back to
 * generateQuestLocal. Session context is injected as a string.
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

export const themeToQuestGenre: Record<string, string> = {
  "Classic Fantasy": "Classic Fantasy",
  "Cyberpunk / Corporate": "Cyberpunk",
  "Vampire / Gothic Noir": "Dark Fantasy",
  "Sci-Fi / Space Opera": "Sci-Fi",
  "Modern Conspiracy": "Political Intrigue",
  "Post-Apocalyptic": "Post-Apocalyptic",
  "Western / Frontier": "Western",
  Steampunk: "Steampunk",
  Lancer: "Lancer",
  "Space Opera Resistance": "Space Fantasy",
  "Optimistic Exploration Sci-Fi": "Optimistic Exploration Sci-Fi",
};

export const questConfig = {
  genres: [
    "Classic Fantasy",
    "Dark Fantasy",
    "Political Intrigue",
    "Horror",
    "Comedy",
    "Steampunk",
    "Lancer",
    "Space Fantasy",
    "Optimistic Exploration Sci-Fi",
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
    "Western / Frontier": [
      "Gritty",
      "Heroic",
      "Melancholic",
      "Tense",
      "Lawless",
    ],
    Steampunk: ["Intriguing", "Tense", "Grandiose", "Cynical", "Adventurous"],
    Lancer: ["Tense", "Bleak", "Desperate", "Clinical", "High-Octane"],
    "Space Opera Resistance": ["Heroic", "Desperate", "Pulpy", "Epic", "Tense"],
    "Optimistic Exploration Sci-Fi": [
      "Curious",
      "Diplomatic",
      "Philosophical",
      "Tense",
      "Utopian",
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
    "Western / Frontier": [
      "Local (homestead / saloon)",
      "Town-wide (boomtown)",
      "Territory-scale (frontier)",
    ],
    Steampunk: ["Local (district / borough)", "City-wide", "Imperial-scale"],
    Lancer: [
      "Local (outpost / installation)",
      "Sector-wide (colonial theatre)",
      "Union-scale (interstellar mandate)",
    ],
    "Space Opera Resistance": [
      "Local (cantina / spaceport)",
      "Planetary (occupied world / system)",
      "Galactic (imperial-scale / rebellion)",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Local (research outpost)",
      "System-wide (diplomatic dispute)",
      "Galaxy-spanning (precursor threat)",
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
    "Western / Frontier": [
      "Dusty Boomtown",
      "Abandoned Gold Mine",
      "Remote Homestead",
      "Canyon Hideout",
      "Frontier Fort",
      "Railroad Station",
    ],
    Steampunk: [
      "Airship Dock",
      "Factory Floor",
      "Aetheric Laboratory",
      "Guild Vault",
      "Imperial Dirigible",
      "Smog-Shrouded Tenement",
    ],
    Lancer: [
      "Mech Hangar",
      "Bleed Zone Perimeter",
      "Colonial Outpost",
      "Union Administrative Hub",
      "NHP Containment Facility",
      "Debris Field Salvage Site",
    ],
    "Space Opera Resistance": [
      "Smuggler Cantina",
      "Imperial Detention Block",
      "Hidden Rebel Base",
      "Ancient Mystic Temple",
      "Desert Moisture Farm",
      "Orbital Battle Station",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Starship Bridge",
      "Alien Ruins",
      "Embassy Station",
      "Precursor Vault",
      "Research Laboratory",
      "Terraforming Colony",
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
    "Western / Frontier": [
      "Outlaw Gang",
      "Corrupt Sheriff",
      "Railroad Baron",
      "Rival Claim Jumper",
      "Bounty Hunter Turned Predator",
      "Desperate Homesteaders",
    ],
    Steampunk: [
      "Rogue Automaton",
      "Guild Conspiracy",
      "Imperial Suppression Force",
      "Sabotaged Aetheric Engine",
      "Rival Inventor",
      "Press-Gang Operation",
    ],
    Lancer: [
      "Cascaded NHP",
      "Corporate Extraction Force",
      "Colonial Insurgency",
      "Bleed Incursion",
      "Union Oversight Audit",
      "Rival Mech Lance",
    ],
    "Space Opera Resistance": [
      "Imperial Inquisitor",
      "Ruthless Bounty Hunter",
      "Syndicate Crime Boss",
      "Betrayal from Within",
      "Imperial Strike Fleet",
      "Ancient Dark Mystic",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Misunderstood Alien Lifeform",
      "Rogue Artificial Intelligence",
      "Unstable Subspace Phenomenon",
      "Hostile Splinter Faction",
      "Ancient Planetary Defense System",
      "Temporal Distortion",
    ],
  } as Record<string, string[]>,
  hooks: [
    "A local official offers a reward to find a missing heir before a rival claims the title.",
    "Strange lights above the old tower have kept the village awake for three nights.",
    "A caravan was found empty on the road -- no blood, no tracks, just silence.",
    "An imprisoned criminal offers the location of a cache in exchange for a pardon.",
    "A temple guardian collapses mid-ceremony, whispering a single forbidden name.",
    "A child wanders into town carrying an item that should not exist.",
  ],
  complications: [
    "The client is hiding their true motive -- the real target is someone the party knows.",
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
    "Western / Frontier": [
      "Bounty gold plus a sheriff's favor",
      "Deed to a land claim or saloon",
      "Access to safe-passage routes",
      "Custom frontier gear or weapon",
      "Intel on an outlaw gang's stash",
      "Loyalty of a frontier community",
    ],
    Steampunk: [
      "Coin plus a guild factor's letter of introduction",
      "Patent licence to a useful device",
      "Access to a restricted aetheric archive",
      "A prototype engine component from the site",
      "Intel on a guild conspiracy",
      "Safe passage on a consortium airship",
    ],
    Lancer: [
      "Manna plus a Union logistics contact",
      "Salvage rights to a downed mech frame",
      "Access to a restricted NHP consultation archive",
      "Prototype licensed gear from the site",
      "Intel on a corporate extraction operation",
      "Union operational clearance for the next mission",
    ],
    "Space Opera Resistance": [
      "Credits and a smuggler's favor",
      "Coordinates to a hidden hyper-route",
      "An ancient mystic relic or crystal",
      "Stolen imperial clearance codes",
      "Intel on a critical imperial weakness",
      "A heavily modified blockade runner",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Federation comms clearance",
      "Access to precursor databanks",
      "A permanent diplomatic envoy assignment",
      "Advanced sensor upgrades",
      "Safe passage through neutral space",
      "Alliance with a newly discovered species",
    ],
  } as Record<string, string[]>,
};

export interface QuestGeneratorOptions {
  genre?: string;
  tone?: string;
  scope?: string;
  locationType?: string;
  threat?: string;
  twist?: string;
  reward?: string;
  campaignContext?: string;
}

export interface ResolvedQuest {
  genre: string;
  tone: string;
  scope: string;
  locationType: string;
  threat: string;
  twist: string;
  reward: string;
  campaignContext?: string;
  questName: string;
}

function resolveQuest(options: QuestGeneratorOptions, rng: Rng): ResolvedQuest {
  return {
    genre: options.genre || pickFrom(questConfig.genres, rng),
    tone: options.tone || pickFrom(questConfig.tones, rng),
    scope: options.scope || pickFrom(questConfig.scopes, rng),
    locationType:
      options.locationType || pickFrom(questConfig.locationTypes, rng),
    threat: options.threat || pickFrom(questConfig.threats, rng),
    twist: options.twist || pickFrom(questConfig.twists, rng),
    reward: options.reward || pickFrom(questConfig.rewards, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    questName: `${generateName(rng)}'s ${pickFrom(["Gambit", "Bargain", "Reckoning", "Shadow", "Legacy", "Trial"], rng)}`,
  };
}

export interface QuestPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedQuest;
}

export function buildQuestPrompt(
  options: QuestGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): QuestPrompt {
  const resolved = resolveQuest(options, rng);

  const userMessage = `Generate a detailed RPG quest hook in JSON format.
Options:
- Genre: ${resolved.genre}
- Tone: ${resolved.tone}
- Scope: ${resolved.scope}
- Location Type: ${resolved.locationType}
- Main Threat: ${resolved.threat}
- Twist: ${resolved.twist}
- Reward: ${resolved.reward}
${resolved.campaignContext ? `- Campaign Context: ${resolved.campaignContext}` : ""}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative quest name (3-6 words)",
  "content": "A detailed multi-paragraph quest hook (markdown formatted) describing the situation, what the party is asked to do, the location, the key NPC involved, and how it fits the campaign context if provided.",
  "lore": "GM-only details (markdown formatted) with these sections: '### Core Fields' (bullet list with '**📍 Setting**' and '**📅 Threat**', each a vivid one-sentence description with proper nouns), '### Complication' (a concrete mechanical or narrative pressure), '### Key NPC' (bullet with '**👤 Name**': motivation and secret), '### The Twist' (a paragraph revealing the hidden truth, ideally tying back to the party's past or the campaign context), '### Reward' (a paragraph describing what is gained and why it matters to the larger campaign).",
  "labels": ["rpg-quest", "quest-generator", "imported-draft"]
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

export function parseQuestResponse(
  text: string,
  resolved: ResolvedQuest,
): PublicGeneratorOutput {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  const data = JSON.parse(cleanText);
  return {
    type: "event",
    title: data.title || resolved.questName,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-quest", "quest-generator", "imported-draft"],
    status: "active",
  };
}

export function generateQuestLocal(
  options: QuestGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveQuest(options, rng);
  const hook = pickFrom(questConfig.hooks, rng);
  const complication = pickFrom(questConfig.complications, rng);
  const npcName = generateName(rng);
  const locationName = `The ${generateName(rng)} ${resolved.locationType}`;

  const content = `### The Hook
${hook}

${resolved.campaignContext ? `### Campaign Fit\nThis quest ties into ${resolved.campaignContext}. The threat and location should reflect existing tensions or unresolved threads.\n` : ""}### Location
${locationName} serves as the primary setting -- a ${resolved.locationType.toLowerCase()} shaped by ${resolved.genre.toLowerCase()} conventions and a ${resolved.tone.toLowerCase()} atmosphere.

### Key NPC
**${npcName}** is the immediate contact, patron, or obstacle. Their stated reason for hiring the party is credible enough, but their personal stake runs deeper than they admit.

### Threat
The central danger is a ${resolved.threat.toLowerCase()}. It has been active long enough to leave evidence, earn fear, and create a power vacuum that others are already trying to fill.`;

  const lore = `### Core Fields
- **📍 Setting**: ${locationName}, a ${resolved.locationType.toLowerCase()} shaped by ${resolved.genre.toLowerCase()} conventions and a ${resolved.tone.toLowerCase()} atmosphere.
- **📅 Threat**: A ${resolved.threat.toLowerCase()}, active long enough to leave evidence, earn fear, and create a power vacuum.

### Complication
${complication}

### Key NPC
- **👤 ${npcName}**: The immediate contact, patron, or obstacle. Their stated reason for involving the party is credible, but their personal stake runs deeper than they admit.

### The Twist
${resolved.twist}. Reveal this only once the party is committed -- it should recast earlier scenes in a new light.

### Reward
${resolved.reward}. Beyond its face value, it opens a door in the wider campaign: a contact, a route, or a secret the party could not otherwise reach.`;

  return {
    type: "event",
    title: resolved.questName,
    summary: "",
    content,
    lore,
    labels: ["rpg-quest", "quest-generator", "imported-draft"],
    status: "active",
  };
}
