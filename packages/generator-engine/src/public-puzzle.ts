import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { parseFencedJson } from "./llm-response-utils";
import { defaultRng, pickFrom, type Rng } from "./random-utils";

export const puzzleConfig = {
  genres: [
    "Fantasy",
    "Dark Fantasy",
    "Sci-Fi",
    "Cyberpunk",
    "Horror",
    "Steampunk",
    "Western",
    "Modern",
  ],
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

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const pickOption = (value: string | undefined, options: readonly string[]) =>
  value && options.includes(value) ? value : options[0];

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
    system: puzzleConfig.systems.includes(options.system as never)
      ? options.system!
      : DEFAULT_PUZZLE_SYSTEM,
    downstreamConsequence: text(options.downstreamConsequence),
    campaignContext: text(options.campaignContext),
  };
}

function render(
  resolved: ResolvedPuzzleOptions,
  title: string,
  content: string,
  lore = "",
): PublicGeneratorOutput {
  return {
    type: "note",
    kind: "puzzle",
    title,
    summary: `${resolved.complexity} ${resolved.style.toLowerCase()} puzzle for ${resolved.purpose.toLowerCase()}.`,
    content,
    lore:
      lore ||
      `### At a Glance\n- **Genre:** ${resolved.genre}\n- **Complexity:** ${resolved.complexity}\n- **System:** ${resolved.system}\n- **Participation:** ${resolved.participationStyle}`,
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
    ["a locked mechanism", "a fading ward", "a shifting chamber"],
    rng,
  );
  const capabilityNote =
    resolved.capabilities ||
    "investigation, physical action, social insight, and creative magic or equipment";
  const content = [
    "## Player-Facing Setup",
    `The party finds ${focus} blocking their attempt to ${resolved.purpose.toLowerCase()}. Its details make the ${resolved.genre} fiction clear: it was built to test intent, not merely punish failure.`,
    "",
    "## GM-Only Solution",
    `The ${resolved.style.toLowerCase()} challenge responds to a pattern of three linked actions. Any credible approach that identifies, alters, bypasses, or reinterprets the pattern advances the puzzle; no class, spell, skill, or single answer is required.`,
    "",
    "## Clues",
    "- **Obvious clue:** Put one sensory detail in plain view that points to the pattern.",
    "- **Discoverable clue:** Interaction, conversation, or an appropriate check reveals why the mechanism was built.",
    "- **Emergency clue:** After meaningful effort, show the next safe action through a visible change in the room.",
    "",
    "## Character Spotlight Opportunities",
    `Invite contributions from ${capabilityNote}. Frame each as a useful angle, not a requirement: a careful observer reads the pattern, a forceful character changes its physical state at a cost, and a magical or technical character can test its energy or controls.`,
    "",
    "## Alternate Solutions",
    "- Bypass one component while accepting a minor complication.",
    "- Negotiate with, trick, or repurpose the guardian mechanism.",
    "- Use an improvised resource or an original interpretation of the fiction to create a new route forward.",
    "",
    "## Failure & Escalation",
    resolved.failurePressure === "None"
      ? "Failed attempts provide clear feedback without adding pressure, so the puzzle remains a safe point for experimentation."
      : `On a failed attempt, apply ${resolved.failurePressure.toLowerCase()} rather than a dead end: reveal new information, change the situation, and let the party choose how to proceed.`,
    "",
    "## Escalating Hints",
    "1. Repeat the obvious clue in a new sensory form.",
    "2. Point out the component that changed after the party's last action.",
    "3. State the puzzle's immediate fictional goal without naming a solution.",
    "",
    "## Running the Puzzle",
    "Describe the visible parts and the first clue freely. Let checks add context or reduce risk, never hide the only path behind a roll. Ask what each player does before offering a hint, then reward experiments with concrete feedback.",
    "",
    "## Scaling",
    `Simplify by making two actions sufficient or offering the emergency clue earlier. Increase complexity by adding a clock, a second interacting component, or a consequence that changes the next encounter.`,
    resolved.downstreamConsequence
      ? `\n## Downstream Consequences\n${resolved.downstreamConsequence}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  return render(
    resolved,
    `${resolved.style} Trial: ${resolved.purpose}`,
    content,
  );
}

export function buildPuzzlePrompt(
  options: PuzzleGeneratorOptions = {},
  sessionContext = "",
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
    "Return JSON with title, summary, content, lore, and labels. Content must use these exact headings: ## Player-Facing Setup, ## GM-Only Solution, ## Clues, ## Character Spotlight Opportunities, ## Alternate Solutions, ## Failure & Escalation, ## Escalating Hints, ## Running the Puzzle, ## Scaling. Include three clue layers and three escalating hints. Include ## Downstream Consequences when requested.",
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
  const headings = [
    "## Player-Facing Setup",
    "## GM-Only Solution",
    "## Clues",
    "## Character Spotlight Opportunities",
    "## Alternate Solutions",
    "## Failure & Escalation",
    "## Escalating Hints",
    "## Running the Puzzle",
    "## Scaling",
  ];
  if (!content || !headings.every((heading) => content.includes(heading)))
    throw new Error(
      "Puzzle response is missing required table-ready sections.",
    );
  return render(
    resolved,
    text(parsed.title) || `${resolved.style} Trial: ${resolved.purpose}`,
    content,
    text(parsed.lore),
  );
}
