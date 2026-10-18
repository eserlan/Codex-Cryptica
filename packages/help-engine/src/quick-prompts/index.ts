import type { HelpContext } from "../context";

/**
 * Tap-to-ask questions for an empty Cif conversation (#3616).
 *
 * Fixed text, never built from the vault. Each one is a question the help
 * already answers well on its screen: a test runs every prompt on its screen
 * and fails if its guide stops being found, so a prompt cannot go stale.
 */
export interface QuickPromptSet {
  /** Stable name, used in tests and reports. */
  id: string;
  matches: (ctx: HelpContext) => boolean;
  prompts: readonly string[];
}

/** No more than this many are shown at once. */
export const MAX_QUICK_PROMPTS = 3;

/**
 * First match wins, so the most specific screens come first: editing an
 * entity and its Connections tab are both "entity-detail".
 */
export const QUICK_PROMPT_SETS: readonly QuickPromptSet[] = [
  {
    id: "entity-editing",
    matches: (ctx) => ctx.area === "entity-detail" && ctx.mode === "edit",
    prompts: [
      "How do I save my changes?",
      "How do I cancel what I just typed?",
    ],
  },
  {
    id: "entity-connections",
    matches: (ctx) => ctx.area === "entity-detail" && ctx.tab === "connections",
    prompts: [
      "Where do I add a connection?",
      "How do I give a connection a label like rival?",
      "How do I generate entries related to this one?",
    ],
  },
  {
    id: "graph",
    matches: (ctx) => ctx.area === "graph",
    prompts: [
      "What is the graph for?",
      "How do I find an entry in the graph?",
      "How do I explore how my entries relate on the graph?",
    ],
  },
  {
    id: "canvas",
    matches: (ctx) => ctx.area === "canvas",
    prompts: [
      "How do I put a character on the canvas?",
      "How do I name the line between two cards?",
      "Can I make more than one canvas?",
    ],
  },
  {
    id: "map",
    matches: (ctx) => ctx.area === "map",
    prompts: [
      "How do I drop a pin on the map?",
      "How do I hide parts of the map from my players?",
      "How do I measure distance on the map?",
    ],
  },
  {
    id: "generators",
    matches: (ctx) => ctx.area === "generators",
    prompts: [
      "How do I generate a faction?",
      "Can I generate a city and keep it in my vault?",
      "Should I use a generator or the Oracle to make a new NPC?",
    ],
  },
  {
    id: "tables",
    matches: (ctx) => ctx.area === "tables",
    prompts: [
      "How do I roll on a random table?",
      "What is the difference between a table and a deck?",
    ],
  },
  {
    id: "import",
    matches: (ctx) => ctx.area === "import",
    prompts: [
      "What kinds of files can I import?",
      "Will importing overwrite entries I already have?",
      "How do I bring in my old notes?",
    ],
  },
  {
    id: "settings",
    matches: (ctx) => ctx.area === "settings",
    prompts: [
      "Where is the Export Backup button?",
      "How do I restore a backup?",
      "How do I change the theme?",
    ],
  },
];

/** The prompts for the screen described by `ctx`, or none if it has no verified set. */
export function quickPromptsFor(ctx: HelpContext): readonly string[] {
  const set = QUICK_PROMPT_SETS.find((candidate) => candidate.matches(ctx));
  return set ? set.prompts.slice(0, MAX_QUICK_PROMPTS) : [];
}
