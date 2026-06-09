import type { DefaultAIClientManager } from "$lib/services/ai/client-manager";
import { NAME_BAN_PROMPT } from "./banned-names";
import { getSessionContext } from "./session-context";
import { type GeneratorOutput, generateName, pickFrom } from "./base";

const REALM_ROOTS = [
  "Ashenveil",
  "Stonemark",
  "Duskwall",
  "Irongate",
  "Coldmere",
  "Blackthorn",
  "Salthaven",
  "Greymarch",
  "Embervale",
  "Cinderfall",
  "Hollowreach",
  "Dunmere",
  "Thornwall",
  "Wraithfen",
  "Brokenridge",
  "Dawnspire",
  "Moorholt",
  "Saltfang",
  "Stormbreak",
  "Halveth",
  "Vorreth",
  "Kaelthas",
  "Myreth",
  "Vorath",
  "Dunrath",
  "Solvane",
  "Krethis",
  "Aelvorn",
  "Norrith",
  "Caldreth",
];

const CAPITAL_WORDS = [
  "Veth",
  "Dorn",
  "Rath",
  "Moor",
  "Holt",
  "Fen",
  "Wick",
  "Crest",
  "Gate",
  "Hold",
  "Keep",
  "Reach",
  "Wall",
  "Ford",
  "Vale",
];

function buildRealmName(polityType: string): string {
  const root = pickFrom(REALM_ROOTS);
  return `The ${root} ${polityType}`;
}

function buildCapitalName(): string {
  const a = pickFrom(REALM_ROOTS).replace(/\s.*/, "").slice(0, 5);
  const b = pickFrom(CAPITAL_WORDS);
  return `${a}${b.toLowerCase()}`;
}

export const nationConfig = {
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
  polityTypesByGenre: {
    Fantasy: [
      "Kingdom",
      "Empire",
      "City-State",
      "Duchy",
      "Theocracy",
      "Tribal Confederation",
      "Republic",
      "Protectorate",
    ],
    "Dark Fantasy": [
      "Cursed Realm",
      "Necromancer's Domain",
      "Warlord Territory",
      "Fallen Empire",
      "Plague State",
    ],
    Pirate: [
      "Free Port",
      "Pirate Confederation",
      "Merchant Republic",
      "Privateer Kingdom",
      "Smuggler's Haven",
    ],
    Cyberpunk: [
      "Megacorp-State",
      "Gang Territory",
      "Free Zone",
      "Corporate Enclave",
      "Tech Oligarchy",
    ],
    "Sci-Fi": [
      "Interstellar Federation",
      "Colony Authority",
      "Trade Consortium",
      "Military Junta",
      "Hive Mind Territory",
    ],
    Modern: [
      "Nation-State",
      "Autonomous Region",
      "Rogue State",
      "International Bloc",
      "Failed State",
    ],
    Horror: [
      "Cursed Domain",
      "Cult Territory",
      "Isolated Community",
      "Shadow Government",
      "Quarantine Zone",
    ],
    "Post-Apocalyptic": [
      "Warlord Territory",
      "Survivor Settlement",
      "Cult Domain",
      "Scavenger Confederation",
      "Bunker State",
    ],
    Western: [
      "Territory",
      "Frontier Confederation",
      "Railroad Authority",
      "Outlaw Republic",
      "Native Nation",
    ],
  } as Record<string, string[]>,
  governmentStyles: [
    "Hereditary dynasty",
    "Elected council",
    "Military dictatorship",
    "Theocratic rule",
    "Oligarchy",
    "Constitutional government",
    "Tribal / clan elders",
    "Corporate board",
    "Revolutionary committee",
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
  troubles: [
    "The ruling class is fracturing over a succession crisis",
    "A powerful faction is quietly positioning to seize control",
    "An economic collapse is being hidden from the public",
    "A border dispute is being deliberately escalated by a third party",
    "A secret the ruler is keeping could delegitimise the entire state",
    "An internal resistance movement is closer to open revolt than anyone admits",
  ],
};

export const kingdomConfig = {
  polityTypes: nationConfig.polityTypesByGenre["Fantasy"],
  governmentStyles: nationConfig.governmentStyles.slice(0, 7),
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
  scales: nationConfig.scales,
  conflictLevels: nationConfig.conflictLevels,
  magicLevels: [
    "No magic",
    "Rare and feared",
    "Common but regulated",
    "Widely practiced",
    "Magic-dependent society",
  ],
  troubles: nationConfig.troubles,
};

export async function generateKingdom(
  clientManager: DefaultAIClientManager,
  options: {
    polityType?: string;
    governmentStyle?: string;
    geography?: string;
    scale?: string;
    conflictLevel?: string;
    magicLevel?: string;
    campaignContext?: string;
    useAI?: boolean;
  } = {},
): Promise<GeneratorOutput> {
  const polityType =
    options.polityType ||
    kingdomConfig.polityTypes[
      Math.floor(Math.random() * kingdomConfig.polityTypes.length)
    ];
  const governmentStyle =
    options.governmentStyle ||
    kingdomConfig.governmentStyles[
      Math.floor(Math.random() * kingdomConfig.governmentStyles.length)
    ];
  const geography =
    options.geography ||
    kingdomConfig.geographies[
      Math.floor(Math.random() * kingdomConfig.geographies.length)
    ];
  const scale = options.scale || kingdomConfig.scales[2];
  const conflictLevel =
    options.conflictLevel ||
    kingdomConfig.conflictLevels[
      Math.floor(Math.random() * kingdomConfig.conflictLevels.length)
    ];
  const magicLevel = options.magicLevel || kingdomConfig.magicLevels[2];
  const campaignContext = options.campaignContext?.trim();
  const varianceSeed = Math.floor(Math.random() * 99991) + 10;

  if (options.useAI !== false) {
    try {
      const systemInstruction = `You are an expert RPG campaign writer. You generate immediately usable fantasy kingdoms and political entities for tabletop GMs in JSON format.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "The realm's name — invented. Use one of: a compound place-word ('Ashenveil Kingdom', 'Stonemark Empire'), an ancient-sounding root ('Kaelthas', 'Vorath'), or a short descriptive ('The Iron March', 'The Sundered Coast'). Avoid 'Eldoria', 'Arandor', 'Valdris', and any name that sounds like a stock fantasy placeholder.",
  "summary": "One sentence: the kingdom's defining character and why a GM should use it.",
  "content": "Markdown. Use exactly these four section headers in order: '### The Realm', '### Government & Power', '### Society & Culture', '### How to use it at the table'. Each section: 3-5 tight sentences. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure:\\n### At a Glance\\n- **Polity Type**: ${polityType}\\n- **Ruler**: invented name and one-line description\\n- **Capital**: invented name and one-line description\\n- **Scale**: population/territory summary\\n- **Magic Level**: ${magicLevel}\\n- **Conflict Level**: ${conflictLevel}\\n- **Hidden Problem**: the tension simmering beneath the surface\\n- **Immediate Hook**: one-sentence GM hook\\n### Major Factions\\n- **Name**: one-line description (2-3 factions)\\n### Rumours & Hooks\\n- short hook (2-3 bullet points)\\n### Entity Seeds\\n- list of 4-5 Codex entity types (e.g. '**Character**: The regent', '**Faction**: The merchant guild', '**Location**: The capital city')",
  "labels": ["2-4 lowercase tags, plus 'rpg-kingdom', 'kingdom-generator', 'imported-draft'"]
}

QUALITY RULES:
- The ruler must have a name, a defining trait, and a secret motive.
- Each faction should have a clear agenda that creates tension with another faction.
- Rumours should be specific and actionable — something a party could investigate.
- Entity seeds should suggest concrete Codex entries a GM would actually create.
- All names must be invented — avoid generic English words as names.
- ${NAME_BAN_PROMPT}
${getSessionContext()}`;

      const namingStyles = [
        "Use a compound place-word as the realm name (e.g. 'Ashenveil Kingdom', 'Irongate Empire', 'Duskwall Duchy').",
        "Use an ancient-sounding invented root as the realm name (e.g. 'Kaelthas', 'Vorath', 'Myreth Dominion').",
        "Use a short descriptive phrase as the realm name (e.g. 'The Iron March', 'The Sundered Coast', 'The Pale Reach').",
      ];
      const userMessage = `Generate a fantasy kingdom. Variation seed: ${varianceSeed}.
- Polity Type: ${polityType}
- Government Style: ${governmentStyle}
- Geography: ${geography}
- Scale: ${scale}
- Conflict Level: ${conflictLevel}
- Magic Level: ${magicLevel}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}
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
        type: "faction",
        title: data.title || "The Unnamed Realm",
        summary: data.summary || "",
        content: data.content || "",
        lore: data.lore || "",
        labels: Array.isArray(data.labels)
          ? data.labels
          : ["rpg-kingdom", "kingdom-generator", "imported-draft"],
        status: "active",
      };
    } catch (err) {
      console.warn("AI generation failed, falling back to local tables:", err);
    }
  }

  const trouble =
    kingdomConfig.troubles[
      Math.floor(Math.random() * kingdomConfig.troubles.length)
    ];
  const rulerName = generateName();
  const factionName1 = `The ${generateName()} ${pickFrom(["Order", "Council", "League", "Brotherhood", "Guild"])}`;
  const factionName2 = `The ${generateName()} ${pickFrom(["Compact", "Circle", "Assembly", "Society", "House"])}`;
  const realmName = buildRealmName(polityType);
  const capitalName = buildCapitalName();

  const summary = `A ${conflictLevel.toLowerCase()} ${polityType.toLowerCase()} set in ${geography.toLowerCase()}, ruled by a ${governmentStyle.toLowerCase()}.`;

  const content = `### The Realm
${realmName} is a ${scale.toLowerCase()} ${polityType.toLowerCase()} occupying ${geography.toLowerCase()} terrain. Its capital, ${capitalName}, serves as the seat of power and the heart of its culture.${campaignContext ? ` In ${campaignContext}, it sits at the centre of the main conflict.` : ""}

### Government & Power
${rulerName} leads through a system of ${governmentStyle.toLowerCase()}. The realm's magic level is ${magicLevel.toLowerCase()}, which shapes both its military capability and its social order. ${trouble}.

### Society & Culture
The population lives under the tension of a realm at ${conflictLevel.toLowerCase()}. Loyalty is currency, and old alliances are being quietly renegotiated. The ruling class projects stability but its grip is tested daily.

### How to use it at the table
Use ${realmName} as the political backdrop for a campaign, the origin of a patron, or the prize in a succession conflict. The hidden trouble gives any visit the potential to escalate into something bigger.`;

  const lore = `### At a Glance
- **Polity Type**: ${polityType}
- **Ruler**: ${rulerName} — calculating, cautious, and sitting on a secret
- **Capital**: ${capitalName} — walled, busy, and watched
- **Scale**: ${scale}
- **Magic Level**: ${magicLevel}
- **Conflict Level**: ${conflictLevel}
- **Hidden Problem**: ${trouble}
- **Immediate Hook**: A royal messenger arrived three days ago and has not been seen since

### Major Factions
- **${factionName1}**: Controls access to the realm's key resource and wants more influence at court
- **${factionName2}**: Opposes the current ruler — quietly, for now

### Rumours & Hooks
- The ruler has been sending unmarked correspondence to a foreign power
- A border garrison was found abandoned — no bodies, no signs of battle
- ${factionName1} is recruiting outside its usual membership

### Entity Seeds
- **Character**: ${rulerName} (ruler)
- **Faction**: ${factionName1}
- **Faction**: ${factionName2}
- **Location**: ${capitalName} (capital)
- **Event**: The hidden crisis behind ${trouble.split("—")[0].trim()}`;

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

export async function generateNation(
  clientManager: DefaultAIClientManager,
  options: {
    genre?: string;
    polityType?: string;
    governmentStyle?: string;
    scale?: string;
    conflictLevel?: string;
    campaignContext?: string;
    useAI?: boolean;
  } = {},
): Promise<GeneratorOutput> {
  const genre =
    options.genre ||
    nationConfig.genres[Math.floor(Math.random() * nationConfig.genres.length)];
  const polityTypes =
    nationConfig.polityTypesByGenre[genre] ??
    nationConfig.polityTypesByGenre["Fantasy"];
  const polityType =
    options.polityType ||
    polityTypes[Math.floor(Math.random() * polityTypes.length)];
  const governmentStyle =
    options.governmentStyle ||
    nationConfig.governmentStyles[
      Math.floor(Math.random() * nationConfig.governmentStyles.length)
    ];
  const scale = options.scale || nationConfig.scales[2];
  const conflictLevel =
    options.conflictLevel ||
    nationConfig.conflictLevels[
      Math.floor(Math.random() * nationConfig.conflictLevels.length)
    ];
  const campaignContext = options.campaignContext?.trim();
  const varianceSeed = Math.floor(Math.random() * 99991) + 10;

  if (options.useAI !== false) {
    try {
      const systemInstruction = `You are an expert RPG campaign writer. You generate immediately usable political entities for tabletop GMs in JSON format. You write in the register of the specified genre — a cyberpunk megacorp-state reads nothing like a fantasy kingdom.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:
{
  "title": "The entity's name — genre-appropriate and invented. Fantasy: compound place-word or ancient-sounding root. Cyberpunk: corp acronym or district name. Sci-Fi: designation or colonial name. Avoid generic placeholders like 'Eldoria', 'The Republic', or 'New Earth'.",
  "summary": "One sentence: the entity's defining character and why a GM should use it.",
  "content": "Markdown. Use exactly these four section headers in order: '### The State', '### Power Structure', '### Society & Tensions', '### How to use it at the table'. Each section: 3-5 tight sentences. Write in the genre's register. Include campaign context if provided.",
  "lore": "Markdown. Use EXACTLY this structure:\\n### At a Glance\\n- **Type**: polity type\\n- **Leader / Authority**: name and one-line description (genre-appropriate)\\n- **Centre of Power**: name and one-line description\\n- **Scale**: territory/population summary\\n- **Conflict Level**: current state\\n- **Hidden Problem**: the tension simmering beneath the surface\\n- **Immediate Hook**: one-sentence GM hook\\n### Power Blocs\\n- **Name**: one-line description (2-3 factions/blocs)\\n### Rumours & Hooks\\n- short hook (2-3 bullet points)\\n### Entity Seeds\\n- list of 4-5 Codex entity types that naturally emerge from this state",
  "labels": ["2-4 lowercase genre-appropriate tags, plus 'rpg-nation', 'nation-generator', 'imported-draft'"]
}

QUALITY RULES:
- Everything — names, concerns, technology, terminology — must fit the genre.
- The leader/authority must have a name, a defining trait, and a secret motive.
- Each power bloc should have an agenda that creates tension.
- Rumours should be specific and actionable.
- Entity seeds should suggest concrete Codex entries a GM would actually create.
- ${NAME_BAN_PROMPT}
${getSessionContext()}`;

      const userMessage = `Generate a political entity. Variation seed: ${varianceSeed}.
- Genre / Setting: ${genre}
- Polity Type: ${polityType}
- Government Style: ${governmentStyle}
- Scale: ${scale}
- Conflict Level: ${conflictLevel}${campaignContext ? `\n- Campaign Context: ${campaignContext}` : ""}`;

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
        type: "faction",
        title: data.title || "The Unnamed State",
        summary: data.summary || "",
        content: data.content || "",
        lore: data.lore || "",
        labels: Array.isArray(data.labels)
          ? data.labels
          : ["rpg-nation", "nation-generator", "imported-draft"],
        status: "active",
      };
    } catch (err) {
      console.warn("AI generation failed, falling back to local tables:", err);
    }
  }

  const trouble =
    nationConfig.troubles[
      Math.floor(Math.random() * nationConfig.troubles.length)
    ];
  const leaderName = generateName();
  const bloc1 = `The ${generateName()} ${pickFrom(["Bloc", "Council", "Front", "Syndicate", "Coalition"])}`;
  const bloc2 = `The ${generateName()} ${pickFrom(["Faction", "Assembly", "Circle", "Committee", "Network"])}`;
  const isFantasyGenre =
    genre === "Fantasy" || genre === "Dark Fantasy" || genre === "Pirate";
  const stateName = isFantasyGenre
    ? buildRealmName(polityType)
    : `${generateName().split(" ")[0]} ${polityType}`;
  const capitalName = isFantasyGenre
    ? buildCapitalName()
    : generateName().split(" ")[0];

  const summary = `A ${conflictLevel.toLowerCase()} ${polityType.toLowerCase()} operating under ${governmentStyle.toLowerCase()}.`;

  const content = `### The State
${stateName} is a ${scale.toLowerCase()} ${polityType.toLowerCase()} under ${governmentStyle.toLowerCase()}. Its centre of power, ${capitalName}, is where decisions are made and deals are struck.${campaignContext ? ` In ${campaignContext}, it is a key player in the main conflict.` : ""}

### Power Structure
${leaderName} holds authority, but that authority is contested. ${trouble}. Those closest to power know the cracks are showing.

### Society & Tensions
The population lives under a state at ${conflictLevel.toLowerCase()}. Loyalty is shifting, old alliances are being renegotiated, and the ruling structure is projecting strength it may not have.

### How to use it at the table
Use ${stateName} as a campaign backdrop, the source of a mission, or the prize in a power struggle. The hidden problem gives any encounter with its institutions the potential to spiral.`;

  const lore = `### At a Glance
- **Type**: ${polityType}
- **Leader / Authority**: ${leaderName} — in control, for now
- **Centre of Power**: ${capitalName}
- **Scale**: ${scale}
- **Conflict Level**: ${conflictLevel}
- **Hidden Problem**: ${trouble}
- **Immediate Hook**: A key official has gone silent — their office is stonewalling

### Power Blocs
- **${bloc1}**: Controls a critical resource or access point; wants formal recognition
- **${bloc2}**: Opposes the current leadership — quietly building leverage

### Rumours & Hooks
- ${leaderName} has been meeting with representatives of a rival power in secret
- A key installation went dark last week; the official explanation doesn't add up
- ${bloc1} is moving money through channels it has no business using

### Entity Seeds
- **Character**: ${leaderName} (leader)
- **Faction**: ${bloc1}
- **Faction**: ${bloc2}
- **Location**: ${capitalName} (centre of power)
- **Event**: The crisis — ${trouble}`;

  return {
    type: "faction",
    title: stateName,
    summary,
    content,
    lore,
    labels: ["rpg-nation", "nation-generator", "imported-draft"],
    status: "active",
  };
}
