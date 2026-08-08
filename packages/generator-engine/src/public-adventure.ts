/**
 * Public Adventure Idea Generator — framework-free, theme-aware.
 *
 * Generates structured, situation-based adventure concepts with dramatic
 * ingredients, key actors, and multiple possible outcomes using Codex
 * Cryptica's world theme system.
 *
 * Mirrors the dungeon generator's product boundary: the generator owns the
 * adventure concept and dramatic ingredients; a later Adventure Builder
 * owns the playable graph/structure.
 *
 * The generator answers:
 *   What is this adventure about, who is involved, what is happening,
 *   and why should the players care?
 *
 * It does not generate a fixed scene-by-scene plot or railroaded sequence.
 * Output describes a situation with multiple avenues of action.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { BANNED_NAMES, NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { themeIdToLabel } from "./public-faction-constants";
import {
  adventureConfig,
  forAdventureGenre,
  forAdventureGenreTables,
  ADVENTURE_GENRE_HINTS,
  ADVENTURE_SAMPLE_TITLES_BY_GENRE,
  ADVENTURE_INCITING_ACTORS_BY_GENRE,
  ADVENTURE_OBJECTIVE_TYPES_BY_GENRE,
  ADVENTURE_LOCATION_TYPES_BY_GENRE,
  ADVENTURE_NPC_ROLES_BY_GENRE,
  ADVENTURE_THREAT_TYPES_BY_GENRE,
  ADVENTURE_DISCOVERY_TYPES_BY_GENRE,
  ADVENTURE_COMPLICATION_TYPES_BY_GENRE,
  ADVENTURE_REWARD_TYPES_BY_GENRE,
  ADVENTURE_OUTCOME_TYPES_BY_GENRE,
  PRESSURE_TYPES,
} from "./public-adventure-constants";

export { adventureConfig, forAdventureGenre };

export interface AdventureGeneratorOptions {
  themeId?: string;
  genre?: string;
  archetype?: string;
  scale?: string;
  tone?: string;
  seed?: string;
  instruction?: string;
  /**
   * Free-text world/campaign background from the form's context field.
   * Background, not subject: the seed says what the adventure is about, this
   * says what world it sits in.
   */
  campaignContext?: string;
  /** Names already used elsewhere in this session. */
  avoidNames?: string[];
}

export interface ResolvedAdventure {
  themeId: string;
  genre: string;
  archetype: string;
  scale: string;
  tone: string;
  title: string;
  premise: string;
  initialSituation: string;
  primaryObjective: string;
  pressure: string;
  primaryPressure: string;
  secondaryPressure?: string;
  keyLocations: string[];
  npcRoles: string[];
  threats: string[];
  discoveries: string[];
  complications: string[];
  rewards: string[];
  outcomes: string[];
  hooks: string[];
}

export interface AdventurePrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedAdventure;
}

/** Pick an item from a pool, avoiding anything already in `used` when possible. */
function pickUnused<T extends string>(
  pool: readonly T[],
  used: Set<string>,
  rng: Rng,
): T {
  const remaining = pool.filter((f) => !used.has(f));
  const picked = pickFrom(remaining.length > 0 ? remaining : pool, rng);
  used.add(picked);
  return picked;
}

/** Render discrete entries as a markdown list. */
function formatList(items: string[]): string {
  return items
    .map((i) => {
      const clean = i.trim();
      if (/^-\s*-/.test(clean)) {
        return clean.replace(/^-\s*-+/, "-").trim();
      }
      return clean.startsWith("- ") ? clean : `- ${clean}`;
    })
    .join("\n");
}

/**
 * Coerce a narrative field to a string, accepting an array of strings.
 * Mirrors the dungeon generator's narrativeText() helper.
 */
function narrativeText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim())
      .join(" ");
  }
  return "";
}

/**
 * Coerce a list-shaped field, accepting either an array or a prose blob.
 * Mirrors the dungeon generator's narrativeList() helper.
 */
function narrativeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
  }
  const text = narrativeText(value);
  return text ? [text] : [];
}

function resolveAdventure(
  options: AdventureGeneratorOptions,
  rng: Rng = defaultRng,
): ResolvedAdventure {
  const themeId = options.themeId || "fantasy";
  const genre = options.genre || themeIdToLabel[themeId] || "Classic Fantasy";

  const tables = forAdventureGenreTables(genre);

  const archetype =
    options.archetype ||
    pickFrom(forAdventureGenre(adventureConfig.archetypesByGenre, genre), rng);
  const scale = options.scale || pickFrom(adventureConfig.scales, rng);
  const tone =
    options.tone ||
    pickFrom(forAdventureGenre(adventureConfig.tonesByGenre, genre), rng);

  const title = pickFrom(
    forAdventureGenre(ADVENTURE_SAMPLE_TITLES_BY_GENRE, genre),
    rng,
  );
  const premise = `${title} — A ${tone.toLowerCase()} ${archetype.toLowerCase()} adventure (${scale.toLowerCase()}).`;

  const incitingActor = pickFrom(
    forAdventureGenre(ADVENTURE_INCITING_ACTORS_BY_GENRE, genre),
    rng,
  );
  const objectiveType = pickFrom(
    forAdventureGenre(ADVENTURE_OBJECTIVE_TYPES_BY_GENRE, genre),
    rng,
  );
  const primaryPressure = pickFrom(PRESSURE_TYPES, rng);
  const secondaryPressure =
    rng() > 0.35 || scale.includes("Arc")
      ? pickFrom(
          PRESSURE_TYPES.filter((p) => p !== primaryPressure),
          rng,
        )
      : undefined;

  const pressure = secondaryPressure
    ? `${primaryPressure} coupled with ${secondaryPressure}`
    : primaryPressure;

  const initialSituation = `${incitingActor.charAt(0).toUpperCase() + incitingActor.slice(1)} has set events in motion. ${objectiveType}.`;
  const primaryObjective = secondaryPressure
    ? `${objectiveType} — driven by ${primaryPressure} and complicated by ${secondaryPressure}.`
    : `${objectiveType} — driven by ${primaryPressure}.`;

  const usedLocations = new Set<string>();
  const locationPool = forAdventureGenre(
    ADVENTURE_LOCATION_TYPES_BY_GENRE,
    genre,
  );
  const keyLocations = [
    pickUnused(locationPool, usedLocations, rng),
    pickUnused(locationPool, usedLocations, rng),
    ...(scale.includes("Campaign")
      ? [pickUnused(locationPool, usedLocations, rng)]
      : []),
  ];

  const npcRoles = pickRandomItems(
    forAdventureGenre(ADVENTURE_NPC_ROLES_BY_GENRE, genre),
    scale.includes("One-Shot") ? 2 : 3,
    rng,
  );
  const threats = pickRandomItems(
    forAdventureGenre(ADVENTURE_THREAT_TYPES_BY_GENRE, genre),
    2,
    rng,
  );
  const discoveries = pickRandomItems(
    forAdventureGenre(ADVENTURE_DISCOVERY_TYPES_BY_GENRE, genre),
    scale.includes("One-Shot") ? 2 : 3,
    rng,
  );
  const complications = pickRandomItems(
    forAdventureGenre(ADVENTURE_COMPLICATION_TYPES_BY_GENRE, genre),
    2 + Math.floor(rng() * 2),
    rng,
  );
  const rewards = pickRandomItems(
    forAdventureGenre(ADVENTURE_REWARD_TYPES_BY_GENRE, genre),
    2,
    rng,
  );
  const outcomes = pickRandomItems(
    forAdventureGenre(ADVENTURE_OUTCOME_TYPES_BY_GENRE, genre),
    scale.includes("One-Shot") ? 2 : 3,
    rng,
  );
  const hooks = pickRandomItems(tables.hooks, 2 + Math.floor(rng() * 2), rng);

  return {
    themeId,
    genre,
    archetype,
    scale,
    tone,
    title,
    premise,
    initialSituation,
    primaryObjective,
    pressure,
    primaryPressure,
    secondaryPressure,
    keyLocations,
    npcRoles,
    threats,
    discoveries,
    complications,
    rewards,
    outcomes,
    hooks,
  };
}

/**
 * Render an already-resolved adventure as the public document.
 *
 * Split out from generateAdventureLocal so a rejected AI response can fall
 * back to the exact foundation the prompt was built from.
 */
function renderResolvedAdventure(
  adventure: ResolvedAdventure,
): PublicGeneratorOutput {
  const content = [
    `## Initial Situation`,
    adventure.initialSituation,
    ``,
    `## Primary Objective & Pressure`,
    adventure.primaryObjective,
    ``,
    `## Key Locations`,
    formatList(adventure.keyLocations),
    ``,
    `## Important NPCs & Factions`,
    formatList(adventure.npcRoles),
    ``,
    `## Threats & Antagonists`,
    formatList(adventure.threats),
    ``,
    `## Clues, Secrets & Discoveries`,
    formatList(adventure.discoveries),
  ].join("\n");

  const lore = [
    `### Complications & Escalating Pressures`,
    formatList(adventure.complications),
    ``,
    `### Rewards & Stakes`,
    formatList(adventure.rewards),
    ``,
    `### Possible Outcomes`,
    formatList(adventure.outcomes),
    ``,
    `### Adventure Hooks`,
    formatList(adventure.hooks),
  ].join("\n");

  return {
    type: "note",
    kind: "adventure",
    title: adventure.title,
    summary: adventure.premise,
    content,
    lore,
    labels: [
      "adventure",
      "event",
      adventure.genre.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      adventure.archetype.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    ],
    status: "active",
  };
}

/**
 * Generate a local, offline adventure concept without network or LLM calls.
 */
export function generateAdventureLocal(
  options: AdventureGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  return renderResolvedAdventure(resolveAdventure(options, rng));
}

/**
 * Words that read as a deadline or a "before X happens" consequence. Used to
 * decide whether a user-supplied seed carries its own pressure that the
 * adventure must adopt rather than invent one of its own.
 */
const SEED_DEADLINE_PATTERNS = [
  /\bbefore\b/i,
  /\bunless\b/i,
  /\buntil\b/i,
  /\bby (?:dawn|dusk|midnight|nightfall|morning|sunrise|sunset|the end of)\b/i,
  /\bwithin \w+ (?:hour|day|week|month|cycle|shift)/i,
  /\bin \w+ (?:hours|days|weeks|months|cycles|shifts)\b/i,
  /\b(?:deadline|countdown|ticking|running out|too late)\b/i,
];

/**
 * Terms that signal a trackable clock. Shared between the prompt-side
 * expectations and the response validation below.
 */
const CLOCK_TERMS = [
  "hour",
  "dawn",
  "dusk",
  "solstice",
  "equinox",
  "midnight",
  "eclipse",
  "day",
  "clock",
  "timer",
  "deadline",
  "expire",
];

/**
 * Broader pressure vocabulary. A primary objective that adopted a seed's
 * deadline will almost always contain one of these, even when it phrases the
 * clock in the seed's own words ("before the food riot") rather than in
 * calendar terms. Kept deliberately wide — this backs a validation check that
 * triggers a retry, so false positives cost a round-trip.
 */
const PRESSURE_SIGNAL_TERMS = [
  ...CLOCK_TERMS,
  "before",
  "unless",
  "until",
  "within",
  "race",
  "escalat",
  "spread",
  "collapse",
  "riot",
  "starv",
  "sabotage",
  "pressure",
  "window",
];

/**
 * Capitalised sequences a user-supplied seed introduces — the people, places,
 * ships and organisations the adventure must keep rather than rename.
 *
 * A word that opens a sentence is skipped: "Investigate a series of telemetry
 * dropouts..." starts with a capital but names nothing. Multi-word sequences
 * and tokens carrying a digit or an internal capital ("Aurelia-7",
 * "Phobos-Zero") are kept wherever they appear, since sentence position tells
 * us nothing useful about those.
 */
export function extractSeedProperNouns(seed: string): string[] {
  const found = new Set<string>();
  // Sentence-ish spans, so "first word" is meaningful.
  for (const sentence of seed.split(/(?<=[.!?;:\n])\s+/)) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    const pattern =
      /\b[A-Z][A-Za-z0-9]*(?:[-'’][A-Za-z0-9]+)*(?:\s+[A-Z][A-Za-z0-9]*(?:[-'’][A-Za-z0-9]+)*)*/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(trimmed))) {
      const candidate = match[0].trim();
      if (candidate.length < 3) continue;
      const isSentenceStart = match.index === 0;
      const isMultiWord = /\s/.test(candidate);
      const isDistinctiveToken =
        /[0-9]/.test(candidate) || /[-'’]/.test(candidate);
      if (isSentenceStart && !isMultiWord && !isDistinctiveToken) continue;
      found.add(candidate);
    }
  }
  return [...found];
}

/** True when the seed states its own deadline or "before X" consequence. */
export function seedStatesDeadline(seed: string): boolean {
  return SEED_DEADLINE_PATTERNS.some((pattern) => pattern.test(seed));
}

/**
 * The session's "already used" names, minus anything the seed itself
 * introduced. A seed handed over from another generator names bodies,
 * stations and factions that generator has already registered as used —
 * telling the model to avoid those would defeat the point of the handoff.
 */
function avoidNamesExcludingSeed(
  avoidNames: string[],
  seed?: string,
): string[] {
  if (!seed?.trim()) return avoidNames;
  const seedNouns = extractSeedProperNouns(seed).map((n) => n.toLowerCase());
  return avoidNames.filter((name) => {
    const lower = name.trim().toLowerCase();
    if (!lower) return true;
    return !seedNouns.some(
      (noun) => noun.includes(lower) || lower.includes(noun),
    );
  });
}

/**
 * Format a user-supplied seed as binding fact.
 *
 * The mechanical seeds below are explicitly disposable — the prompt tells the
 * model to interpret them and not quote them back. A seed the user typed or
 * handed over from another generator is the opposite: its proper nouns and its
 * stated deadline are the whole reason they chose it, so they get their own
 * block that overrides the reinterpretation licence.
 */
function formatUserSeedBlock(seed: string): string {
  const trimmed = seed.trim();
  const properNouns = extractSeedProperNouns(trimmed);
  return [
    `GIVEN SITUATION — supplied by the user. This is NOT a creative seed to`,
    `reinterpret. Treat every detail below as established fact:`,
    `"""`,
    trimmed,
    `"""`,
    `- The adventure must be ABOUT this situation. Build outward from it; do not`,
    `  replace it with a different premise that merely shares a genre.`,
    ...(properNouns.length > 0
      ? [
          `- These names are fixed. Use each one spelled exactly as written, and do`,
          `  not rename, translate, or substitute them. The name restrictions and`,
          `  "already used elsewhere" list do NOT apply to them:`,
          ...properNouns.map((n) => `  - ${n}`),
        ]
      : []),
    ...(seedStatesDeadline(trimmed)
      ? [
          `- This situation states its own deadline or consequence. That IS the`,
          `  adventure's primary pressure — do not invent a different one. Carry it`,
          `  into primaryObjective as the trackable clock, in the situation's own`,
          `  terms, and let it drive the threats and complications.`,
        ]
      : []),
  ].join("\n");
}

/**
 * Format the mechanical seeds for the AI prompt.
 * Deliberately withholds locally-generated prose — seeds are starting points
 * to interpret; the structure is the part that must not move.
 */
function formatAdventureSeeds(
  adventure: ResolvedAdventure,
  avoidNames: string[] = [],
  pressureComesFromSeed = false,
): string {
  return [
    `Creative seeds — starting points to interpret. Write your own prose from these;`,
    `do NOT quote them back or treat them as finished text.`,
    `- Archetype: ${adventure.archetype}`,
    `- Tone: ${adventure.tone}`,
    // A randomly drawn pressure would contradict the deadline the user's own
    // situation already states — and some draws say so outright ("No immediate
    // deadline..."). The given situation wins.
    ...(pressureComesFromSeed
      ? [
          `- Pressure: taken from the GIVEN SITUATION above. Ignore any other`,
          `  pressure source; do not soften or replace its deadline.`,
        ]
      : [
          `- Primary Pressure: ${adventure.primaryPressure}`,
          ...(adventure.secondaryPressure
            ? [
                `- Secondary Interacting Pressure: ${adventure.secondaryPressure}`,
              ]
            : []),
        ]),
    `- 2-3 key locations (seed types): ${adventure.keyLocations.join(", ")}`,
    ``,
    `Structure — fixed. Honour these exactly.`,
    `- EXACTLY one clear initial situation (who, what, why now).`,
    `- EXACTLY one primary objective with a clear pressure source.`,
    `- 2-3 key locations, named and briefly described.`,
    `- 2-3 important NPCs or factions, each with a goal.`,
    `- 1-2 threats or antagonists.`,
    `- 2-3 clues, secrets, or discoveries.`,
    `- 2-3 complications or escalating pressures.`,
    `- 2-3 possible outcomes (non-linear resolutions, not a prescribed sequence).`,
    `- 2-3 adventure hooks.`,
    ...(avoidNames.length > 0
      ? [
          ``,
          `Already used elsewhere in this session — pick different names:`,
          ...avoidNames.map((n) => `- ${n}`),
        ]
      : []),
  ].join("\n");
}

/**
 * Build the AI prompt for generating an Adventure concept via LLM.
 */
export function buildAdventurePrompt(
  options: AdventureGeneratorOptions,
): AdventurePrompt {
  const adventure = resolveAdventure(options);
  const genreHint =
    ADVENTURE_GENRE_HINTS[adventure.genre] ||
    ADVENTURE_GENRE_HINTS["Fantasy"] ||
    ADVENTURE_GENRE_HINTS["Classic Fantasy"];

  const systemInstruction = `You are a master worldbuilder and TTRPG adventure designer. You write original ${adventure.genre} adventure concepts that a GM can run at the table.

You will be given creative seeds and a fixed structure. The seeds are raw material — interpret them, build on them, and write your own prose. Do not quote them back. The structure (one initial situation, one primary objective, specific numbers of locations, NPCs, threats, discoveries, complications, outcomes, hooks) is fixed and must be honoured precisely.

A "GIVEN SITUATION" block, when one is present, is the exception to that licence: it is user-supplied fact, not raw material. Its named people, places, and organisations must survive into the adventure exactly as written, and any deadline it states is the adventure's pressure. Follow the instructions inside that block over any general guidance here that conflicts with them.

Everything else is yours to invent: the adventure's title, specific names for locations and NPCs, the exact nature of the clues and complications, and the texture of the possible outcomes. Make them specific to this adventure rather than generic to the genre, and make the whole document internally consistent — the initial situation should explain why the objective is urgent, the threats should explain why it is dangerous, and the discoveries should reward the players for engaging with the world.

Write the "throughline" field first and let it govern everything else. It is ONE sentence covering who set events in motion, what is at stake, and how that leads to the initial situation, primary objective, and outcomes. Every later field must be consistent with it.

Critical Structural Guidelines for Playability & Global Causal Coherence:
1. SCENARIO-PATH GLOBAL CONSISTENCY PASS (The Primary Rule): After generating all elements, perform a scenario-path consistency pass. Trace where the objective physically is, how the players can reach it, which locations provide prerequisites or alternate routes, and how they escape. Every required transition between locations must be explicit. If two locations claim the same narrative function, reconcile them. Any essential place mentioned in another element — especially the objective location, climax, or target — MUST exist explicitly as its own key location card.
2. PRIORITISE CAUSAL COHERENCE OVER IDEA CONFETTI: Every major element (locations, NPCs, threats, clues, complications, rewards) must EARN its place through causal relationships. Prefer fewer, deeply interconnected ideas over many unrelated clever details. Avoid isolated flavour details that do not affect play.
3. THE 4-POINT FILTER (Role, Relation, Leverage, Consequence):
   - Role: why it exists in this adventure.
   - Relation: what other adventure elements (NPCs, locations, objectives) it connects to.
   - Leverage: what the players can do with, to, or because of it.
   - Consequence: what changes if players engage with, expose, or fail against it.
4. LEGITIMATE DILEMMAS BETWEEN COMPETING PRIORITIES: Prefer dilemmas between two legitimate priorities, costs, risks, or opportunities (e.g. save time vs. preserve secret, help oppressed locals vs. secure patron payout, save the artifact vs. save an innocent life). Avoid manufacturing dilemmas by making one option gratuitously cruel or merely offering two tactical methods for solving the same obstacle.
5. ACTIONABLE CLUES & SECRETS: Clues and secrets MUST change the players' available actions, understanding of a decision, or consequences. Do not include revelations solely for flavour.
6. SITUATION NETWORK, NOT A PLOT SEQUENCE: Provide multiple viable routes to make progress. No single clue, NPC, or location should accidentally become an unintended single point of failure / lone bottleneck.
7. TITLE & ENVIRONMENT CONSISTENCY: Ensure the title matches the environment and premise (e.g. do not call an adventure 'The Drowned Heir' if it takes place in a frozen mountain pass with no water, unless the prose explicitly justifies the title).
8. DYNAMIC PRESSURE & STAKES (Primary + Secondary Pressure):
   - Pressure answers 'What makes inaction, delay, or a bad choice costly?' using clear pressure sources (e.g. Countdown/Deadline, Rival Race, Dwindling Resource, Active Pursuit/Hunt, Cover-Up/Evidence Decay, Escalating Crisis, Institutional Crackdown, Fragile Relationship, Opportunity Window, Accumulating Consequences).
   - Deadlines and countdown clocks are NOT mandatory. Pursuits, evidence decay, fragile relationships, or accumulating consequences provide urgency without artificial clocks.
   - When a secondary pressure is specified in the seeds, it MUST interact directly with the primary pressure (e.g. Deadline + Rival Race, Institutional Crackdown + Cover-Up, Escalating Crisis + Dwindling Resource, Fragile Relationship + Opportunity Window).
   - Names and titles must remain consistent throughout.
   - Complications should introduce new decisions, costs, or relationships rather than merely increasing numeric difficulty.
   - Outcomes must describe distinct WORLD END-STATES (permanent consequences), not player tactics or mid-scene events.
9. ANTAGONIST & FACTION DIVERSITY: Invent original, distinct antagonists and factions tailored to the scenario (e.g. mining cartels, corrupt land speculators, rogue officers, cultists, smuggling rings, merchant cartels, cattle barons, or outlaw bands). Do not default to repetitive tropes like a generic "Rail Syndicate" unless explicitly requested by the user prompt.
10. CLUE & DISCOVERY DIVERSITY: Vary clue and item types across scenarios. Avoid defaulting to generic "ledgers" or "account books". Use tangible, genre-appropriate items (e.g. cipher wheels, wax-sealed dispatches, forged land deeds, blackmail photographs, broken signet rings, smuggler charts, audio cylinders, or contraband manifests).
11. MULTI-ASSET CLASSIFICATION & PRESERVATION DILEMMAS:
   - When an adventure involves transporting, protecting, recovering, or managing multiple assets or objectives (e.g. convoy cargo, pack mules, assay maps, mercury crates, hostages, relics, VIPs, or supply caches), explicitly distinguish which assets are **Essential** (mission critical), **Expendable** (can be sacrificed to buy time or solve obstacles), **Optional** (bonus payout/leverage), or **Secretly Critical** (holds far greater hidden importance or revelation than first appears).
   - Construct key dilemmas, complications, and world outcomes directly around what the players choose to preserve, trade, or sacrifice during the scenario.
12. CONSISTENT OBJECTIVE ASSET TRACKING & SPLIT ASSET ALLOCATION:
   - Track objective assets consistently across the entire adventure document.
   - If cargo, evidence, assay maps, mercury crates, prisoners, or key items are divided between different locations, NPCs, or factions, establish that divided state explicitly in initialSituation (e.g. "The genuine land treaty has been split into three signed notarized sheets: one held at the Assay Office, one seized by Barnaby Gault, and one hidden at the Saloon").
   - Success conditions in primaryObjective, keyLocations, and outcomes MUST explicitly reflect what assets/components must actually be recovered, secured, or re-assembled, and where each piece currently resides.

Return ONLY a single valid JSON object matching the requested schema. ${NAME_BAN_PROMPT}`;

  const userMessage = `Write an original ${adventure.genre} adventure concept.

Setting Context:
- Active Theme / Genre: ${adventure.genre} (${genreHint})
- Archetype: ${adventure.archetype}
- Scale: ${adventure.scale}
- Tone: ${adventure.tone}
${options.campaignContext?.trim() ? `- Campaign Context: ${options.campaignContext.trim()}` : ""}
${options.instruction ? `- Special Instructions: ${options.instruction}` : ""}
${options.seed?.trim() ? `\n${formatUserSeedBlock(options.seed)}\n` : ""}

${formatAdventureSeeds(
  adventure,
  avoidNamesExcludingSeed(options.avoidNames ?? [], options.seed),
  Boolean(options.seed?.trim() && seedStatesDeadline(options.seed)),
)}

Required JSON schema:
{
  "title": "Evocative, specific title for this adventure.",
  "summary": "1-2 sentence premise: what is this adventure about and why should players care?",
  "throughline": "ONE sentence: who set events in motion, what is at stake, and how that leads to the initial situation and primary objective. Write this before the fields below and keep them all consistent with it.",
  "initialSituation": "2-3 sentences: what is happening right now, who set it in motion, why does it demand action immediately, explicitly what role the PCs play, and if objective assets (cargo, evidence, prisoners, relics) are divided across locations or factions, establish that initial allocation explicitly here.",
  "primaryObjective": "One clear objective with explicit success conditions (what assets/components must actually be recovered/secured) and a trackable pressure/deadline (e.g. 'Dawn: Tax-Dragons arrive') that makes inaction costly.",
  "keyLocations": [
    {
      "name": "Specific location name",
      "description": "2 sentences: physical description and atmosphere.",
      "role": "Why it exists in this scenario",
      "relation": "Which NPC, threat, or clue connects to this location",
      "leverage": "What players can discover, leverage, or achieve here to make progress",
      "dilemma": "Meaningful choice between competing priorities this location forces on players"
    }
  ],
  "npcs": [
    {
      "name": "NPC or faction name",
      "role": "Their role in the situation",
      "relation": "How they connect to another NPC, faction, or the objective",
      "goal": "What they want — specific and actionable",
      "secret": "What they are hiding or what the party doesn't know about them yet",
      "leverage": "What players can bargain with, expose, or use against them",
      "dilemma": "Meaningful choice between competing priorities this NPC forces on players"
    }
  ],
  "threats": ["Format as '- **Evocative Threat Title**: 1-2 sentences describing who or what opposes the party, aligned with the main ticking clock'"],
  "discoveries": ["Format as '- **Evocative Clue Title**: 1-2 sentences describing an actionable revelation that solves an obstacle or opens an alternative pathway'"],
  "complications": ["Format as '- **Evocative Complication Title**: 1-2 sentences describing new decisions, costs, or shifting relationships that escalate the pressure'"],
  "rewards": ["Format as '- **Evocative Reward Title**: 1 sentence describing what players can gain — specific and proportionate to the stakes'"],
  "outcomes": ["Format as '- **Evocative Outcome Title**: 2-3 sentences describing a genuinely different WORLD END-STATE (permanent world consequences after the adventure ends)'"],
  "hooks": ["Format as '- **Evocative Hook Title**: 1-2 sentences describing a specific reason a particular party would engage with this adventure'"]
}`;

  return {
    systemInstruction,
    userMessage,
    resolved: adventure,
  };
}

// ---------------------------------------------------------------------------
// AI response parsing
// ---------------------------------------------------------------------------

/** Why a name field is checked but not description fields. */
function bannedNamesIn(values: string[], extra: string[] = []): string[] {
  const found = new Set<string>();
  const forbidden = [...BANNED_NAMES, ...extra].filter((n) => n.trim());
  for (const value of values) {
    for (const banned of forbidden) {
      const escaped = banned.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(value)) {
        found.add(banned.trim());
      }
    }
  }
  return [...found];
}

export interface AdventureParseResult {
  output: PublicGeneratorOutput;
  /**
   * True when the response was structurally unusable and `output` is the
   * local foundation. False means `output` is the model's work.
   */
  rejected: boolean;
  /** Why the response was rejected, empty when it was used. */
  problems: string[];
}

/**
 * Build a corrective follow-up prompt for a rejected adventure response.
 */
export function buildAdventureRetryMessage(
  userMessage: string,
  problems: string[],
): string {
  return [
    userMessage,
    ``,
    `Your previous response was rejected for these reasons:`,
    ...problems.map((p) => `- ${p}`),
    ``,
    `Return a corrected JSON object that fixes every point above. Keep whatever`,
    `was already good; change only what the list requires.`,
  ].join("\n");
}

/**
 * Parse an AI JSON response for an Adventure concept, falling back to local generator on error.
 */
export function parseAdventureResponseDetailed(
  rawText: string,
  options: AdventureGeneratorOptions = {},
  rng: Rng = defaultRng,
  foundation?: ResolvedAdventure,
): AdventureParseResult {
  try {
    const parsed = parseFencedJson<Record<string, unknown>>(rawText);

    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : "An Untitled Adventure";

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "A campaign-ready adventure concept.";

    const str = (v: unknown, fallback = "") => narrativeText(v) || fallback;
    const list = (v: unknown, fallback: string[] = []) => {
      const parsedList = narrativeList(v);
      return parsedList.length > 0 ? parsedList : fallback;
    };

    // Check which narrative fields the model supplied.
    const omitted = (
      [
        "throughline",
        "initialSituation",
        "primaryObjective",
        "keyLocations",
        "threats",
        "discoveries",
        "complications",
        "outcomes",
        "hooks",
      ] as const
    ).filter((k) => {
      const listFields = [
        "keyLocations",
        "threats",
        "discoveries",
        "complications",
        "outcomes",
        "hooks",
        "npcs",
        "rewards",
      ] as const;
      if ((listFields as readonly string[]).includes(k)) {
        return narrativeList(parsed[k]).length === 0;
      }
      return !narrativeText(parsed[k]);
    });

    const problems: string[] = [];
    if (omitted.length > 0) {
      problems.push(`missing required fields: ${omitted.join(", ")}`);
    }

    // Name fields to check for clichés.
    const nameValues = [title];
    const rawNpcs = Array.isArray(parsed.npcs) ? parsed.npcs : [];
    for (const npc of rawNpcs) {
      if (npc && typeof npc === "object" && typeof npc.name === "string") {
        nameValues.push(npc.name);
      }
    }
    const rawLocations = Array.isArray(parsed.keyLocations)
      ? parsed.keyLocations
      : [];
    for (const loc of rawLocations) {
      if (loc && typeof loc === "object" && typeof loc.name === "string") {
        nameValues.push(loc.name);
      }
    }

    const banned = bannedNamesIn(nameValues);
    if (banned.length > 0) {
      problems.push(`uses banned cliché names: ${banned.join(", ")}`);
    }
    const reused = bannedNamesIn(
      nameValues,
      avoidNamesExcludingSeed(options.avoidNames ?? [], options.seed),
    ).filter((n) => !banned.includes(n));
    if (reused.length > 0) {
      problems.push(
        `reuses names already used elsewhere in this session: ${reused.join(", ")}`,
      );
    }

    // 0. Seed fidelity. A user-supplied seed is binding: the model must keep
    // its names and adopt its stated deadline rather than paraphrasing both
    // away. Both checks are deliberately lenient — they fire only when the
    // seed was clearly discarded, since each failure costs a retry.
    const seedText = options.seed?.trim();
    if (seedText) {
      const wholeOutput = JSON.stringify(parsed);
      const seedNouns = extractSeedProperNouns(seedText);
      if (
        seedNouns.length > 0 &&
        !seedNouns.some((noun) =>
          wholeOutput.toLowerCase().includes(noun.toLowerCase()),
        )
      ) {
        problems.push(
          `drops every name from the given situation (${seedNouns.join(", ")}) — these are fixed and must appear in the adventure as written.`,
        );
      }
      if (seedStatesDeadline(seedText)) {
        const objectiveWithSummary =
          `${parsed.summary ?? ""} ${parsed.primaryObjective ?? ""}`.toLowerCase();
        const keepsPressure = PRESSURE_SIGNAL_TERMS.some((term) =>
          objectiveWithSummary.includes(term),
        );
        if (!keepsPressure) {
          problems.push(
            "the given situation states its own deadline, but primaryObjective carries no pressure — adopt that deadline as the adventure's clock.",
          );
        }
      }
    }

    // 1. Programmatic Title vs. Environment Coherence Validation (Multi-Domain)
    const titleLower = title.toLowerCase();
    const fullTextLower = JSON.stringify(parsed).toLowerCase();
    const environmentDomainRules = [
      {
        domain: "aquatic/flooding",
        titleKeywords: [
          "drowned",
          "sunken",
          "submerged",
          "underwater",
          "flooded",
          "maritime",
        ],
        contextKeywords: [
          "water",
          "flood",
          "river",
          "sea",
          "ocean",
          "lake",
          "drown",
          "belfry",
          "mere",
          "rain",
          "swamp",
          "marsh",
          "tide",
          "ship",
          "harbor",
          "coastal",
          "stream",
        ],
      },
      {
        domain: "mountain/alpine",
        titleKeywords: [
          "mountain",
          "alpine",
          "summit",
          "peak",
          "crag",
          "cliff",
          "glacier",
          "pass",
        ],
        contextKeywords: [
          "mountain",
          "peak",
          "crag",
          "cliff",
          "pass",
          "glacier",
          "altitude",
          "gorge",
          "ravine",
          "granite",
          "rock",
          "slope",
          "switchback",
        ],
      },
      {
        domain: "forest/wilds",
        titleKeywords: [
          "forest",
          "jungle",
          "sylvan",
          "grove",
          "thicket",
          "canopy",
          "timber",
        ],
        contextKeywords: [
          "forest",
          "tree",
          "wood",
          "jungle",
          "grove",
          "thicket",
          "canopy",
          "timber",
          "leaf",
          "bough",
          "root",
          "foliage",
          "sylvan",
        ],
      },
      {
        domain: "desert/arid",
        titleKeywords: ["desert", "dune", "arid", "wasteland", "sand"],
        contextKeywords: [
          "desert",
          "sand",
          "dune",
          "arid",
          "waste",
          "heat",
          "oasis",
          "cactus",
          "dust",
          "barren",
          "sun-baked",
        ],
      },
      {
        domain: "urban/city",
        titleKeywords: [
          "city",
          "urban",
          "metropolis",
          "spire",
          "borough",
          "district",
        ],
        contextKeywords: [
          "city",
          "street",
          "alley",
          "market",
          "plaza",
          "court",
          "building",
          "inn",
          "tavern",
          "capital",
          "urban",
          "borough",
          "district",
          "tenement",
        ],
      },
      {
        domain: "subterranean/cavern",
        titleKeywords: [
          "subterranean",
          "underdark",
          "cavern",
          "catacomb",
          "chasm",
          "tomb",
          "vault",
        ],
        contextKeywords: [
          "cave",
          "cavern",
          "subterranean",
          "underground",
          "tomb",
          "catacomb",
          "chasm",
          "tunnel",
          "shaft",
          "mine",
          "abyss",
          "depths",
        ],
      },
      {
        domain: "arctic/frost",
        titleKeywords: ["frost", "frozen", "arctic", "ice", "blizzard"],
        contextKeywords: [
          "frost",
          "ice",
          "snow",
          "frozen",
          "blizzard",
          "winter",
          "chill",
          "glacier",
          "rime",
          "cold",
          "freezing",
        ],
      },
    ];

    for (const rule of environmentDomainRules) {
      const matchesTitle = rule.titleKeywords.some((term) =>
        titleLower.includes(term),
      );
      if (matchesTitle) {
        const matchesContext = rule.contextKeywords.some((term) =>
          fullTextLower.includes(term),
        );
        if (!matchesContext) {
          problems.push(
            `Title '${title}' references ${rule.domain} keywords but the adventure context has no corresponding ${rule.domain} elements.`,
          );
        }
      }
    }

    // 2. Programmatic Dilemma Presence Validation (Locations & NPCs)
    let missingDilemmas = 0;
    for (const loc of rawLocations) {
      if (loc && typeof loc === "object") {
        const d = (loc as Record<string, unknown>).dilemma;
        if (typeof d !== "string" || !d.trim()) missingDilemmas++;
      }
    }
    for (const npc of rawNpcs) {
      if (npc && typeof npc === "object") {
        const d = (npc as Record<string, unknown>).dilemma;
        if (typeof d !== "string" || !d.trim()) missingDilemmas++;
      }
    }
    if (missingDilemmas > 0) {
      problems.push(
        "keyLocations and npcs must each include a 'dilemma' field detailing a choice between competing priorities.",
      );
    }

    // 3. Programmatic Ticking Clock Integration Validation
    const summaryObjText =
      `${parsed.summary ?? ""} ${parsed.primaryObjective ?? ""}`.toLowerCase();
    const hasClockInObjective = CLOCK_TERMS.some((term) =>
      summaryObjText.includes(term),
    );
    if (hasClockInObjective) {
      const threatsCompText =
        `${JSON.stringify(parsed.threats ?? "")} ${JSON.stringify(parsed.complications ?? "")}`.toLowerCase();
      const integratesClock = CLOCK_TERMS.some((term) =>
        threatsCompText.includes(term),
      );
      if (!integratesClock) {
        problems.push(
          "Primary objective deadline/clock must be integrated into threats or complications.",
        );
      }
    }

    // 4. Programmatic Destination Site Representation Validation
    const objectiveText =
      `${parsed.primaryObjective ?? ""} ${parsed.throughline ?? ""}`.toLowerCase();
    const destinationKeywords = [
      "hermitage",
      "sanctuary",
      "tomb",
      "vault",
      "shrine",
      "bastion",
      "fortress",
      "citadel",
      "parish",
      "temple",
      "ruins",
      "court",
      "haven",
      "catacombs",
      "monastery",
      "keep",
      "garrison",
      "chamber",
    ];
    const mentionedDestinations = destinationKeywords.filter((term) =>
      objectiveText.includes(term),
    );
    if (mentionedDestinations.length > 0) {
      const locationNamesText = rawLocations
        .map((loc) => {
          if (typeof loc === "string") return loc;
          if (loc && typeof loc === "object" && typeof loc.name === "string")
            return loc.name;
          return "";
        })
        .join(" ")
        .toLowerCase();
      const isRepresentedInLocations = mentionedDestinations.some((term) =>
        locationNamesText.includes(term),
      );
      if (!isRepresentedInLocations) {
        problems.push(
          `The primary objective destination site ('${mentionedDestinations.join(", ")}') must be included as an explicit keyLocations card.`,
        );
      }
    }

    // Structural violations cause rejection.
    const structural = problems.filter(
      (p) => p.startsWith("uses banned") || p.startsWith("reuses names"),
    );
    if (structural.length > 0 && foundation) {
      return {
        output: { ...renderResolvedAdventure(foundation), aiFallback: true },
        problems,
        rejected: true,
      };
    }

    const initialSituation = str(
      parsed.initialSituation,
      foundation?.initialSituation ?? "",
    );
    const primaryObjective = str(
      parsed.primaryObjective,
      foundation?.primaryObjective ?? "",
    );

    // keyLocations formatted as structured sub-bullets without emdashes
    const keyLocations: string[] = (() => {
      const rawLocs = Array.isArray(parsed.keyLocations)
        ? parsed.keyLocations
        : [];
      const mapped = rawLocs
        .map((loc: unknown) => {
          if (typeof loc === "string")
            return loc.replace(/\s*—\s*/g, ": ").trim();
          if (loc && typeof loc === "object") {
            const l = loc as Record<string, unknown>;
            const name =
              typeof l.name === "string"
                ? l.name.replace(/\s*—\s*/g, ": ").trim()
                : "";
            const desc =
              typeof l.description === "string"
                ? l.description.replace(/\s*—\s*/g, ": ").trim()
                : "";
            const role =
              typeof l.role === "string"
                ? l.role.replace(/\s*—\s*/g, ": ").trim()
                : typeof l.roleInScenario === "string"
                  ? l.roleInScenario.replace(/\s*—\s*/g, ": ").trim()
                  : "";
            const relation =
              typeof l.relation === "string"
                ? l.relation.replace(/\s*—\s*/g, ": ").trim()
                : "";
            const leverage =
              typeof l.leverage === "string"
                ? l.leverage.replace(/\s*—\s*/g, ": ").trim()
                : "";
            const dilemma =
              typeof l.dilemma === "string"
                ? l.dilemma.replace(/\s*—\s*/g, ": ").trim()
                : "";

            const subBullets: string[] = [];
            if (role) subBullets.push(`  - **Role:** ${role}`);
            if (relation) subBullets.push(`  - **Relation:** ${relation}`);
            if (leverage) subBullets.push(`  - **Leverage:** ${leverage}`);
            if (dilemma) subBullets.push(`  - **Dilemma:** ${dilemma}`);

            const header = name && desc ? `**${name}**: ${desc}` : name || desc;
            return subBullets.length > 0
              ? `${header}\n${subBullets.join("\n")}`
              : header;
          }
          return "";
        })
        .filter(Boolean);
      return mapped.length > 0 ? mapped : (foundation?.keyLocations ?? []);
    })();

    // npcs formatted as structured sub-bullets without emdashes
    const npcLines: string[] = (() => {
      const rawNpcList = Array.isArray(parsed.npcs) ? parsed.npcs : [];
      const mapped = rawNpcList
        .map((npc: unknown) => {
          if (typeof npc === "string")
            return npc.replace(/\s*—\s*/g, ": ").trim();
          if (npc && typeof npc === "object") {
            const n = npc as Record<string, unknown>;
            const name =
              typeof n.name === "string"
                ? n.name.replace(/\s*—\s*/g, ": ").trim()
                : "";
            const role =
              typeof n.role === "string"
                ? n.role.replace(/\s*—\s*/g, ": ").trim()
                : "";
            const goal =
              typeof n.goal === "string"
                ? n.goal.replace(/\s*—\s*/g, ": ").trim()
                : "";
            const secret =
              typeof n.secret === "string"
                ? n.secret.replace(/\s*—\s*/g, ": ").trim()
                : "";
            const relation =
              typeof n.relationship === "string"
                ? n.relationship.replace(/\s*—\s*/g, ": ").trim()
                : typeof n.relation === "string"
                  ? n.relation.replace(/\s*—\s*/g, ": ").trim()
                  : "";
            const leverage =
              typeof n.leverage === "string"
                ? n.leverage.replace(/\s*—\s*/g, ": ").trim()
                : "";
            const dilemma =
              typeof n.dilemma === "string"
                ? n.dilemma.replace(/\s*—\s*/g, ": ").trim()
                : "";

            const subBullets: string[] = [];
            if (relation) subBullets.push(`  - **Relation:** ${relation}`);
            if (goal)
              subBullets.push(
                `  - **Wants:** ${goal.endsWith(".") ? goal : goal + "."}`,
              );
            if (secret) subBullets.push(`  - **Secret:** ${secret}`);
            if (leverage) subBullets.push(`  - **Leverage:** ${leverage}`);
            if (dilemma) subBullets.push(`  - **Dilemma:** ${dilemma}`);

            const header = name && role ? `**${name}**: ${role}` : name || role;
            return subBullets.length > 0
              ? `${header}\n${subBullets.join("\n")}`
              : header;
          }
          return "";
        })
        .filter(Boolean);
      return mapped.length > 0 ? mapped : (foundation?.npcRoles ?? []);
    })();

    const threats = list(parsed.threats, foundation?.threats ?? []);
    const discoveries = list(parsed.discoveries, foundation?.discoveries ?? []);
    const complications = list(
      parsed.complications,
      foundation?.complications ?? [],
    );
    const rewards = list(parsed.rewards, foundation?.rewards ?? []);
    const outcomes = list(parsed.outcomes, foundation?.outcomes ?? []);
    const hooks = list(parsed.hooks, foundation?.hooks ?? []);

    const themeId = options.themeId || "fantasy";
    const genre = options.genre || themeIdToLabel[themeId] || "Classic Fantasy";

    const content = [
      `## Initial Situation`,
      initialSituation,
      ``,
      `## Primary Objective & Pressure`,
      primaryObjective,
      ``,
      keyLocations.length
        ? `## Key Locations\n${formatList(keyLocations)}\n`
        : "",
      npcLines.length
        ? `## Important NPCs & Factions\n${formatList(npcLines)}\n`
        : "",
      threats.length
        ? `## Threats & Antagonists\n${formatList(threats)}\n`
        : "",
      discoveries.length
        ? `## Clues, Secrets & Discoveries\n${formatList(discoveries)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const lore = [
      complications.length
        ? `### Complications & Escalating Pressures\n${formatList(complications)}\n`
        : "",
      rewards.length ? `### Rewards & Stakes\n${formatList(rewards)}\n` : "",
      outcomes.length ? `### Possible Outcomes\n${formatList(outcomes)}\n` : "",
      hooks.length ? `### Adventure Hooks\n${formatList(hooks)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      output: {
        type: "note",
        kind: "adventure",
        title,
        summary,
        content,
        lore,
        labels: [
          "adventure",
          "event",
          genre.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        ],
        status: "active",
      },
      problems,
      rejected: false,
    };
  } catch {
    return {
      output: {
        ...(foundation
          ? renderResolvedAdventure(foundation)
          : generateAdventureLocal(options, rng)),
        aiFallback: true,
      },
      problems: [
        "the response was not valid JSON matching the requested schema",
      ],
      rejected: true,
    };
  }
}

/**
 * Parse an AI adventure response, discarding the rejection reasons.
 *
 * Kept for callers that cannot retry. Prefer parseAdventureResponseDetailed
 * and a corrective second attempt where a model call is available.
 */
export function parseAdventureResponse(
  rawText: string,
  options: AdventureGeneratorOptions = {},
  rng: Rng = defaultRng,
  foundation?: ResolvedAdventure,
): PublicGeneratorOutput {
  return parseAdventureResponseDetailed(rawText, options, rng, foundation)
    .output;
}
