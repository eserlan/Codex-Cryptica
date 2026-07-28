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
  return items.map((i) => `- ${i}`).join("\n");
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
  const pressure = pickFrom(PRESSURE_TYPES, rng);

  const initialSituation = `${incitingActor.charAt(0).toUpperCase() + incitingActor.slice(1)} has set events in motion. ${objectiveType}.`;
  const primaryObjective = `${objectiveType} — with ${pressure}.`;

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
    type: "event",
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
 * Format the mechanical seeds for the AI prompt.
 * Deliberately withholds locally-generated prose — seeds are starting points
 * to interpret; the structure is the part that must not move.
 */
function formatAdventureSeeds(
  adventure: ResolvedAdventure,
  avoidNames: string[] = [],
): string {
  return [
    `Creative seeds — starting points to interpret. Write your own prose from these;`,
    `do NOT quote them back or treat them as finished text.`,
    `- Archetype: ${adventure.archetype}`,
    `- Tone: ${adventure.tone}`,
    `- Inciting pressure: ${adventure.pressure}`,
    `- 2-3 key locations (seed types): ${adventure.keyLocations.join(", ")}`,
    ``,
    `Structure — fixed. Honour these exactly.`,
    `- EXACTLY one clear initial situation (who, what, why now).`,
    `- EXACTLY one primary objective with a ticking pressure.`,
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

Everything else is yours to invent: the adventure's title, specific names for locations and NPCs, the exact nature of the clues and complications, and the texture of the possible outcomes. Make them specific to this adventure rather than generic to the genre, and make the whole document internally consistent — the initial situation should explain why the objective is urgent, the threats should explain why it is dangerous, and the discoveries should reward the players for engaging with the world.

The output must describe a SITUATION, not a plot. Provide multiple avenues of action, not a required sequence of scenes. The possible outcomes should represent genuinely different resolutions, not variations on a single ending.

Return ONLY a single valid JSON object matching the requested schema. ${NAME_BAN_PROMPT}`;

  const userMessage = `Write an original ${adventure.genre} adventure concept.

Setting Context:
- Active Theme / Genre: ${adventure.genre} (${genreHint})
- Archetype: ${adventure.archetype}
- Scale: ${adventure.scale}
- Tone: ${adventure.tone}
${options.seed ? `- Starting Seed / Situation: ${options.seed}` : ""}
${options.instruction ? `- Special Instructions: ${options.instruction}` : ""}

${formatAdventureSeeds(adventure, options.avoidNames ?? [])}

Required JSON schema:
{
  "title": "Evocative, specific title for this adventure.",
  "summary": "1-2 sentence premise: what is this adventure about and why should players care?",
  "initialSituation": "2-3 sentences: what is happening right now, who set it in motion, and why does it demand action immediately?",
  "primaryObjective": "One clear objective with an explicit, measurable deadline or pressure (e.g. 3 days, before solstice, 24 hours) that makes inaction costly.",
  "keyLocations": [
    { "name": "Specific location name", "description": "2 sentences: what it is and why it matters to this adventure." }
  ],
  "npcs": [
    { "name": "NPC or faction name", "role": "Their role in the situation", "goal": "What they want — specific and actionable", "secret": "What they are hiding or what the party doesn't know about them yet" }
  ],
  "threats": ["1-2 sentences per threat: who or what opposes the party and how"],
  "discoveries": ["1-2 sentences per discovery: specific clues, secrets, or revelations the players can find"],
  "complications": ["1-2 sentences per complication: specific escalating pressures that make the situation harder"],
  "rewards": ["1 sentence per reward: what players can gain — specific and proportionate to the stakes"],
  "outcomes": ["2-3 sentences per outcome: a genuinely different resolution, written as a situation rather than a required ending"],
  "hooks": ["1-2 sentences per hook: a specific reason a particular party would engage with this adventure"]
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
    const reused = bannedNamesIn(nameValues, options.avoidNames ?? []).filter(
      (n) => !banned.includes(n),
    );
    if (reused.length > 0) {
      problems.push(
        `reuses names already used elsewhere in this session: ${reused.join(", ")}`,
      );
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

    // keyLocations can be objects or strings.
    const keyLocations: string[] = (() => {
      const rawLocs = Array.isArray(parsed.keyLocations)
        ? parsed.keyLocations
        : [];
      const mapped = rawLocs
        .map((loc: unknown) => {
          if (typeof loc === "string") return loc.trim();
          if (loc && typeof loc === "object") {
            const l = loc as Record<string, unknown>;
            const name = typeof l.name === "string" ? l.name.trim() : "";
            const desc =
              typeof l.description === "string" ? l.description.trim() : "";
            return name && desc ? `**${name}** — ${desc}` : name || desc;
          }
          return "";
        })
        .filter(Boolean);
      return mapped.length > 0 ? mapped : (foundation?.keyLocations ?? []);
    })();

    // npcs can be objects or strings.
    const npcLines: string[] = (() => {
      const rawNpcList = Array.isArray(parsed.npcs) ? parsed.npcs : [];
      const mapped = rawNpcList
        .map((npc: unknown) => {
          if (typeof npc === "string") return npc.trim();
          if (npc && typeof npc === "object") {
            const n = npc as Record<string, unknown>;
            const name = typeof n.name === "string" ? n.name.trim() : "";
            const role = typeof n.role === "string" ? n.role.trim() : "";
            const goal = typeof n.goal === "string" ? n.goal.trim() : "";
            const secret = typeof n.secret === "string" ? n.secret.trim() : "";
            const details = [];
            if (role) details.push(role);
            if (goal)
              details.push(
                `**Wants:** ${goal.endsWith(".") ? goal : goal + "."}`,
              );
            if (secret) details.push(`**Secret:** ${secret}`);
            return [name ? `**${name}**` : "", details.join(" — ")]
              .filter(Boolean)
              .join(" — ");
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
        type: "event",
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
