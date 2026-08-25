/**
 * Public Encounter generator — framework-free, theme-aware.
 *
 * Generates a playable situation the players can interact with (combat,
 * social, exploration, environmental, or mixed) rather than a bare monster
 * list: participants, environment, goals/stakes, non-combat approaches, a
 * complication, and outcomes/rewards. Threat/difficulty is described in
 * fictional terms, not tied to any specific RPG ruleset.
 *
 * Mirrors public-quest.ts's shape: no AI client, no sessionStorage. The web
 * page builds the prompt here, runs it through aiClientManager, parses with
 * parseEncounterResponse, and falls back to generateEncounterLocal.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { formatCampaignContextBlock } from "./campaign-context";

export const encounterConfig = {
  encounterTypes: [
    "Random",
    "Combat",
    "Social",
    "Exploration",
    "Environmental",
    "Mixed",
  ],
  threats: ["Trivial / Low", "Moderate", "Dangerous", "Severe / Deadly"],
  tones: ["Tense", "Mysterious", "Hostile", "Strange", "Humorous", "Desperate"],
  environments: [
    "Dungeon / Ruin",
    "Wilderness",
    "Settlement / Urban",
    "Road / Travel",
    "Underground / Cavern",
    "Aboard a Ship or Vehicle",
  ],
  environmentsByTheme: {
    "Classic Fantasy": [
      "Ancient Dungeon",
      "Forest Wilderness",
      "Market Town",
      "Mountain Pass",
      "Cursed Ruin",
      "River Crossing",
    ],
    Pirate: [
      "Dockside Port",
      "Open Sea",
      "Hidden Cove",
      "Derelict Ship",
      "Island Ruin",
      "Storm-Wracked Reef",
    ],
    "Cyberpunk / Corporate": [
      "Corporate Tower",
      "Underground Market",
      "Neon District Street",
      "Abandoned Factory",
      "Data Center",
      "Off-Grid Settlement",
    ],
    "Vampire / Gothic Noir": [
      "Gothic Cathedral",
      "Fog-Shrouded Street",
      "Haunted Manor",
      "Ancient Crypt",
      "Secret Society Hall",
      "Moonlit Graveyard",
    ],
    "Cosmic Horror": [
      "Remote Observatory",
      "Flooded Archive",
      "Isolated Coastal Town",
      "Abandoned Expedition Camp",
      "University Collection",
      "Impossible Ruin",
    ],
    "Sci-Fi / Space Opera": [
      "Space Station Corridor",
      "Alien Planet Surface",
      "Derelict Ship",
      "Asteroid Mining Outpost",
      "Jump Gate Hub",
      "Colony World Settlement",
    ],
    "Modern Conspiracy": [
      "Urban Street",
      "Abandoned Warehouse",
      "Government Facility",
      "Safe House",
      "International Airport",
      "Underground Parking Structure",
    ],
    "Post-Apocalyptic": [
      "Ruined City Block",
      "Wasteland Outpost",
      "Vault / Bunker",
      "Irradiated Zone",
      "Raider Stronghold",
      "Overgrown Highway",
    ],
    "Western / Frontier": [
      "Dusty Boomtown",
      "Abandoned Gold Mine",
      "Remote Homestead",
      "Canyon Pass",
      "Frontier Fort",
      "Railroad Station",
    ],
    Steampunk: [
      "Airship Dock",
      "Factory Floor",
      "Aetheric Laboratory",
      "Guild Vault",
      "Smog-Shrouded Tenement",
      "Clockwork Sewer",
    ],
    Lancer: [
      "Mech Hangar",
      "Bleed Zone Perimeter",
      "Colonial Outpost",
      "Union Administrative Hub",
      "Debris Field Salvage Site",
      "NHP Containment Facility",
    ],
    "Space Opera Resistance": [
      "Smuggler Cantina",
      "Imperial Detention Block",
      "Hidden Rebel Base",
      "Desert Moisture Farm",
      "Orbital Battle Station",
      "Ancient Mystic Temple",
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
};

export interface EncounterGeneratorOptions {
  genre?: string;
  encounterType?: string;
  environment?: string;
  threat?: string;
  tone?: string;
  context?: string;
  campaignContext?: string;
}

export interface ResolvedEncounter {
  genre: string;
  encounterType: string;
  environment: string;
  threat: string;
  tone: string;
  context?: string;
  campaignContext?: string;
  encounterName: string;
}

function resolveEncounter(
  options: EncounterGeneratorOptions,
  rng: Rng,
): ResolvedEncounter {
  const genre = options.genre || "Classic Fantasy";
  const encounterType =
    options.encounterType || pickFrom(encounterConfig.encounterTypes, rng);
  const environmentPool =
    encounterConfig.environmentsByTheme[genre] ?? encounterConfig.environments;

  return {
    genre,
    encounterType,
    environment: options.environment || pickFrom(environmentPool, rng),
    threat: options.threat || pickFrom(encounterConfig.threats, rng),
    tone: options.tone || pickFrom(encounterConfig.tones, rng),
    context: options.context?.trim() || undefined,
    campaignContext: options.campaignContext?.trim() || undefined,
    encounterName: `The ${generateName(rng)} ${pickFrom(
      ["Ambush", "Standoff", "Reckoning", "Crossing", "Incident", "Encounter"],
      rng,
    )}`,
  };
}

export interface EncounterPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedEncounter;
}

export function buildEncounterPrompt(
  options: EncounterGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): EncounterPrompt {
  const resolved = resolveEncounter(options, rng);

  const userMessage = `Generate a playable RPG encounter in JSON format. The result should feel like a small playable situation the players can interact with -- not just a list of enemies to fight. Results are not limited to combat: include meaningful alternatives such as negotiation, stealth, trickery, retreat, or investigation where appropriate for the encounter type.
Options:
- Genre: ${resolved.genre}
- Encounter Type: ${resolved.encounterType}${resolved.encounterType === "Random" ? " (pick whichever of Combat/Social/Exploration/Environmental/Mixed best fits the other options)" : ""}
- Environment: ${resolved.environment}
- Threat: ${resolved.threat} (describe fictional danger only -- do not reference any specific RPG ruleset's stats, dice, or mechanics)
- Tone: ${resolved.tone}
${resolved.context ? `- Additional Context: ${resolved.context}` : ""}
${formatCampaignContextBlock(resolved.campaignContext)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative encounter name (3-6 words)",
  "content": "A player-facing description (markdown formatted) under the heading '### What the Players See' -- concise prose suitable for reading or paraphrasing at the table describing the immediate situation as the players would perceive it.",
  "lore": "GM-only details (markdown formatted) with these sections in this order: '### At a Glance' (a bullet list with '**Encounter Type**', '**Location**', '**Threat**', '**Participants**' (one line summarizing who/what is involved), and '**Immediate Situation**', each a single vivid sentence), '### What Is Happening' (the underlying situation, motives, and context the players don't yet see), '### Goals & Stakes' (what each side wants and what happens if nobody intervenes), '### Participants' (a bullet list of the NPCs, creatures, factions, or other actors involved, each with a motivation and behavior), '### Environment' (terrain, hazards, cover, obstacles, or unusual features that can materially affect play), '### Possible Approaches' (a bullet list of at least three distinct viable approaches -- e.g. negotiation, stealth, trickery, retreat, investigation, intervention, or combat -- illustrating affordances rather than prescribing a solution), '### Complication / Twist' (something that changes or deepens the encounter), '### Outcomes & Consequences' (a bullet list covering likely developments from success, failure, avoidance, and escalation), '### Rewards / Discoveries' (loot, clues, information, relationships, or follow-up hooks).",
  "labels": ["encounter", "encounter-generator", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
Before returning, run a consistency pass: the threat level must match the collective danger actually described among the listed participants; the complication must genuinely complicate the stated goals/stakes rather than being cosmetic; each possible approach must be a viable, specific response to the actual participants and complication (not generic filler that would fit any encounter); the outcomes must correspond to the approaches actually described (success, failure, avoidance, and escalation); and the rewards must fit the objective and participants.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

export function parseEncounterResponse(
  text: string,
  resolved: ResolvedEncounter,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "event",
    title: data.title || resolved.encounterName,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["encounter", "encounter-generator", "imported-draft"],
    status: "active",
  };
}

const PARTICIPANTS_BY_TYPE: Record<string, string[]> = {
  Combat: [
    "a coordinated band of hostile creatures led by a clearly more capable leader",
    "a lone, dangerous predator supported by smaller pack members",
    "an armed patrol acting under orders it is not free to disobey",
  ],
  Social: [
    "a small group of locals with conflicting agendas, none of them fully honest",
    "a single influential figure flanked by wary attendants",
    "two factions' representatives, each hoping the party will tip the balance",
  ],
  Exploration: [
    "signs of a group that passed through recently, not yet encountered directly",
    "a lone survivor or guide who knows more than they are saying",
    "territorial creatures that react to intrusion rather than hunting proactively",
  ],
  Environmental: [
    "no living participants -- the environment itself is the antagonist",
    "a handful of frightened locals already caught by the hazard",
    "creatures displaced and made aggressive by the same hazard threatening the party",
  ],
  Mixed: [
    "a hostile group whose actual goal is not combat, if the party can find it",
    "a faction patrol and a separate, unaligned threat neither side has noticed yet",
    "participants who begin hostile but have a legitimate grievance underneath",
  ],
  Random: [
    "a small band whose composition suits the environment and threat level",
    "a single notable figure supported by lesser followers",
    "a group whose true intentions are not obvious at first glance",
  ],
};

function renderResolvedEncounter(
  encounter: ResolvedEncounter,
  rng: Rng,
): PublicGeneratorOutput {
  const typeKey = PARTICIPANTS_BY_TYPE[encounter.encounterType]
    ? encounter.encounterType
    : "Random";
  const participants = pickFrom(PARTICIPANTS_BY_TYPE[typeKey], rng);
  const situation = `A ${encounter.threat.toLowerCase()} ${encounter.encounterType.toLowerCase()} encounter unfolds in a ${encounter.environment.toLowerCase()}, carrying a ${encounter.tone.toLowerCase()} atmosphere.`;

  const approachesByType: Record<string, string[]> = {
    Combat: [
      "Fight directly, accepting the risk the threat level implies.",
      "Negotiate a withdrawal or truce before violence becomes unavoidable.",
      "Use the environment to gain an advantage or avoid a fair fight entirely.",
    ],
    Social: [
      "Negotiate openly, offering something each side actually wants.",
      "Investigate quietly first to learn who is lying before committing to a side.",
      "Walk away and let the situation resolve without the party's involvement.",
    ],
    Exploration: [
      "Press forward and investigate directly, accepting the risk of discovery.",
      "Observe from a distance before deciding whether to engage at all.",
      "Retreat and return better prepared once the stakes are clearer.",
    ],
    Environmental: [
      "Brave the hazard directly to reach what lies beyond it.",
      "Find or improvise a way around it that costs time instead of danger.",
      "Help those already caught by it, at the cost of the party's own safety margin.",
    ],
    Mixed: [
      "Engage the most visible threat head-on.",
      "Look for the actual goal beneath the surface conflict and address that instead.",
      "Play the separate threats against each other rather than facing either alone.",
    ],
    Random: [
      "Confront the situation directly.",
      "Investigate before committing to any action.",
      "Withdraw and address it on the party's own terms later.",
    ],
  };
  const approaches = approachesByType[typeKey];

  const content = `### What the Players See
${situation} ${
    typeKey === "Environmental"
      ? "The danger here is the place itself, not any single opponent."
      : `Those present are ${participants}.`
  }`;

  const lore = `### At a Glance
- **Encounter Type**: ${encounter.encounterType}
- **Location**: ${encounter.environment}
- **Threat**: ${encounter.threat}
- **Participants**: ${participants.charAt(0).toUpperCase() + participants.slice(1)}
- **Immediate Situation**: ${situation}

### What Is Happening
${situation} Beneath the surface, ${participants} act from a motive the players have not yet been given a reason to trust or distrust.${encounter.campaignContext ? ` This ties into ${encounter.campaignContext} -- the participants' motives and stakes should reflect existing tensions or unresolved threads.` : ""}

### Goals & Stakes
Whoever or whatever is present here wants the situation to resolve on their own terms; left uninterrupted, it will escalate in a direction that costs someone in the scene something they cannot easily recover.

### Participants
- ${participants.charAt(0).toUpperCase() + participants.slice(1)}, acting on a motive tied to the ${encounter.environment.toLowerCase()} and the encounter's underlying cause.

### Environment
The ${encounter.environment.toLowerCase()} shapes what is possible here -- offering cover, obstacles, or hazards that a careful party can turn to its advantage, and that a careless one will suffer for ignoring.

### Possible Approaches
${approaches.map((a) => `- ${a}`).join("\n")}

### Complication / Twist
Something about this situation is not what it first appears -- the true cause, a hidden participant, or a consequence the party has not yet considered will surface once they commit to a course of action.

### Outcomes & Consequences
- **Success**: The immediate danger is resolved and the party gains standing or information they can use later.
- **Failure**: The situation escalates, and whatever the participants wanted proceeds unopposed.
- **Avoidance**: The encounter resolves without the party, for better or worse, and its consequences unfold off-screen.
- **Escalation**: Delay or a poorly chosen approach draws in further complications tied to the encounter's underlying cause.

### Rewards / Discoveries
A tangible gain -- information, an item, a favor, or a relationship -- proportionate to the threat level and directly tied to what the participants were protecting, pursuing, or hiding.`;

  return {
    type: "event",
    title: encounter.encounterName,
    summary: "",
    content,
    lore,
    labels: ["encounter", "encounter-generator", "imported-draft"],
    status: "active",
  };
}

export function generateEncounterLocal(
  options: EncounterGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  return renderResolvedEncounter(resolveEncounter(options, rng), rng);
}
