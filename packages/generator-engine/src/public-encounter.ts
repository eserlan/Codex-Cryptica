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

const ROLLABLE_ENCOUNTER_TYPES = encounterConfig.encounterTypes.filter(
  (t) => t !== "Random",
);

function resolveEncounter(
  options: EncounterGeneratorOptions,
  rng: Rng,
): ResolvedEncounter {
  const genre = options.genre || "Classic Fantasy";
  const encounterType =
    options.encounterType && options.encounterType !== "Random"
      ? options.encounterType
      : pickFrom(ROLLABLE_ENCOUNTER_TYPES, rng);
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

  const userMessage = `Generate a playable RPG encounter in JSON format. The result should feel like a small playable situation the players can interact with -- not just a list of enemies to fight. Results are not limited to combat: include meaningful alternatives such as negotiation, stealth, trickery, retreat, or investigation where appropriate for the encounter type. Be economical: state each fact (the situation, a motive, a stake) once, in the section it belongs to, and do not restate it elsewhere.
Options:
- Genre: ${resolved.genre}
- Encounter Type: ${resolved.encounterType}
- Environment: ${resolved.environment}
- Threat: ${resolved.threat} (describe fictional danger only -- do not reference any specific RPG ruleset's stats, dice, or mechanics)
- Tone: ${resolved.tone}
${resolved.context ? `- Additional Context: ${resolved.context}` : ""}
${formatCampaignContextBlock(resolved.campaignContext)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative encounter name (3-6 words)",
  "summary": "One vivid standalone sentence naming the encounter type, environment, threat, and tone (e.g. 'A dangerous social encounter unfolds in a market town, carrying a tense atmosphere.') -- do not describe the generator or document structure.",
  "content": "A strictly player-facing description (markdown formatted) under the heading '### What the Players See' -- 2-4 sentences of prose suitable for reading aloud at the table. Include only what the players can directly observe or already know at first glance: sights, sounds, and the immediate situation. Never reveal hidden identities, private motives, underlying causes, game mechanics, or the twist -- those belong only in the GM-only lore below.",
  "glance": {
    "participants": "A short noun phrase (under 8 words) naming who/what is involved -- e.g. 'Two rival vault wardens' -- not a sentence and not the full motive from the Participants section.",
    "immediateSituation": "One short, vivid sentence stating what is happening right now, for a scannable sidebar -- terser than, and not a copy of, the player-facing content.",
    "stakes": "A short phrase (under 12 words) capturing the full dramatic stakes -- what's genuinely at risk AND what could be gained, not just the worst-case hazard -- e.g. 'The ward's trust, the relic, and a chance at an ally' rather than just 'Vault reseals if unresolved'."
  },
  "lore": "GM-only details (markdown formatted). Do not include an '### At a Glance' section -- that is generated separately from the glance fields above and must not be duplicated. Use exactly these sections, in this order, each kept as short as possible without losing the one or two specifics that make this encounter distinct: '### Situation & Stakes' (2-3 sentences: what is actually happening beneath the surface, why, and what happens if nobody intervenes -- do not restate the player-facing description), '### Participants' (a bullet list of the NPCs, creatures, factions, or other actors involved, each a single line naming who they are and what they want), '### Environment' (1 sentence on terrain, hazards, cover, or features that materially affect play, beyond just naming the location), '### Possible Approaches' (a bullet list of 3-5 exploitable opportunities or leverage points drawn specifically from THIS encounter's participants, environment, and complication -- not a generic checklist assembled from stock categories like 'a weak point' or 'a divided loyalty'; vary both the count and the kind of opportunity between encounters; each named as WHAT can be exploited, not a step-by-step method, exact plan, or puzzle solution for exploiting it), '### Complication / Twist' (1 sentence: something that changes or deepens the encounter once the party commits to a course of action), '### Outcomes & Consequences' (a bullet list covering success, failure, avoidance, and escalation, scaled to the selected Threat level -- a Severe/Deadly encounter's failure and escalation should feel as consequential as its type allows, whether that's physical danger, a ruined reputation, a lost opportunity, or a relationship destroyed, not just raised stakes for Combat; the success bullet must be a genuine trade-off or partial win, not a clean resolution -- fold in a concrete, proportionate reward or discovery tied to what the participants were protecting or pursuing, but have the party pay for it in cost, leverage, or something left unresolved, so no separate rewards section is needed).",
  "labels": ["encounter", "encounter-generator", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
Before returning, run a consistency pass: the threat level must match the collective danger actually described among the listed participants, and must also scale the severity of the Outcomes & Consequences for every encounter type -- not just how dangerous Combat is, but how costly a Social, Exploration, Environmental, or Mixed failure/escalation becomes; the complication must genuinely complicate the stated stakes rather than being cosmetic; each possible approach must be a specific, exploitable feature of this encounter, described as an opportunity rather than a solved puzzle, drawn from this encounter's actual details rather than a repeated formula (not generic filler that would fit any encounter); the success outcome must not resolve every objective cleanly -- it needs a real cost or loose end; the outcomes must correspond to the approaches actually described; the player-facing content must contain zero information that is only revealed in the lore; the glance fields must be short and scannable, not prose duplicates of the lore sections; and no fact may be repeated across two sections.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

interface EncounterGlance {
  participants?: string;
  immediateSituation?: string;
  stakes?: string;
}

function buildAtAGlance(
  encounter: ResolvedEncounter,
  glance: EncounterGlance = {},
): string {
  const lines = [
    `- **Type:** ${encounter.encounterType}`,
    `- **Threat:** ${encounter.threat}`,
    `- **Location:** ${encounter.environment}`,
    `- **Tone:** ${encounter.tone}`,
  ];
  if (glance.participants)
    lines.push(`- **Participants:** ${glance.participants}`);
  if (glance.immediateSituation)
    lines.push(`- **Immediate Situation:** ${glance.immediateSituation}`);
  if (glance.stakes) lines.push(`- **Key Stakes:** ${glance.stakes}`);
  return `### At a Glance\n${lines.join("\n")}`;
}

export function parseEncounterResponse(
  text: string,
  resolved: ResolvedEncounter,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  const rawGlance =
    data.glance && typeof data.glance === "object"
      ? (data.glance as Record<string, unknown>)
      : {};
  const glance: EncounterGlance = {
    participants:
      typeof rawGlance.participants === "string"
        ? rawGlance.participants
        : undefined,
    immediateSituation:
      typeof rawGlance.immediateSituation === "string"
        ? rawGlance.immediateSituation
        : undefined,
    stakes: typeof rawGlance.stakes === "string" ? rawGlance.stakes : undefined,
  };
  const lore = data.lore
    ? `${buildAtAGlance(resolved, glance)}\n\n${data.lore}`
    : "";
  return {
    type: "event",
    title: data.title || resolved.encounterName,
    summary: data.summary || encounterSummary(resolved),
    content: data.content || "",
    lore,
    labels: encounterLabels(
      resolved,
      Array.isArray(data.labels)
        ? data.labels
        : ["encounter", "encounter-generator", "imported-draft"],
    ),
    status: "active",
  };
}

// Observable-only phrasing, safe for the strictly player-facing "What the
// Players See" content -- no hidden motives, causes, or twists.
const PARTICIPANT_VISUALS: Record<string, string[]> = {
  Combat: [
    "a coordinated band of armed figures with one clearly in charge",
    "a lone, dangerous creature flanked by smaller pack members",
    "an armed patrol moving with practiced discipline",
  ],
  Social: [
    "a small group of locals, visibly tense with one another",
    "a single well-dressed figure flanked by wary attendants",
    "two groups of representatives eyeing each other warily",
  ],
  Exploration: [
    "fresh signs that someone passed through here recently",
    "a lone figure who seems to know the area well",
    "territorial creatures watching from a distance",
  ],
  Environmental: [
    "no one in sight -- just the hazard itself",
    "a handful of locals already struggling against the hazard",
    "displaced creatures behaving strangely aggressive",
  ],
  Mixed: [
    "a visibly hostile group, tense but not yet violent",
    "a patrol that seems unaware of something else nearby",
    "a group that starts hostile but hesitates when challenged",
  ],
  Random: [
    "a small band whose intentions aren't yet clear",
    "a single notable figure with several followers",
    "a group whose behavior doesn't fully add up",
  ],
};

// GM-only framing, used in the lore's Participants section.
const PARTICIPANT_MOTIVES: Record<string, string[]> = {
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

const PARTICIPANT_GOALS: Record<string, string> = {
  Combat: "hold this ground or eliminate the threat blocking their objective",
  Social: "come out ahead in whatever is being negotiated here",
  Exploration: "control the flow of information about what lies ahead",
  Environmental: "survive or exploit what the hazard has already caused",
  Mixed: "further a goal the surface conflict is only masking",
  Random: "get what they came for before anyone stops them",
};

const STAKES_BY_TYPE: Record<string, string> = {
  Combat: "Lives, ground, and the party's next move are all in play",
  Social: "Trust, leverage, and everyone's standing are on the line",
  Exploration:
    "The safer path, vital information, and time itself are at stake",
  Environmental: "Survival, nearby lives, and the way forward all hang on this",
  Mixed: "Competing agendas collide, and no side gets everything it wants",
  Random: "More is riding on this than first appears",
};

const APPROACHES_BY_TYPE: Record<string, string[]> = {
  Combat: [
    "the terrain, which offers cover or a chokepoint to whoever claims it first",
    "an opening for a truce or fighting withdrawal before violence escalates further",
    "a weaker or isolated target among the group, if the party can identify one",
    "a stash of supplies or weapons within reach, if the party can get to it first",
    "a signal or ally who could be summoned, if someone can reach them in time",
  ],
  Social: [
    "something each side actually wants, which could be traded for cooperation",
    "a discrepancy in what's being said, worth investigating quietly before committing",
    "the option to simply walk away and let the situation resolve on its own",
    "an old debt or favor someone here still owes",
    "a piece of information one side doesn't know the other already has",
  ],
  Exploration: [
    "a safer vantage point to observe from before engaging directly",
    "signs pointing to a way around the danger rather than through it",
    "the option to retreat and return once the stakes are clearer",
    "an object or marking that hints at what lies further ahead",
    "a shortcut only visible from an unusual vantage point",
  ],
  Environmental: [
    "a route around the hazard that costs time rather than risk",
    "trapped or struggling locals whose rescue could pay off later",
    "a way to brave the hazard directly, at real risk, to reach what lies beyond",
    "a support or mechanism already failing, which could be hastened or shored up",
    "a source of light, warmth, or air the party could control or deny",
  ],
  Mixed: [
    "the most visible threat, which may not be the real problem",
    "a goal beneath the surface conflict that neither side has stated outright",
    "the friction between the separate threats, which could be turned to the party's advantage",
    "a resource both sides need, which the party could claim first",
    "a moment of confusion the party could use before either side reacts",
  ],
  Random: [
    "a direct confrontation, if the party is willing to accept the risk",
    "unresolved questions worth investigating before acting",
    "the option to withdraw and address this on the party's own terms",
    "a resource or ally that could tip things, if reached in time",
    "a detail that doesn't add up yet, worth a closer look",
  ],
};

// Consequence severity, scaled by the selected threat -- applies to every
// encounter type, not just Combat, so a Severe/Deadly Social encounter reads
// as consequential as a Severe/Deadly fight.
const THREAT_SEVERITY: Record<string, { failure: string; escalation: string }> =
  {
    "Trivial / Low": {
      failure: "a small, easily-recovered setback",
      escalation: "a minor complication nobody will remember for long",
    },
    Moderate: {
      failure: "a real setback that costs time or standing to fix",
      escalation: "a complication serious enough to change the party's plans",
    },
    Dangerous: {
      failure: "a costly setback with consequences that outlast the encounter",
      escalation:
        "a complication that puts something the party values at real risk",
    },
    "Severe / Deadly": {
      failure: "a devastating, possibly permanent loss",
      escalation:
        "a complication that threatens to spiral out of anyone's control",
    },
  };

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function encounterSummary(encounter: ResolvedEncounter): string {
  return `${article(encounter.threat)} ${encounter.threat.toLowerCase()} ${encounter.encounterType.toLowerCase()} encounter unfolds in ${article(encounter.environment)} ${encounter.environment.toLowerCase()}, carrying a ${encounter.tone.toLowerCase()} atmosphere.`.replace(
    /^./,
    (c) => c.toUpperCase(),
  );
}

// Picks `count` distinct items in randomized order, so repeated local
// generations of the same encounter type don't always show the same
// approaches in the same order.
function pickMany<T>(items: T[], count: number, rng: Rng): T[] {
  const pool = [...items];
  const result: T[] = [];
  while (result.length < count && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

function encounterLabels(
  encounter: ResolvedEncounter,
  base: string[] = ["encounter", "encounter-generator", "imported-draft"],
): string[] {
  const labels = [...base];
  const derived = [slugify(encounter.encounterType), slugify(encounter.genre)];
  for (const label of derived) if (!labels.includes(label)) labels.push(label);
  return labels;
}

function renderResolvedEncounter(
  encounter: ResolvedEncounter,
  rng: Rng,
): PublicGeneratorOutput {
  const typeKey = PARTICIPANT_MOTIVES[encounter.encounterType]
    ? encounter.encounterType
    : "Random";
  const visualParticipants = pickFrom(PARTICIPANT_VISUALS[typeKey], rng);
  const motiveParticipants = pickFrom(PARTICIPANT_MOTIVES[typeKey], rng);
  const situation = encounterSummary(encounter);
  // Vary the count (3-4 of the available 5) and order so identical inputs
  // don't always render the same fixed approach list.
  const approaches = pickMany(
    APPROACHES_BY_TYPE[typeKey],
    3 + Math.floor(rng() * 2),
    rng,
  );
  const severity =
    THREAT_SEVERITY[encounter.threat] ?? THREAT_SEVERITY.Moderate;

  const content = `### What the Players See
${situation} ${
    typeKey === "Environmental"
      ? "The danger here is the place itself, not any single opponent."
      : `Those present are ${visualParticipants}.`
  }`;

  const lore = `${buildAtAGlance(encounter, {
    participants:
      visualParticipants.charAt(0).toUpperCase() + visualParticipants.slice(1),
    immediateSituation: situation,
    stakes: STAKES_BY_TYPE[typeKey],
  })}

### Situation & Stakes
${situation} Left unaddressed, it will escalate in a way that costs someone here something they cannot easily recover.${encounter.campaignContext ? ` This ties into ${encounter.campaignContext}.` : ""}

### Participants
- ${motiveParticipants.charAt(0).toUpperCase() + motiveParticipants.slice(1)}, trying to ${PARTICIPANT_GOALS[typeKey]}.

### Environment
The ${encounter.environment.toLowerCase()} shapes what is possible here -- offering cover, obstacles, or hazards that a careful party can turn to its advantage, and that a careless one will suffer for ignoring.

### Possible Approaches
${approaches.map((a) => `- ${a}`).join("\n")}

### Complication / Twist
Something about this situation is not what it first appears -- the true cause, a hidden participant, or an overlooked consequence surfaces once the party commits to a course of action.

### Outcomes & Consequences
- **Success**: The immediate threat is contained, not erased -- the party gains a proportionate reward, information, an item, standing, or a favor tied to what the participants were protecting or pursuing, but pays for it in cost, leverage, or a relationship left strained.
- **Failure**: The situation escalates into ${severity.failure}, and whatever the participants wanted proceeds unopposed.
- **Avoidance**: The encounter resolves without the party, for better or worse, off-screen.
- **Escalation**: A poorly chosen approach or delay invites ${severity.escalation}, tied to the encounter's underlying cause.`;

  return {
    type: "event",
    title: encounter.encounterName,
    summary: situation,
    content,
    lore,
    labels: encounterLabels(encounter),
    status: "active",
  };
}

export function generateEncounterLocal(
  options: EncounterGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  return renderResolvedEncounter(resolveEncounter(options, rng), rng);
}
