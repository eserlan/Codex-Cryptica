import { formatPublicAnchoredScenarioCue } from "./public-scenario-diversity";
import type { PublicGeneratorOutput } from "./public-generator-types";
import { parseFencedJson } from "./llm-response-utils";
import { factionConfig } from "./public-faction-constants";
import { defaultRng, pickFrom, type Rng } from "./random-utils";

export const puzzleConfig = {
  // Keep Puzzle aligned with the canonical theme vocabulary used across CC.
  genres: factionConfig.themes,
  purposes: [
    "Sealed door",
    "Retrieve object",
    "Disable device",
    "Destroy relic or organ",
    "Escape",
    "Cross obstacle",
    "Reveal secret",
    "Complete ritual",
    "Survive trap",
  ],
  complexities: ["Simple", "Moderate", "Elaborate"],
  styles: [
    "Environmental",
    "Magical",
    "Mechanical",
    "Logic",
    "Spatial",
    "Pattern",
    "Social",
    "Sensory",
    "Combat-puzzle",
  ],
  participationStyles: [
    "Any character can contribute",
    "Spotlight one character",
    "Spotlight 2–3 characters",
    "Whole-party cooperation",
    "Sequential individual challenges",
  ],
  failurePressures: [
    "None",
    "Complication",
    "Time pressure",
    "Danger",
    "Combat",
  ],
  systems: [
    "System-neutral",
    "D&D 5e",
    "Pathfinder 2e",
    "Tales of the Valiant",
  ],
} as const;

/** Automated generation starts system-neutral; only a user may tailor it. */
export const DEFAULT_PUZZLE_SYSTEM = "System-neutral";

const purposeActions: Record<(typeof puzzleConfig.purposes)[number], string> = {
  "Sealed door": "open the sealed door",
  "Retrieve object": "retrieve the object",
  "Disable device": "disable the device",
  "Destroy relic or organ": "destroy the relic or organ",
  Escape: "escape the danger",
  "Cross obstacle": "cross the obstacle",
  "Reveal secret": "reveal the secret",
  "Complete ritual": "complete the ritual",
  "Survive trap": "survive the trap",
};

export interface PuzzleGeneratorOptions {
  genre?: string;
  purpose?: string;
  complexity?: string;
  style?: string;
  partyLevel?: string;
  playerCount?: string;
  capabilities?: string;
  participationStyle?: string;
  failurePressure?: string;
  system?: string;
  downstreamConsequence?: string;
  campaignContext?: string;
}

export interface ResolvedPuzzleOptions {
  genre: string;
  purpose: string;
  complexity: string;
  style: string;
  partyLevel: string;
  playerCount: string;
  capabilities: string;
  participationStyle: string;
  failurePressure: string;
  system: string;
  downstreamConsequence: string;
  campaignContext: string;
}

export interface PuzzlePrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedPuzzleOptions;
}

/** Matches the form's own-option input limit. */
const MAX_CUSTOM_OPTION_LENGTH = 120;

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
/**
 * The form lets a GM type their own option for every select, so a non-empty
 * custom value is kept (bounded to the form's limit) instead of being
 * silently replaced by the first built-in choice.
 */
const pickOption = (value: string | undefined, options: readonly string[]) =>
  text(value).slice(0, MAX_CUSTOM_OPTION_LENGTH) || options[0];

export function resolvePuzzle(
  options: PuzzleGeneratorOptions = {},
): ResolvedPuzzleOptions {
  return {
    genre: text(options.genre) || puzzleConfig.genres[0],
    purpose: pickOption(options.purpose, puzzleConfig.purposes),
    complexity: pickOption(options.complexity, puzzleConfig.complexities),
    style: pickOption(options.style, puzzleConfig.styles),
    partyLevel: text(options.partyLevel),
    playerCount: text(options.playerCount),
    capabilities: text(options.capabilities),
    participationStyle: pickOption(
      options.participationStyle,
      puzzleConfig.participationStyles,
    ),
    failurePressure: pickOption(
      options.failurePressure,
      puzzleConfig.failurePressures,
    ),
    system: pickOption(options.system, [DEFAULT_PUZZLE_SYSTEM]),
    downstreamConsequence: text(options.downstreamConsequence),
    campaignContext: text(options.campaignContext),
  };
}

type PuzzleStyle = (typeof puzzleConfig.styles)[number];

/**
 * What physically or socially blocks the party, keyed by puzzle style so a
 * Social puzzle is never a "locked mechanism". Every phrase starts with a
 * consonant sound because the setup sentence uses "a".
 */
const focusByStyle: Record<PuzzleStyle, readonly string[]> = {
  Environmental: [
    "slowly flooding chamber",
    "half-collapsed bridge",
    "passage choked with shifting debris",
  ],
  Magical: [
    "fading ward",
    "circle of humming sigils",
    "sealed glyph that answers to words",
  ],
  Mechanical: [
    "locked mechanism",
    "counterweighted gate",
    "panel of interlocking gears",
  ],
  Logic: [
    "wall of contradictory inscriptions",
    "lock that accepts one true statement",
    "row of numbered tiles with a missing rule",
  ],
  Spatial: [
    "shifting chamber",
    "maze of sliding panels",
    "room whose floor tilts with every step",
  ],
  Pattern: [
    "mosaic of repeating symbols",
    "ring of rotating dials",
    "floor of coloured tiles",
  ],
  Social: [
    "suspicious gatekeeper",
    "pair of guards who disagree about the rules",
    "proud keeper who demands proof of worth",
  ],
  Sensory: [
    "corridor of echoing tones",
    "darkened room of textured walls",
    "chamber where scents mark the safe path",
  ],
  "Combat-puzzle": [
    "guardian that shrugs off direct attacks",
    "pair of linked sentries that shield each other",
    "sentinel powered by a device across the room",
  ],
};
const customFocus = [
  "puzzling obstacle",
  "guarded threshold",
  "strange device",
] as const;

/** How many linked actions the GM-only solution needs, by complexity. */
const linkedActionsByComplexity: Record<string, string> = {
  Simple: "two",
  Moderate: "three",
  Elaborate: "four",
};

const participationNotes: Record<string, string> = {
  "Any character can contribute":
    "Keep every component open to any character, so nobody waits for a specialist.",
  "Spotlight one character":
    "Build one component around a single character's background or ability, and let the rest of the party support that moment.",
  [puzzleConfig.participationStyles[2]]:
    "Split the key components between two or three characters, so each has a turn in the spotlight.",
  "Whole-party cooperation":
    "Make the components act at the same moment, so the whole party must coordinate to succeed.",
  "Sequential individual challenges":
    "Run the components one after another, giving a different character the lead at each stage.",
};

const failurePressureActions: Record<string, string> = {
  Complication: "add a complication",
  "Time pressure": "advance a visible clock",
  Danger: "expose the party to harm",
  Combat: "wake a guardian or bring in hostile reinforcements",
};

/** Lower-cases a custom label's first letter while keeping acronyms intact. */
const lowerFirst = (value: string) =>
  /^[A-Z][A-Z]/.test(value)
    ? value
    : value.charAt(0).toLowerCase() + value.slice(1);

function describeGoal(purpose: string): {
  clause: string;
  partyClause: string;
} {
  const action = purposeActions[purpose as keyof typeof purposeActions];
  if (action)
    return {
      clause: `their attempt to ${action}`,
      partyClause: `the party's attempt to ${action}`,
    };
  const goal = lowerFirst(purpose);
  return {
    clause: `their goal: ${goal}`,
    partyClause: `the party's goal: ${goal}`,
  };
}

function formatCampaignContext(campaignContext: string): string {
  return campaignContext ? `\n\n### Campaign Context\n${campaignContext}` : "";
}

function formatAtAGlance(resolved: ResolvedPuzzleOptions): string {
  const tailored = resolved.system !== DEFAULT_PUZZLE_SYSTEM;
  return [
    "### At a Glance",
    `- **Genre:** ${resolved.genre}`,
    `- **Purpose:** ${resolved.purpose}`,
    `- **Style:** ${resolved.style}`,
    `- **Complexity:** ${resolved.complexity}`,
    `- **Failure pressure:** ${resolved.failurePressure}`,
    `- **System:** ${resolved.system}`,
    tailored && resolved.partyLevel
      ? `- **Party level:** ${resolved.partyLevel}`
      : "",
    tailored && resolved.playerCount
      ? `- **Players:** ${resolved.playerCount}`
      : "",
    `- **Participation:** ${resolved.participationStyle}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function render(
  resolved: ResolvedPuzzleOptions,
  title: string,
  content: string,
  lore = "",
  summary = `A ${resolved.complexity.toLowerCase()} ${resolved.style.toLowerCase()} encounter for ${resolved.purpose.toLowerCase()}, with visible clues for players and practical GM guidance for flexible, fail-forward play.`,
): PublicGeneratorOutput {
  return {
    type: "note",
    kind: "puzzle",
    title,
    summary,
    content,
    lore: lore || formatAtAGlance(resolved),
    labels: [
      "puzzle",
      "puzzle-generator",
      resolved.style.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      resolved.genre.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    ],
    status: "active",
  };
}

export function generatePuzzleLocal(
  options: PuzzleGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolvePuzzle(options);
  const focus = pickFrom(
    focusByStyle[resolved.style as PuzzleStyle] ?? customFocus,
    rng,
  );
  const goal = describeGoal(resolved.purpose);
  const linkedActions =
    linkedActionsByComplexity[resolved.complexity] ?? "three";
  const capabilityNote =
    resolved.capabilities ||
    "investigation, physical action, social insight, and creative magic or equipment";
  const participationNote =
    participationNotes[resolved.participationStyle] ??
    `Shape the components around the chosen participation style: ${lowerFirst(resolved.participationStyle)}.`;
  const pressureAction =
    failurePressureActions[resolved.failurePressure] ??
    `bring in the chosen pressure (${lowerFirst(resolved.failurePressure)})`;
  const content = [
    "## Player-Facing Setup",
    `The party finds a ${focus} blocking ${goal.clause}. The scene's details fit the ${resolved.genre} setting: the obstacle exists to test intent, not merely to punish failure.`,
    "",
    "## Clues",
    "- **Obvious clue:** Put one sensory detail in plain view that points to the pattern.",
    "- **Discoverable clue:** Interaction, conversation, or an appropriate check reveals why the obstacle is here.",
    "- **Emergency clue:** After meaningful effort, show the next safe action through a visible change in the scene.",
    "",
    "## Character Spotlight Opportunities",
    `Invite contributions from ${capabilityNote}. Frame each as a useful angle, not a requirement: a careful observer reads the pattern, a forceful character changes its physical state at a cost, and a magical or technical character can test its energy or controls.`,
    participationNote,
    "",
    "## Alternate Solutions",
    "- Bypass one component while accepting a minor complication.",
    "- Negotiate with, trick, or repurpose whatever guards the obstacle.",
    "- Use an improvised resource or an original interpretation of the fiction to create a new route forward.",
    "",
    "## Failure & Escalation",
    resolved.failurePressure === "None"
      ? "Failed attempts provide clear feedback without adding pressure, so the puzzle remains a safe point for experimentation."
      : `On a failed attempt, ${pressureAction} rather than ending the scene: reveal new information, change the situation, and let the party choose how to proceed.`,
    "",
    "## Running the Puzzle",
    "Describe the visible parts and the first clue freely. Let checks add context or reduce risk, never hide the only path behind a roll. Ask what each player does before offering a hint, then reward experiments with concrete feedback.",
    "",
    "## Scaling",
    "Simplify by needing one fewer action or offering the emergency clue earlier. Increase complexity by adding a clock, a second interacting component, or a consequence that changes the next encounter.",
    resolved.downstreamConsequence
      ? `\n## Downstream Consequences\n${resolved.downstreamConsequence}`
      : "",
  ].join("\n");
  const lore = [
    formatAtAGlance(resolved),
    "",
    "### GM-Only Solution",
    `The ${lowerFirst(resolved.style)} challenge responds to a pattern of ${linkedActions} linked actions. Any credible approach that identifies, alters, bypasses, or reinterprets the pattern advances the puzzle; no class, spell, skill, or single answer is required.`,
    "",
    "### Escalating Hints",
    "1. Repeat the obvious clue in a new sensory form.",
    "2. Point out the component that changed after the party's last action.",
    "3. State the puzzle's immediate fictional goal without naming a solution.",
  ].join("\n");
  return render(
    resolved,
    `${resolved.style} Trial: ${resolved.purpose}`,
    content,
    lore + formatCampaignContext(resolved.campaignContext),
    `A ${focus} blocks ${goal.partyClause}. Visible ${resolved.genre} details show how to get past it, while a wrong approach changes the situation instead of ending the encounter.`,
  );
}

export function buildPuzzlePrompt(
  options: PuzzleGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): PuzzlePrompt {
  const resolved = resolvePuzzle(options);
  const systemInstruction = `You are an expert tabletop RPG encounter-puzzle designer. Create a runnable ${resolved.genre} puzzle. It must be system-neutral unless tailoring is requested. Never make progress depend on one class, spell, skill, ability, check, or intended answer. Build multiple viable approaches, fiction-first clues, creative solutions, and fail-forward escalation. Respect the genre's era, technology, institutions, and vocabulary; do not introduce modern concepts unless the selected genre supports them. Return only valid JSON.`;
  const details = [
    `Genre: ${resolved.genre}`,
    `Purpose: ${resolved.purpose}`,
    `Complexity: ${resolved.complexity}`,
    `Puzzle style: ${resolved.style}`,
    `Participation style: ${resolved.participationStyle}`,
    `Capabilities to make useful without gating: ${resolved.capabilities || "None supplied"}`,
    `Failure pressure: ${resolved.failurePressure}`,
    `System tailoring: ${resolved.system}`,
    resolved.system !== DEFAULT_PUZZLE_SYSTEM && resolved.partyLevel
      ? `Party level / competence (system-specific only): ${resolved.partyLevel}`
      : "",
    resolved.system !== DEFAULT_PUZZLE_SYSTEM && resolved.playerCount
      ? `Player count (system-specific only): ${resolved.playerCount}`
      : "",
    resolved.downstreamConsequence &&
      `Downstream consequence: ${resolved.downstreamConsequence}`,
    resolved.campaignContext && `Campaign context: ${resolved.campaignContext}`,
    sessionContext && `Session context: ${sessionContext}`,
    formatPublicAnchoredScenarioCue("puzzle", rng),
    "Avoid defaulting to lamps, lanterns, sconces, torches, or other light fixtures as the puzzle's central mechanism or recurring prop — this has become an overused default. Use one only if the genre or parameters above genuinely call for it. Draw the actual mechanism from a wide range of ingredients instead: sound, symbols, pressure plates, weight, movement, sequence, architecture, liquids, mirrors, reflections, inscriptions, temperature, timing, social cues, scent, or spatial relationships.",
    "Return JSON with title, summary, content, lore, and labels. Summary must be one or two vivid standalone sentences that name the actual setting or obstacle, the concrete mechanism or interaction, and the immediate stakes. Never describe the generator, complexity, document structure, player-facing material, GM guidance, or fail-forward play in the summary. Content is the main table-useful document and must use exactly these headings: ## Player-Facing Setup, ## Clues, ## Character Spotlight Opportunities, ## Alternate Solutions, ## Failure & Escalation, ## Running the Puzzle, and ## Scaling. Include ## Downstream Consequences in content when requested. Lore is the compact reference rail and must use exactly these headings: ### At a Glance, ### GM-Only Solution, and ### Escalating Hints. Keep the intended answer and progressive hints out of content; put the action-oriented guidance in content.",
  ]
    .filter(Boolean)
    .join("\n");
  return { systemInstruction, userMessage: details, resolved };
}

export function parsePuzzleResponse(
  rawText: string,
  resolved: ResolvedPuzzleOptions = resolvePuzzle(),
): PublicGeneratorOutput {
  const parsed = parseFencedJson<Record<string, unknown>>(rawText);
  const content = text(parsed.content);
  const contentHeadings = [
    "## Player-Facing Setup",
    "## Clues",
    "## Character Spotlight Opportunities",
    "## Alternate Solutions",
    "## Failure & Escalation",
    "## Running the Puzzle",
    "## Scaling",
  ];
  const lore = text(parsed.lore);
  const loreHeadings = [
    "### At a Glance",
    "### GM-Only Solution",
    "### Escalating Hints",
  ];
  if (
    !content ||
    !lore ||
    !contentHeadings.every((heading) => content.includes(heading)) ||
    !loreHeadings.every((heading) => lore.includes(heading))
  )
    throw new Error(
      "Puzzle response is missing required table-ready sections.",
    );
  return render(
    resolved,
    text(parsed.title) || `${resolved.style} Trial: ${resolved.purpose}`,
    content,
    lore,
    text(parsed.summary) || undefined,
  );
}
