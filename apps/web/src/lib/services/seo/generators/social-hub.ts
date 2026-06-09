import type { DefaultAIClientManager } from "$lib/services/ai/client-manager";
import { type GeneratorOutput, generateName } from "./base";

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
    Western: [
      "Cowboys and drifters",
      "Miners and prospectors",
      "Outlaws and bounty hunters",
      "Townsfolk",
      "Railroad workers",
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

export async function generateSocialHub(
  clientManager: DefaultAIClientManager,
  options: {
    genre?: string;
    venueType?: string;
    atmosphere?: string;
    wealthLevel?: string;
    clientele?: string;
    campaignContext?: string;
    useAI?: boolean;
  } = {},
): Promise<GeneratorOutput> {
  const genre =
    options.genre ||
    socialHubConfig.genres[
      Math.floor(Math.random() * socialHubConfig.genres.length)
    ];
  const venueTypes =
    socialHubConfig.venueTypesByGenre[genre] ??
    socialHubConfig.venueTypesByGenre["Fantasy"];
  const venueType =
    options.venueType ||
    venueTypes[Math.floor(Math.random() * venueTypes.length)];
  const atmosphere =
    options.atmosphere ||
    socialHubConfig.atmospheres[
      Math.floor(Math.random() * socialHubConfig.atmospheres.length)
    ];
  const wealthLevel = options.wealthLevel || socialHubConfig.wealthLevels[2];
  const clienteles =
    socialHubConfig.clientelesByGenre[genre] ??
    socialHubConfig.clientelesByGenre["Fantasy"];
  const clientele =
    options.clientele ||
    clienteles[Math.floor(Math.random() * clienteles.length)];
  const campaignContext = options.campaignContext?.trim();
  const varianceSeed = Math.floor(Math.random() * 99991) + 10;

  if (options.useAI !== false) {
    try {
      const systemInstruction = `You are an expert RPG campaign writer. You generate immediately usable social gathering locations for tabletop GMs in JSON format. You write in the register of the specified genre — a cyberpunk noodle bar sounds nothing like a fantasy tavern.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "The venue's name — genre-appropriate (a cyberpunk dive has a neon handle, a fantasy inn has 'The X Y' naming, a western saloon uses frontier naming, etc.)",
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
- Entity seeds should suggest concrete Codex entries a GM could create.`;

      const userMessage = `Generate a social gathering location. Variation seed: ${varianceSeed}.
- Genre / Setting: ${genre}
- Venue Type: ${venueType}
- Atmosphere: ${atmosphere}
- Wealth Level: ${wealthLevel}
- Primary Clientele: ${clientele}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}`;

      const model = await clientManager.getModel(
        "",
        "gemini-3.1-flash-lite",
        systemInstruction,
      );
      const response = await model.generateContent(userMessage);
      const text = response.response.text().trim();
      const cleanText = text
        .replace(/^```json\s*/i, "")
        .replace(/```$/, "")
        .trim();
      const data = JSON.parse(cleanText);

      return {
        type: "location",
        title: data.title || "The Unnamed Venue",
        summary: data.summary || "",
        content: data.content || "",
        lore: data.lore || "",
        labels: Array.isArray(data.labels)
          ? data.labels
          : ["rpg-location", "social-hub-generator", "imported-draft"],
        status: "active",
      };
    } catch (err) {
      console.warn("AI generation failed, falling back to local tables:", err);
    }
  }

  const trouble =
    socialHubConfig.troubles[
      Math.floor(Math.random() * socialHubConfig.troubles.length)
    ];
  const ownerName = generateName();
  const patron1 = generateName();
  const patron2 = generateName();
  const rawName = generateName().replace(/\s+The\s+\S+$/, "");

  const fantasyLikeSuffixes = ["Arms", "Rest", "Tap", "Lodge", "House"];
  const cyberpunkSuffixes = ["Node", "Den", "Hub", "Spot", "Joint"];
  const westernSuffixes = ["Saloon", "House", "Post", "Room", "Bar"];
  const suffixMap: Record<string, string[]> = {
    Fantasy: fantasyLikeSuffixes,
    "Dark Fantasy": fantasyLikeSuffixes,
    Pirate: ["Cove", "Hole", "Deck", "Anchor", "Port"],
    Cyberpunk: cyberpunkSuffixes,
    "Sci-Fi": ["Bay", "Dock", "Zone", "Platform", "Hub"],
    Modern: ["Bar", "Lounge", "Spot", "Place", "Corner"],
    Horror: ["Den", "Hollow", "Parlour", "Chamber", "Haunt"],
    "Post-Apocalyptic": ["Shack", "Hole", "Stop", "Den", "Post"],
    Western: westernSuffixes,
  };
  const suffixes = suffixMap[genre] ?? fantasyLikeSuffixes;
  const venueName =
    genre === "Cyberpunk" || genre === "Sci-Fi"
      ? `${rawName}'s ${suffixes[Math.floor(Math.random() * suffixes.length)]}`
      : `The ${rawName} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;

  const summary = `A ${atmosphere.toLowerCase()} ${venueType.toLowerCase()} serving ${clientele.toLowerCase()}.`;

  const content = `### The Place
${venueName} is a ${venueType.toLowerCase()} catering to ${clientele.toLowerCase()}. The atmosphere is ${atmosphere.toLowerCase()}, and the wealth level is ${wealthLevel.toLowerCase()}.${campaignContext ? ` In ${campaignContext}, it sits at the edge of the main conflict.` : ""}

### The People
The operator, ${ownerName}, runs a tight establishment. Regular faces include ${patron1}, a well-known local, and ${patron2}, who rarely speaks about where they sleep.

### The Trouble
${trouble}. The operator is aware of enough to be nervous, but not enough to act.

### How to use it at the table
Use ${venueName} as a home base, an information hub, or a pressure point. The trouble beneath the surface gives any visit the potential to escalate.`;

  const lore = `### At a Glance
- **Type**: ${venueType}
- **Atmosphere**: ${atmosphere}
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
- **Location**: ${venueName} (this venue)
- **Character**: ${ownerName} (operator)
- **Character**: ${patron1} (regular)
- **Faction**: Whoever is behind the hidden trouble`;

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

export async function generateTavern(
  clientManager: DefaultAIClientManager,
  options: {
    type?: string;
    atmosphere?: string;
    settlementType?: string;
    wealthLevel?: string;
    clientele?: string;
    campaignContext?: string;
    useAI?: boolean;
  } = {},
): Promise<GeneratorOutput> {
  const tavernType =
    options.type ||
    socialHubConfig.venueTypesByGenre["Fantasy"][
      Math.floor(
        Math.random() * socialHubConfig.venueTypesByGenre["Fantasy"].length,
      )
    ];
  const atmosphere =
    options.atmosphere ||
    socialHubConfig.atmospheres[
      Math.floor(Math.random() * socialHubConfig.atmospheres.length)
    ];
  const settlementType =
    options.settlementType ||
    socialHubConfig.settlementTypes[
      Math.floor(Math.random() * socialHubConfig.settlementTypes.length)
    ];
  const wealthLevel = options.wealthLevel || socialHubConfig.wealthLevels[2];
  const clientele =
    options.clientele ||
    socialHubConfig.clientelesByGenre["Fantasy"][
      Math.floor(
        Math.random() * socialHubConfig.clientelesByGenre["Fantasy"].length,
      )
    ];
  const campaignContext = options.campaignContext?.trim();

  const namingStyles = [
    "Name it after an animal and a colour or material (e.g. 'The Copper Boar').",
    "Name it after an object associated with the owner's past — a weapon, trade tool, or keepsake.",
    "Use a short ironic phrase that locals find funny (e.g. 'The Honest Scales').",
    "Name it after a local legend, battle, or geographical feature specific to the setting.",
    "Use a two-word compound that evokes the atmosphere — one noun, one adjective (e.g. 'The Sullen Lantern').",
  ];
  const varianceSeed = Math.floor(Math.random() * 99991) + 10;

  if (options.useAI !== false) {
    try {
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
- Place names and NPC names must be invented — avoid Oakhaven, Millbrook, Riverdale, and generic monosyllable English surnames.`;

      const userMessage = `Generate a tavern. Variation seed: ${varianceSeed}.
- Type: ${tavernType}
- Atmosphere: ${atmosphere}
- Settlement Type: ${settlementType}
- Wealth Level: ${wealthLevel}
- Primary Clientele: ${clientele}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}
- Naming Directive: ${namingStyles[Math.floor(Math.random() * namingStyles.length)]}`;

      const model = await clientManager.getModel(
        "",
        "gemini-3.1-flash-lite",
        systemInstruction,
      );
      const response = await model.generateContent(userMessage);
      const text = response.response.text().trim();
      const cleanText = text
        .replace(/^```json\s*/i, "")
        .replace(/```$/, "")
        .trim();
      const data = JSON.parse(cleanText);

      return {
        type: "location",
        title: data.title || "The Unnamed Tavern",
        summary: data.summary || "",
        content: data.content || "",
        lore: data.lore || "",
        labels: Array.isArray(data.labels)
          ? data.labels
          : ["rpg-location", "tavern-generator", "imported-draft"],
        status: "active",
      };
    } catch (err) {
      console.warn("AI generation failed, falling back to local tables:", err);
    }
  }

  const trouble =
    socialHubConfig.troubles[
      Math.floor(Math.random() * socialHubConfig.troubles.length)
    ];
  const ownerName = generateName();
  const patron1 = generateName();
  const patron2 = generateName();
  const rawName = generateName().replace(/\s+The\s+\S+$/, "");
  const tavernName = `The ${rawName} ${["Arms", "Rest", "Tap", "Lodge", "House"][Math.floor(Math.random() * 5)]}`;

  const summary = `A ${atmosphere.toLowerCase()} ${tavernType.toLowerCase()} serving ${clientele.toLowerCase()} in a ${settlementType.toLowerCase()}.`;

  const content = `### The Place
${tavernName} is a ${tavernType.toLowerCase()} in a ${settlementType.toLowerCase()}, catering to ${clientele.toLowerCase()}. The atmosphere is ${atmosphere.toLowerCase()}, and the wealth level is ${wealthLevel.toLowerCase()}.${campaignContext ? ` In ${campaignContext}, it sits at the edge of the main conflict.` : ""}

### The People
The owner, ${ownerName}, runs a tight establishment. Regular patrons include ${patron1}, a well-known local face, and ${patron2}, who rarely speaks about where they sleep.

### The Trouble
${trouble}. The owner is aware of enough to be nervous, but not enough to act.

### How to use it at the table
Use ${tavernName} as a home base, a rumour hub, or a pressure point. The trouble beneath the surface gives any visit the potential to escalate.`;

  const lore = `### At a Glance
- **Type**: ${tavernType}
- **Atmosphere**: ${atmosphere}
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
- **Location**: ${tavernName} (this tavern)
- **Character**: ${ownerName} (owner)
- **Character**: ${patron1} (regular patron)
- **Faction**: Whoever is behind the hidden trouble`;

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
