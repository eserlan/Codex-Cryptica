/**
 * Public Ship generator — framework-free, genre-aware.
 *
 * Ships in Codex Cryptica are treated as traversable locations: part vehicle,
 * part faction asset, part adventure seed. The generator outputs a ship that
 * answers four questions:
 *   1. What is this ship? (role, scale, condition)
 *   2. Who runs it and why? (owner, mission, crew)
 *   3. What is wrong with it? (complication, secret)
 *   4. How does it become an adventure? (hooks)
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems as getRandomItems,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { shipConfig } from "./public-ship-constants";
export { shipConfig };


function forGenre<T>(record: Record<string, T[]>, genre: string): T[] {
  return record[genre] ?? record["Sci-Fi"] ?? Object.values(record)[0];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShipGeneratorOptions {
  genre?: string;
  role?: string;
  scale?: string;
  condition?: string;
  tone?: string;
  campaignContext?: string;
}

interface ResolvedShip {
  genre: string;
  role: string;
  scale: string;
  condition: string;
  conditionShort: string;
  tone: string;
  toneShort: string;
  affiliation: string;
  crewType: string;
  captain: string;
  captainDetail: string;
  officerNames: string[];
  officerDetails: string[];
  crewProfile: string;
  complication: string;
  secret: string;
  zones: string[];
  name: string;
}

export interface ShipPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedShip;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function shortLabel(value: string): string {
  return value.split("—")[0].split("(")[0].trim();
}

function resolveShip(options: ShipGeneratorOptions, rng: Rng): ResolvedShip {
  const genre = options.genre || "Sci-Fi";
  const role =
    options.role || pickFrom(forGenre(shipConfig.rolesByGenre, genre), rng);
  const scale =
    options.scale || pickFrom(forGenre(shipConfig.scalesByGenre, genre), rng);
  const condition = options.condition || pickFrom(shipConfig.conditions, rng);
  const tone = options.tone || pickFrom(shipConfig.tones, rng);
  const affiliation = pickFrom(
    forGenre(shipConfig.affiliationsByGenre, genre),
    rng,
  );
  const crewType = pickFrom(forGenre(shipConfig.crewTypesByGenre, genre), rng);
  const captain = pickFrom(
    forGenre(shipConfig.captainNamesByGenre, genre),
    rng,
  );
  const captainDetail = pickFrom(
    forGenre(shipConfig.captainDetailsByGenre, genre),
    rng,
  );
  const officerNamePool = forGenre(
    shipConfig.officerNamesByGenre,
    genre,
  );
  const officerDetailPool = forGenre(
    shipConfig.officerDetailsByGenre,
    genre,
  );
  const selectedOfficers = getRandomItems(
    officerNamePool.map((name, index) => ({
      name,
      detail: officerDetailPool[index] ?? officerDetailPool[0],
    })),
    3,
    rng,
  );
  const officerNames = selectedOfficers.map((officer) => officer.name);
  const officerDetails = selectedOfficers.map((officer) => officer.detail);
  const crewProfile = pickFrom(
    forGenre(shipConfig.crewProfilesByGenre, genre),
    rng,
  );
  const complication = pickFrom(
    forGenre(shipConfig.complicationsByGenre, genre),
    rng,
  );
  const secret = pickFrom(forGenre(shipConfig.secretsByGenre, genre), rng);
  const zoneSource =
    shipConfig.zonesByRole[role] ?? shipConfig.zonesByRole["default"];
  const zones = getRandomItems(zoneSource, Math.min(3, zoneSource.length), rng);

  const prefixes = forGenre(shipConfig.namePrefixesByGenre, genre);
  const words = forGenre(shipConfig.nameWordsByGenre, genre);
  const prefix = pickFrom(prefixes, rng);
  const word = pickFrom(words, rng);
  const name = prefix ? `${prefix} ${word}` : word;

  return {
    genre,
    role,
    scale: shortLabel(scale),
    condition: shortLabel(condition),
    conditionShort: shortLabel(condition),
    tone: shortLabel(tone),
    toneShort: shortLabel(tone),
    affiliation,
    crewType,
    captain,
    captainDetail,
    officerNames,
    officerDetails,
    crewProfile,
    complication,
    secret,
    zones,
    name,
  };
}

// ---------------------------------------------------------------------------
// AI Prompt
// ---------------------------------------------------------------------------

const FIRST_IMPRESSION_BY_GENRE: Record<string, string> = {
  "Sci-Fi":
    "The approach is all geometry — hard angles, running lights on slow rotation, hull plating scarred by re-entry or something worse. The docking bay smells of recycled air and machine oil.",
  "Space Opera":
    "It hangs in the void with the quiet confidence of something that has survived more than it should. Docking approach is tense — the crew is watching.",
  Cyberpunk:
    "The ship is dark except where it is not supposed to be. Identification codes cycle through spoofed registries. The hull carries repainted corporate logos, layered over each other like bad decisions.",
  "Post-Apocalyptic":
    "Rust and improvisation hold it together. The welds are visible from a hundred metres. Someone loved this vessel once; that someone is probably dead.",
  "Optimistic Exploration Sci-Fi":
    "Clean lines and mission-standard markings. The kind of ship that makes protocols feel like a comfort. The crew meets you at the airlock in proper uniform.",
  "Space Opera Resistance":
    "It looks like nothing — that is the point. Civilian registry, battered hull, nothing worth shooting at. The rebel colours are hidden under a maintenance panel.",
  Lancer:
    "The mech bay is the first thing you notice from the outside — a carrier-class silhouette that means pilots, and pilots mean trouble for someone.",
  Fantasy:
    "Salt-bleached timber, rope-worn rails, and a crew that watches newcomers board with the particular stillness of people who have seen what the sea does to trust.",
  "Pirate / Age of Sail":
    "Patched sails, gun ports that have been opened recently, and a crew that moves with the easy competence of people who have done this before — the question is what exactly.",
  Steampunk:
    "The engine never stops. Pistons, steam vents, the vibration of the deck underfoot — even docked, the ship feels alive in a way that reminds you it could leave at any moment.",
  "Dark Fantasy":
    "The smell reaches you before the ship does. Brine and something else — something that the gulls avoid. The crew does not look up when you board.",
  "Western (River & Rail)":
    "Paddle wheel churning brown water, the smell of coal smoke and river mud, and a passenger manifest that raises more questions than it answers.",
};

export function buildShipPrompt(
  options: ShipGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): ShipPrompt {
  const resolved = resolveShip(options, rng);
  const {
    name,
    genre,
    role,
    scale,
    condition,
    tone,
    affiliation,
    crewType,
    captain,
    captainDetail,
    officerNames,
    officerDetails,
    crewProfile,
    complication,
    secret,
    zones,
  } = resolved;

  const commandPromptDetails = `\n- Captain / Commander: ${captain}\n- Captain Brief: ${captainDetail}\n- Named Officers: ${officerNames.join(", ")}\n- Officer Briefs: ${officerDetails.join(" | ")}\n- Crew Culture: ${crewProfile}`;

  const officerRosterPrompt = officerNames
    .map((name, index) => `- **${name}** — ${officerDetails[index]}`)
    .join("\\n");
  const commandLoreSection = `\\n\\n### Captain, Officers & Crew\\n- **Captain / Commander**: ${captain}\\n- **Captain Brief**: ${captainDetail}\\n\\n#### Officer Roster\\n${officerRosterPrompt}\\n\\n- **Crew Culture**: ${crewProfile}\\n- **Shipboard Tension**: [what could split this crew apart]`;

  const userMessage = `Generate a campaign-ready ship for a tabletop RPG session. The ship should answer these four questions through its output:
1. What is this ship? (role, scale, condition, visual identity)
2. Who runs it and why? (captain/commander, vivid officer roster, crew culture, owner, affiliation, current mission)
3. What is wrong with it? (complication and secret)
4. How does it become an adventure? (hooks the players can pull on)

Parameters:
- Name: ${name}
- Genre / Setting: ${genre}
- Role: ${role}
- Scale: ${scale}
- Condition: ${condition}
- Tone: ${tone}
- Owner / Affiliation: ${affiliation}
- Crew Type: ${crewType}
- Dominant Complication: ${complication}
- Secret: ${secret}
- Key Zones: ${zones.join(", ")}${commandPromptDetails}

Return a valid JSON object matching this structure exactly:
{
  "title": "A single string for the ship name",
  "content": "Prose description (markdown). Include these sections:\\n## Core Concept\\n[What makes this ship distinct — 2–3 sentences on its role, character, and current state]\\n\\n## First Look\\n[What visitors notice when approaching or boarding — sensory, atmospheric, genre-appropriate]\\n\\n## History\\n[How the ship came to be in its current state — 2–3 sentences]",
  "lore": "Structured GM reference (markdown). Use EXACTLY this structure:\\n### Ship Profile\\n- **Class**: [role and scale]\\n- **Condition**: [condition]\\n- **Owner / Affiliation**: [affiliation]\\n- **Current Mission**: [what the ship is doing right now — one concrete sentence]\\n- **Crew Complement**: [size and type]\\n- **Tone**: [tone]${commandLoreSection}\\n\\n### Key Zones\\n- **🚀 ${zones[0]}**: [one-line purpose or detail]\\n- **🚀 ${zones[1] ?? zones[0]}**: [one-line purpose or detail]\\n- **🚀 ${zones[2] ?? zones[0]}**: [one-line purpose or detail]\\n\\n### Complication\\n[2–3 sentences on the dominant problem — name real people, systems, or factions involved]\\n\\n### Secret\\n[What the ship hides — 1–2 sentences that a player could discover through investigation]\\n\\n### Adventure Hooks\\n- [Hook tied to the complication]\\n- [Hook tied to the secret]\\n- [Hook tied to the ship's role or affiliation]",
  "labels": ["rpg-ship", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
${options.campaignContext?.trim() ? `Campaign context from the user: ${options.campaignContext.trim()}` : ""}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed, genre-aware RPG campaign elements in JSON format. Ships are traversable locations and adventure seeds — every ship must have a clear role, a problem the crew is managing, and at least one secret discoverable through play. Match the genre, tone, and setting precisely.",
    userMessage,
    resolved,
  };
}

// ---------------------------------------------------------------------------
// Response Parser
// ---------------------------------------------------------------------------

export function parseShipResponse(
  text: string,
  resolved: ResolvedShip,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "location",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-ship", "imported-draft"],
    status: "active",
  };
}

// ---------------------------------------------------------------------------
// Local Generator
// ---------------------------------------------------------------------------

const CORE_CONCEPT_VARIANTS = [
  (
    name: string,
    role: string,
    scale: string,
    condition: string,
    tone: string,
    complication: string,
  ) =>
    `${name} is a ${scale.toLowerCase()} ${role.toLowerCase()} in ${condition.toLowerCase()} condition. ${tone} in character, it serves its purpose and asks few questions. Beneath the operational surface, ${complication.toLowerCase()}.`,
  (
    name: string,
    role: string,
    scale: string,
    condition: string,
    tone: string,
    complication: string,
  ) =>
    `The ${name} operates as a ${role.toLowerCase()} — ${scale.toLowerCase()}, ${condition.toLowerCase()}, and ${tone.toLowerCase()} in a way that has become its reputation. The problem no one is talking about openly is that ${complication.toLowerCase()}.`,
  (
    name: string,
    role: string,
    scale: string,
    condition: string,
    tone: string,
    complication: string,
  ) =>
    `A ${condition.toLowerCase()} ${role.toLowerCase()} of ${scale.toLowerCase()} class, ${name} carries the ${tone.toLowerCase()} atmosphere of a vessel that has been through more than its logbook admits. Right now, ${complication.toLowerCase()}.`,
  (
    name: string,
    role: string,
    scale: string,
    condition: string,
    tone: string,
    complication: string,
  ) =>
    `${name} is exactly what it looks like — a ${scale.toLowerCase()} ${role.toLowerCase()} — and nothing it appears to be. The ${condition.toLowerCase()} hull and ${tone.toLowerCase()} crew tell one story. The real one starts with the fact that ${complication.toLowerCase()}.`,
] as const;

const HISTORY_VARIANTS = [
  (name: string, role: string, affiliation: string, condition: string) =>
    `${name} has served as a ${role.toLowerCase()} for long enough that its original documentation no longer tells the whole story. ${affiliation} holds the current registration, though how that arrangement came about is a matter of some discretion. The ${condition.toLowerCase()} state of the hull is honest in a way the manifest is not.`,
  (_name: string, role: string, affiliation: string, condition: string) =>
    `The vessel was built for ${role.toLowerCase()} operations and has never drifted far from that purpose, even as its owners changed. ${affiliation} runs it now. The ${condition.toLowerCase()} condition reflects decisions made under pressure — some of them good.`,
  (name: string, role: string, affiliation: string, condition: string) =>
    `${name} predates its current affiliation with ${affiliation} by enough years that the ship has its own institutional memory. It has served as a ${role.toLowerCase()} across at least two prior owners and carries the evidence. The ${condition.toLowerCase()} state is honest about that history.`,
  (name: string, role: string, affiliation: string, condition: string) =>
    `Records for ${name} are clean for a vessel this old, which means someone cleaned them. It operates as a ${role.toLowerCase()} for ${affiliation} now, and the ${condition.toLowerCase()} hull tells a story the logbook carefully does not.`,
] as const;

export function generateShipLocal(
  options: ShipGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveShip(options, rng);
  const {
    genre,
    role,
    scale,
    condition,
    tone,
    affiliation,
    crewType,
    captain,
    captainDetail,
    officerNames,
    officerDetails,
    crewProfile,
    complication,
    secret,
    zones,
    name,
  } = resolved;

  const firstImpression =
    FIRST_IMPRESSION_BY_GENRE[genre] ?? FIRST_IMPRESSION_BY_GENRE["Sci-Fi"];

  const conceptIdx = Math.floor(rng() * CORE_CONCEPT_VARIANTS.length);
  const historyIdx = Math.floor(rng() * HISTORY_VARIANTS.length);
  const officerRoster = officerNames
    .map((officer, index) => `- **${officer}** — ${officerDetails[index]}`)
    .join("\n");
  const commandSection = `\n\n## Captain, Officers & Crew\n**${captain}** commands a ${crewType.toLowerCase()}. ${captainDetail}

### Officer Roster
${officerRoster}

The crew's culture is defined by ${crewProfile}. Their loyalty is practical rather than ornamental: it survives as long as the chain of command, shared purpose, and next horizon remain worth defending.`;

  const content = `## Core Concept
${CORE_CONCEPT_VARIANTS[conceptIdx](name, role, scale, condition, tone, complication)}

## First Look
${firstImpression}

## History
${HISTORY_VARIANTS[historyIdx](name, role, affiliation, condition)}${commandSection}`;

  const zoneLines = zones
    .map(
      (z) => `- **🚀 ${z}**: A key area tied to the ship's primary function.`,
    )
    .join("\n");

  const hook1 = `The party learns about ${complication.toLowerCase().slice(0, 60)}… — and they are the only ones who can act.`;
  const hook2 = `Someone on the docks knows ${secret.toLowerCase().slice(0, 50)}… — and is willing to sell that information.`;
  const hook3 = `${affiliation} needs the party to deliver something to — or retrieve something from — ${name}. They are not told everything.`;

  const lore = `### Ship Profile
- **Class**: ${role} / ${scale}
- **Condition**: ${condition}
- **Owner / Affiliation**: ${affiliation}
- **Current Mission**: Undisclosed — crew answers questions selectively.
- **Crew Complement**: ${crewType}
- **Tone**: ${tone}
- **Captain / Commander**: ${captain}
- **Captain Brief**: ${captainDetail}
- **Named Officers**: ${officerNames.join(", ")}
- **Officer Briefs**: ${officerDetails.join(" | ")}
- **Crew Culture**: ${crewProfile}

### Key Zones
${zoneLines}

### Complication
${complication}. The crew is managing it, but the window is narrowing.

### Secret
${secret}.

### Adventure Hooks
- ${hook1}
- ${hook2}
- ${hook3}`;

  return {
    type: "location",
    title: name,
    summary: `${name}, a ${condition.toLowerCase()} ${role.toLowerCase()} affiliated with ${affiliation}.`,
    content,
    lore,
    labels: ["rpg-ship", "rpg-location", "imported-draft"],
    status: "active",
  };
}
