/**
 * Public Social Hub + Tavern generators — framework-free port of the SEO
 * social-hub generator (`apps/web/src/lib/services/seo/generators/social-hub.ts`).
 *
 * Per the unification plan (#1351) this stays framework-free: no AI client, no
 * sessionStorage. The web page builds prompts here, runs them through
 * aiClientManager, parses with the parse* helpers, and falls back to the
 * generate*Local helpers on failure. Session context is injected as a string.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson, asString } from "./llm-response-utils";

const VENUE_ADJECTIVES = [
  "Sullen",
  "Hollow",
  "Gilded",
  "Rusted",
  "Crooked",
  "Dented",
  "Ashen",
  "Salted",
  "Blackened",
  "Broken",
  "Mended",
  "Tarnished",
  "Pale",
  "Sunken",
  "Knotted",
  "Scorched",
  "Pitted",
  "Leaning",
  "Weathered",
  "Splintered",
  "Cracked",
  "Smoked",
  "Bitter",
  "Coppery",
  "Hammered",
  "Bolted",
  "Warped",
  "Tarred",
  "Lopsided",
];

const VENUE_NOUNS = [
  "Flagon",
  "Anvil",
  "Lantern",
  "Cauldron",
  "Chain",
  "Barrel",
  "Bell",
  "Crow",
  "Hound",
  "Kettle",
  "Nail",
  "Rope",
  "Spoke",
  "Tide",
  "Torch",
  "Wheel",
  "Clasp",
  "Rivet",
  "Whetstone",
  "Tallow",
  "Spit",
  "Hook",
  "Peg",
  "Gust",
  "Ember",
];

function buildTavernName(rng: Rng): string {
  return `The ${pickFrom(VENUE_ADJECTIVES, rng)} ${pickFrom(VENUE_NOUNS, rng)}`;
}

export const socialHubConfig = {
  genres: [
    "Fantasy",
    "Dark Fantasy",
    "Pirate",
    "Cyberpunk",
    "Sci-Fi",
    "Modern",
    "Horror",
    "Post-Apocalyptic",
    "Western",
    "Steampunk",
    "Lancer",
    "Space Opera Resistance",
    "Optimistic Exploration Sci-Fi",
  ],
  venueTypesByGenre: {
    Fantasy: [
      "Tavern / Inn",
      "Mead Hall",
      "Roadside Alehouse",
      "Adventurer Lodge",
      "Guildhall",
    ],
    "Dark Fantasy": [
      "Cursed Alehouse",
      "Witch's Den",
      "Underground Fighting Pit",
      "Plague Hospice",
      "Smuggler's Hollow",
    ],
    Pirate: [
      "Dockside Tavern",
      "Rum House",
      "Sailor's Inn",
      "Gambling Den",
      "Freeport Alehouse",
    ],
    Cyberpunk: [
      "Noodle Bar",
      "Dive Bar",
      "Nightclub",
      "Hacker Café",
      "Braindance Lounge",
    ],
    "Sci-Fi": [
      "Spaceport Cantina",
      "Station Bar",
      "Mess Hall",
      "Orbital Lounge",
      "Asteroid Miner Pub",
    ],
    Modern: ["Pub", "Café / Diner", "Hotel Bar", "Nightclub", "Truck Stop"],
    Horror: [
      "Goth Club",
      "Occult Café",
      "Speakeasy",
      "Blood Bar",
      "Private Lounge",
    ],
    "Post-Apocalyptic": [
      "Trade Shack",
      "Bunker Canteen",
      "Water Bar",
      "Settlement Mess",
      "Caravanserai",
    ],
    Western: [
      "Saloon",
      "Boarding House",
      "Trading Post",
      "Roadhouse",
      "Gambling Parlour",
    ],
    Steampunk: [
      "Aetheric Lounge",
      "Artificers' Club",
      "Engine-District Pub",
      "Sky-Dock Canteen",
      "Guild Factor's Parlour",
    ],
    Lancer: [
      "Mech Bay Canteen",
      "Outpost Transit Bar",
      "Union Admin Mess Hall",
      "Pilot's Debrief Lounge",
      "Colonial Settlement Common Room",
    ],
    "Space Opera Resistance": [
      "Smuggler's Cantina",
      "Underground Resistance Hub",
      "Imperial Officers' Club",
      "Scrap-Town Bar",
      "Spaceport Transit Lounge",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Starship Observation Lounge",
      "Space Station Promenade",
      "Embassy Reception Hall",
      "Planetary Academy Campus",
      "Frontier Research Outpost Canteen",
    ],
  } as Record<string, string[]>,
  atmospheres: [
    "Rowdy and welcoming",
    "Tense and suspicious",
    "Quiet and melancholic",
    "Festive and chaotic",
    "Cold and professional",
    "Warm but secretive",
  ],
  wealthLevels: [
    "Destitute (dirt floors, watered-down drinks)",
    "Poor (cheap but honest)",
    "Modest (reliable, no frills)",
    "Comfortable (decent food and beds)",
    "Prosperous (good drink, private rooms)",
    "Wealthy (exclusive clientele)",
  ],
  clientelesByGenre: {
    Fantasy: [
      "Adventurers and wanderers",
      "Merchants and traders",
      "Soldiers and mercenaries",
      "Pilgrims and clergy",
      "Criminals and fence-seekers",
      "Mixed locals",
    ],
    "Dark Fantasy": [
      "Mercenaries and cultists",
      "Outlaws and desperate souls",
      "Corrupt clergy",
      "Cursed travellers",
      "Black-market traders",
    ],
    Pirate: [
      "Pirates and privateers",
      "Sailors and dockworkers",
      "Smugglers and fences",
      "Bounty hunters",
      "Stranded merchants",
    ],
    Cyberpunk: [
      "Hackers and netrunners",
      "Off-duty security",
      "Smugglers and fixers",
      "Street gang members",
      "Corporate burnouts",
    ],
    "Sci-Fi": [
      "Spacers and pilots",
      "Colonial marines",
      "Free traders",
      "Scientists and researchers",
      "Station workers",
    ],
    Modern: [
      "Office workers",
      "Local regulars",
      "Tourists and travellers",
      "Journalists and students",
      "Off-duty police",
    ],
    Horror: [
      "Occultists and hunters",
      "Lost souls and drifters",
      "Curious investigators",
      "Predators in disguise",
      "Frightened locals",
    ],
    "Post-Apocalyptic": [
      "Scavengers and traders",
      "Wasteland survivors",
      "Cult members",
      "Mercenaries",
      "Settlers and refugees",
    ],
    Steampunk: [
      "Artificers and engine-wrights",
      "Guild factors and patent brokers",
      "Sky-dock workers and airship crew",
      "Off-duty imperial constables",
      "Underclass agitators in disguise",
    ],
    Lancer: [
      "Off-duty mech pilots and crew chiefs",
      "Union administrators and logistics staff",
      "Colonial settlers and outpost workers",
      "Mercenary contractors between jobs",
      "NHP handlers on downtime protocols",
    ],
    Western: [
      "Cowboys and drifters",
      "Miners and prospectors",
      "Outlaws and bounty hunters",
      "Townsfolk",
      "Railroad workers",
    ],
    "Space Opera Resistance": [
      "Rebel spies and informants",
      "Off-duty imperial officers and stormtroopers",
      "Smugglers and bounty hunters",
      "Mystic order exiles in hiding",
      "Scrap workers and frontier traders",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Off-duty officers",
      "Visiting alien diplomats",
      "Research scientists",
      "Civilian colonists",
      "Exchange students",
      "Stellar cartographers",
    ],
  } as Record<string, string[]>,
  troubles: [
    "The owner owes a dangerous debt that is coming due",
    "A recent violent incident was quietly buried — the responsible party may still be inside",
    "A protected criminal is hiding among the staff",
    "A back room connects to something the owner refuses to discuss",
    "A faction is using the venue as a dead-drop without the owner's knowledge",
    "The place is being squeezed out by a rival backed by local power",
  ],
  settlementTypes: [
    "Capital city",
    "Market town",
    "Frontier outpost",
    "Coastal port",
    "Remote village",
    "Crossroads hamlet",
  ],
};

export interface SocialHubGeneratorOptions {
  genre?: string;
  venueType?: string;
  atmosphere?: string;
  wealthLevel?: string;
  clientele?: string;
  campaignContext?: string;
}

export interface TavernGeneratorOptions {
  type?: string;
  atmosphere?: string;
  settlementType?: string;
  wealthLevel?: string;
  clientele?: string;
  campaignContext?: string;
}

export interface ResolvedSocialHub {
  genre: string;
  venueType: string;
  atmosphere: string;
  wealthLevel: string;
  clientele: string;
  campaignContext?: string;
  varianceSeed: number;
}

export interface ResolvedTavern {
  tavernType: string;
  atmosphere: string;
  settlementType: string;
  wealthLevel: string;
  clientele: string;
  campaignContext?: string;
  namingDirective: string;
  varianceSeed: number;
}

export interface SocialHubPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedSocialHub;
}

export interface TavernPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedTavern;
}

const TAVERN_NAMING_STYLES = [
  "Name it after an animal and a worn or unlikely material (e.g. 'The Tin Boar', 'The Pitted Heron').",
  "Name it after a physical object associated with the owner's past — a weapon, trade tool, or keepsake (e.g. 'The Broken Spoke', 'The Dented Kettle').",
  "Use a short ironic or sardonic phrase (e.g. 'The Honest Scales', 'The Fair Price', 'The Warm Welcome').",
  "Name it after an obscure local legend, a minor battle, or a peculiar geographical feature — not a generic landmark.",
  "Use a two-word compound that evokes the atmosphere — a worn adjective plus a mundane noun (e.g. 'The Sullen Lantern', 'The Leaning Barrel', 'The Scorched Bell').",
];

function resolveSocialHub(
  options: SocialHubGeneratorOptions,
  rng: Rng,
): ResolvedSocialHub {
  const genre = options.genre || pickFrom(socialHubConfig.genres, rng);
  const venueTypes =
    socialHubConfig.venueTypesByGenre[genre] ??
    socialHubConfig.venueTypesByGenre["Fantasy"];
  const clienteles =
    socialHubConfig.clientelesByGenre[genre] ??
    socialHubConfig.clientelesByGenre["Fantasy"];

  return {
    genre,
    venueType: options.venueType || pickFrom(venueTypes, rng),
    atmosphere:
      options.atmosphere || pickFrom(socialHubConfig.atmospheres, rng),
    wealthLevel: options.wealthLevel || socialHubConfig.wealthLevels[2],
    clientele: options.clientele || pickFrom(clienteles, rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    varianceSeed: Math.floor(rng() * 99991) + 10,
  };
}

function resolveTavern(
  options: TavernGeneratorOptions,
  rng: Rng,
): ResolvedTavern {
  return {
    tavernType:
      options.type ||
      pickFrom(socialHubConfig.venueTypesByGenre["Fantasy"], rng),
    atmosphere:
      options.atmosphere || pickFrom(socialHubConfig.atmospheres, rng),
    settlementType:
      options.settlementType || pickFrom(socialHubConfig.settlementTypes, rng),
    wealthLevel: options.wealthLevel || socialHubConfig.wealthLevels[2],
    clientele:
      options.clientele ||
      pickFrom(socialHubConfig.clientelesByGenre["Fantasy"], rng),
    campaignContext: options.campaignContext?.trim() || undefined,
    namingDirective: pickFrom(TAVERN_NAMING_STYLES, rng),
    varianceSeed: Math.floor(rng() * 99991) + 10,
  };
}

export function buildSocialHubPrompt(
  options: SocialHubGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): SocialHubPrompt {
  const resolved = resolveSocialHub(options, rng);
  const systemInstruction = `You are an expert RPG campaign writer. You generate immediately usable social gathering locations for tabletop GMs in JSON format. You write in the register of the specified genre — a cyberpunk noodle bar sounds nothing like a fantasy tavern.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "The venue's name — genre-appropriate and specific. Fantasy: worn adjective + mundane noun (e.g. 'The Sullen Lantern', 'The Dented Kettle'). Cyberpunk: handle or moniker. Western: frontier object or ironic phrase. Avoid stock names like The Golden Goblet, The Silver Stag, The Prancing Pony.",
  "summary": "One sentence: the venue's character and why a GM should use it.",
  "content": "Markdown. Use exactly these four section headers in order: '### The Place', '### The People', '### The Trouble', '### How to use it at the table'. Each section: 2-4 tight sentences. Write in the genre's register. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure:\\n### At a Glance\\n- **Type**: venue type\\n- **Atmosphere**: mood and feel\\n- **Owner / Operator**: name and one-line description (genre-appropriate)\\n- **Signature Drink or Service**: specific invented item or service\\n- **Hidden Problem**: the trouble simmering beneath the surface\\n- **Immediate Hook**: one-sentence GM hook\\n### Notable Regulars\\n- **Name**: one-line description (2-3 regulars, genre-appropriate)\\n### Rumours\\n- short rumour (2-3 rumours as bullet points)\\n### Entity Seeds\\n- list of 3-4 Codex entity types that naturally emerge from this venue (e.g. '**Location**: The back room')",
  "labels": ["2-4 lowercase genre-appropriate tags, plus 'rpg-location', 'social-hub-generator', 'imported-draft'"]
}

QUALITY RULES:
- Everything — names, slang, concerns, technology — must fit the genre.
- The owner/operator must have a name, a distinguishing detail, and a secret or motive.
- Each regular should feel like a distinct person with a reason to be there.
- Rumours should be specific, not generic.
- Entity seeds should suggest concrete Codex entries a GM could create.
- ${NAME_BAN_PROMPT}
${sessionContext}`;

  const userMessage = `Generate a social gathering location. Variation seed: ${resolved.varianceSeed}.
- Genre / Setting: ${resolved.genre}
- Venue Type: ${resolved.venueType}
- Atmosphere: ${resolved.atmosphere}
- Wealth Level: ${resolved.wealthLevel}
- Primary Clientele: ${resolved.clientele}${resolved.campaignContext ? `\n- Campaign Context: ${resolved.campaignContext}` : ""}`;

  return { systemInstruction, userMessage, resolved };
}

export function buildTavernPrompt(
  options: TavernGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): TavernPrompt {
  const resolved = resolveTavern(options, rng);
  const systemInstruction = `You are an expert RPG campaign writer. You generate immediately usable tavern and inn locations for tabletop GMs in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "The tavern's name (follow the naming directive in the user message)",
  "summary": "One sentence: the tavern's character and why a GM should use it (e.g. 'A cramped dockside alehouse where smugglers and off-duty guards share the same bad wine.').",
  "content": "Markdown. Use exactly these four section headers in order: '### The Place', '### The People', '### The Trouble', '### How to use it at the table'. Each section: 2-4 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure:\\n### At a Glance\\n- **Type**: tavern type\\n- **Atmosphere**: mood and feel\\n- **Owner**: name and one-line description\\n- **Signature Drink or Dish**: specific invented item\\n- **Hidden Problem**: the trouble simmering beneath the surface\\n- **Immediate Hook**: one-sentence GM hook\\n### Notable Patrons\\n- **Name**: one-line description (2-3 patrons)\\n### Rumours\\n- short rumour (2-3 rumours as bullet points)\\n### Entity Seeds\\n- list of 3-4 Codex entity types that naturally emerge from this tavern (e.g. '**Location**: The cellar passage')",
  "labels": ["2-4 lowercase tags, plus 'rpg-location', 'tavern-generator', 'imported-draft'"]
}

QUALITY RULES:
- The owner must have a name, a distinguishing physical detail, and a secret or motive.
- Each patron should feel like a distinct person with a reason to be there.
- Rumours should be specific, not generic ('a merchant was poisoned last week' beats 'strange things have been happening').
- Entity seeds should suggest concrete Codex entries a GM could create.
- ${NAME_BAN_PROMPT}
${sessionContext}
- Never use: The Prancing Pony, The Silver Stag, The Golden Goblet, The Wandering Wizard, The Rusty Sword, The Dragon's Den, The Black Cat, The Red Lion, or any name that reads like a stock fantasy placeholder.
- Prefer names with a specific, slightly worn quality — something that feels like it was named by a local, not by a committee.`;

  const userMessage = `Generate a tavern. Variation seed: ${resolved.varianceSeed}.
- Type: ${resolved.tavernType}
- Atmosphere: ${resolved.atmosphere}
- Settlement Type: ${resolved.settlementType}
- Wealth Level: ${resolved.wealthLevel}
- Primary Clientele: ${resolved.clientele}${resolved.campaignContext ? `\n- Campaign Context: ${resolved.campaignContext}` : ""}
- Naming Directive: ${resolved.namingDirective}`;

  return { systemInstruction, userMessage, resolved };
}

function parseJson(text: string): Record<string, unknown> {
  return parseFencedJson<Record<string, unknown>>(text);
}

function stringField(data: Record<string, unknown>, key: string): string {
  return asString(data[key]);
}

export function parseSocialHubResponse(text: string): PublicGeneratorOutput {
  const data = parseJson(text);
  return {
    type: "location",
    title: stringField(data, "title") || "The Unnamed Venue",
    summary: stringField(data, "summary"),
    content: stringField(data, "content"),
    lore: stringField(data, "lore"),
    labels: Array.isArray(data.labels)
      ? data.labels.filter(
          (label): label is string => typeof label === "string",
        )
      : ["rpg-location", "social-hub-generator", "imported-draft"],
    status: "active",
  };
}

export function parseTavernResponse(text: string): PublicGeneratorOutput {
  const data = parseJson(text);
  return {
    type: "location",
    title: stringField(data, "title") || "The Unnamed Tavern",
    summary: stringField(data, "summary"),
    content: stringField(data, "content"),
    lore: stringField(data, "lore"),
    labels: Array.isArray(data.labels)
      ? data.labels.filter(
          (label): label is string => typeof label === "string",
        )
      : ["rpg-location", "tavern-generator", "imported-draft"],
    status: "active",
  };
}

export function generateSocialHubLocal(
  options: SocialHubGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveSocialHub(options, rng);
  const trouble = pickFrom(socialHubConfig.troubles, rng);
  const ownerName = generateName(rng);
  const patron1 = generateName(rng);
  const patron2 = generateName(rng);

  const techSuffixes: Record<string, string[]> = {
    Cyberpunk: ["Node", "Den", "Hub", "Spot", "Joint"],
    "Sci-Fi": ["Bay", "Dock", "Zone", "Platform", "Hub"],
  };
  const isTechGenre =
    resolved.genre === "Cyberpunk" || resolved.genre === "Sci-Fi";
  const venueName = isTechGenre
    ? `${ownerName.split(" ")[0]}'s ${pickFrom(techSuffixes[resolved.genre], rng)}`
    : buildTavernName(rng);

  const summary = `A ${resolved.atmosphere.toLowerCase()} ${resolved.venueType.toLowerCase()} serving ${resolved.clientele.toLowerCase()}.`;

  const hubPeopleVariants = [
    `The operator, ${ownerName}, runs a tight establishment. Regular faces include ${patron1}, a well-known local, and ${patron2}, who rarely speaks about where they sleep.`,
    `${ownerName} keeps the place running through a combination of competence and deliberate incuriosity. ${patron1} has been coming here long enough to be furniture. ${patron2} arrived recently and has already become someone people notice.`,
    `The regular crowd cycles around ${patron1}, who provides social continuity, and ${patron2}, whose presence here raises questions nobody has yet asked aloud. ${ownerName} manages both without appearing to manage either.`,
    `${ownerName} knows more about the regulars than they let on. ${patron1} is one of the faces who makes the place feel safe. ${patron2} is one of the faces that does not quite fit — and ${ownerName} has noticed.`,
    `Ask ${ownerName} about the regulars and you get polite generalities. Ask ${patron1} and you get opinions. Ask ${patron2} and they change the subject.`,
  ] as const;

  const hubTroubleClosers = [
    `The operator is aware of enough to be nervous, but not enough to act.`,
    `${ownerName} has chosen not to know more than necessary. That choice is becoming harder to maintain.`,
    `The operator has noticed the signs and filed them under things that resolve themselves. They are starting to reconsider that policy.`,
    `${ownerName} knows something is wrong. They do not know whether getting involved makes it better or makes them a target.`,
    `The place's reputation for discretion is part of what allowed this to take root. ${ownerName} understands that.`,
  ] as const;

  const hubHowToUseVariants = [
    `Use ${venueName} as a home base, an information hub, or a pressure point. The trouble beneath the surface gives any visit the potential to escalate.`,
    `${venueName} works best as a recurring location — somewhere the party keeps returning to, where the regulars remember them and the trouble keeps developing.`,
    `Let the party treat ${venueName} as safe ground early. The hidden trouble is what eventually makes that assumption cost them something.`,
    `Use ${venueName} to deliver information sideways — through regulars, overheard conversations, and things ${ownerName} says without quite saying.`,
    `${venueName} is most effective as a place where the party feels comfortable and the GM knows they should not be.`,
  ] as const;

  const content = `### The Place
${venueName} is a ${resolved.venueType.toLowerCase()} catering to ${resolved.clientele.toLowerCase()}. The atmosphere is ${resolved.atmosphere.toLowerCase()}, and the wealth level is ${resolved.wealthLevel.toLowerCase()}.${resolved.campaignContext ? ` In ${resolved.campaignContext}, it sits at the edge of the main conflict.` : ""}

### The People
${pickFrom(hubPeopleVariants, rng)}

### The Trouble
${trouble}. ${pickFrom(hubTroubleClosers, rng)}

### How to use it at the table
${pickFrom(hubHowToUseVariants, rng)}`;

  const lore = `### At a Glance
- **Type**: ${resolved.venueType}
- **Atmosphere**: ${resolved.atmosphere}
- **Owner / Operator**: ${ownerName} — competent, guarded, and owed favours by the wrong people
- **Signature Drink or Service**: The house special, served without questions
- **Hidden Problem**: ${trouble}
- **Immediate Hook**: A regular has not shown up for three days — their usual spot is still being held

### Notable Regulars
- **${patron1}**: A reliable local who knows more than they let on
- **${patron2}**: A recent arrival who pays in currency that raises questions

### Rumours
- Someone was seen leaving through the back way well after hours
- A back room was recently sealed off — the operator says maintenance, locals say otherwise
- A faction has been asking after a specific regular who may have passed through recently

### Entity Seeds
- **📍 ${venueName} (this venue)**: The main location of the venue.
- **👤 ${ownerName} (operator)**: The operator of the venue.
- **👤 ${patron1} (regular)**: A notable regular patron.
- **👥 Faction behind ${trouble.split("—")[0].trim()}**: Whoever is behind the hidden trouble.`;

  return {
    type: "location",
    title: venueName,
    summary,
    content,
    lore,
    labels: ["rpg-location", "social-hub-generator", "imported-draft"],
    status: "active",
  };
}

export function generateTavernLocal(
  options: TavernGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveTavern(options, rng);
  const trouble = pickFrom(socialHubConfig.troubles, rng);
  const ownerName = generateName(rng);
  const patron1 = generateName(rng);
  const patron2 = generateName(rng);
  const tavernName = buildTavernName(rng);

  const summary = `A ${resolved.atmosphere.toLowerCase()} ${resolved.tavernType.toLowerCase()} serving ${resolved.clientele.toLowerCase()} in a ${resolved.settlementType.toLowerCase()}.`;

  const tavernPeopleVariants = [
    `The owner, ${ownerName}, runs a tight establishment. Regular patrons include ${patron1}, a well-known local face, and ${patron2}, who rarely speaks about where they sleep.`,
    `${ownerName} keeps order here through reputation as much as authority. ${patron1} has been a fixture long enough that their absence would be noticed. ${patron2} is newer and harder to read.`,
    `Ask ${ownerName} about anything delicate and you get polished deflection. The regulars — ${patron1} in particular — have sharper answers if approached correctly. ${patron2} is the one nobody has quite figured out yet.`,
    `${ownerName} manages the place and the people with equal competence. ${patron1} represents the reliable core of the regulars. ${patron2} is a recent addition who has already become a talking point.`,
    `The owner is ${ownerName}, who knows when to ask questions and when not to. ${patron1} has been here long enough to remember how things used to be. ${patron2} showed up three weeks ago and the other regulars have already started watching them.`,
  ] as const;

  const tavernTroubleClosers = [
    `The owner is aware of enough to be nervous, but not enough to act.`,
    `${ownerName} has made a deliberate choice not to look too closely. That calculation is starting to shift.`,
    `The owner has noticed something is wrong. The question is whether getting involved protects the establishment or endangers it.`,
    `${ownerName} knows the signs of trouble and has been reading them for a week. They have not decided what to do about it yet.`,
    `The trouble has been building long enough that ${ownerName} can no longer claim not to have seen it coming.`,
  ] as const;

  const tavernHowToUseVariants = [
    `Use ${tavernName} as a home base, a rumour hub, or a pressure point. The trouble beneath the surface gives any visit the potential to escalate.`,
    `${tavernName} works best as a recurring location where the party builds relationships and the hidden trouble slowly becomes their problem.`,
    `Let the party feel at home here before the trouble surfaces. The contrast between comfort and complication is the point.`,
    `Use the regulars to deliver information naturally — what ${patron1} says offhand and what ${patron2} avoids saying are both useful.`,
    `${tavernName} is the kind of place campaigns return to. Make it feel lived-in early, and the trouble will land harder when it arrives.`,
  ] as const;

  const content = `### The Place
${tavernName} is a ${resolved.tavernType.toLowerCase()} in a ${resolved.settlementType.toLowerCase()}, catering to ${resolved.clientele.toLowerCase()}. The atmosphere is ${resolved.atmosphere.toLowerCase()}, and the wealth level is ${resolved.wealthLevel.toLowerCase()}.${resolved.campaignContext ? ` In ${resolved.campaignContext}, it sits at the edge of the main conflict.` : ""}

### The People
${pickFrom(tavernPeopleVariants, rng)}

### The Trouble
${trouble}. ${pickFrom(tavernTroubleClosers, rng)}

### How to use it at the table
${pickFrom(tavernHowToUseVariants, rng)}`;

  const lore = `### At a Glance
- **Type**: ${resolved.tavernType}
- **Atmosphere**: ${resolved.atmosphere}
- **Owner**: ${ownerName} — competent, guarded, and owed favours by the wrong people
- **Signature Drink**: House ale brewed in the cellar, served warm
- **Hidden Problem**: ${trouble}
- **Immediate Hook**: A regular patron has not shown up for three days — their usual table is still reserved

### Notable Patrons
- **${patron1}**: A reliable local who knows more than they let on
- **${patron2}**: A recent arrival who pays in coin that smells of somewhere far away

### Rumours
- Someone was seen leaving through the back door well after midnight
- The cellar was recently bricked up — the owner says rats, locals say otherwise
- A faction has been asking after a specific traveller who may have stayed here recently

### Entity Seeds
- **📍 ${tavernName} (this tavern)**: The main location of the tavern.
- **👤 ${ownerName} (owner)**: The owner of the tavern.
- **👤 ${patron1} (regular patron)**: A notable regular patron.
- **👥 Faction behind ${trouble.split("—")[0].trim()}**: Whoever is behind the hidden trouble.`;

  return {
    type: "location",
    title: tavernName,
    summary,
    content,
    lore,
    labels: ["rpg-location", "tavern-generator", "imported-draft"],
    status: "active",
  };
}
