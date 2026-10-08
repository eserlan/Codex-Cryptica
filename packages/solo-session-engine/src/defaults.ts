const MAX_SCENE = 80;

/** The last open map if it still exists, else the first map, else null. */
export function resolveDefaultMap(
  lastMapId: string | null,
  mapIds: readonly string[],
): string | null {
  if (lastMapId !== null && mapIds.includes(lastMapId)) return lastMapId;
  return mapIds[0] ?? null;
}

export function normaliseSceneName(
  input: string,
): { ok: true; name: string } | { ok: false } {
  const name = input.trim().slice(0, MAX_SCENE);
  return name.length === 0 ? { ok: false } : { ok: true, name };
}

/**
 * Empty input repeats the last roll. Returns null when there is nothing
 * to roll.
 */
export function resolveQuickRoll(
  input: string,
  lastRoll: string | null,
): string | null {
  const typed = input.trim();
  if (typed.length > 0) return typed;
  return lastRoll;
}

const CATEGORY_BY_GENERATOR: Record<string, string> = {
  npc: "character",
  rumour: "note",
  encounter: "event",
};

/**
 * The vault category a saved result should suggest. Falls back to "note" when
 * the suggested category is not one the vault has, so a save never fails on
 * the suggestion alone.
 */
export function suggestCategory(
  entryType: string,
  generatorId: string | null,
  categoryIds: readonly string[],
): string {
  const suggested =
    entryType === "generated-result" && generatorId
      ? (CATEGORY_BY_GENERATOR[generatorId] ?? "note")
      : "note";
  return categoryIds.includes(suggested) ? suggested : "note";
}

export type OracleShortcut =
  | "npc-reaction"
  | "complication"
  | "place-knowledge"
  | "what-next"
  | "interpret-answer";

const SHORTCUT_QUESTION: Record<OracleShortcut, string> = {
  "npc-reaction": "How does this NPC react?",
  complication: "Add a complication",
  "place-knowledge": "What is known about this place?",
  "interpret-answer": "What does this answer mean for the scene?",
  "what-next": "What happens next?",
};

const MAX_PROMPT = 1200;
const MAX_RECENT = 10;
const MAX_RECENT_CHARS = 120;

/** Joins names as "A", "A and B", or "A, B and C". */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Spec 174, FR-009: the player's own yes/no question and its answer, when interpreting. */
function answerLines(kind: OracleShortcut, context: PromptContext): string[] {
  const answer = context.answer?.trim();
  if (kind !== "interpret-answer" || !answer) return [];
  const asked = context.question?.trim();
  return [`Answer: ${answer}${asked ? ` to "${asked}"` : ""}.`];
}

/** The scene, place and party, on one line. Nothing when all three are empty. */
function contextLines(context: PromptContext): string[] {
  const facts: string[] = [];
  if (context.sceneName.trim())
    facts.push(`scene "${context.sceneName.trim()}"`);
  if (context.mapName?.trim()) facts.push(`place "${context.mapName.trim()}"`);
  if (context.partyNames.length > 0)
    facts.push(`party ${joinNames(context.partyNames)}`);
  return facts.length > 0 ? [`Context: ${facts.join(", ")}.`] : [];
}

/** The latest journal lines, trimmed to a short length each. */
function recentLines(recent: readonly string[]): string[] {
  return recent
    .slice(0, MAX_RECENT)
    .map((item) => item.replace(/\s+/g, " ").trim().slice(0, MAX_RECENT_CHARS))
    .filter((text) => text.length > 0)
    .map((text) => `Recent: ${text}`);
}

/**
 * Keeps whole lines only: a cut in the middle of a line would send a broken
 * sentence. The question line always fits, since it is far shorter.
 */
function fitWholeLines(lines: readonly string[]): string {
  const kept: string[] = [];
  let size = 0;
  for (const line of lines) {
    const next = size + (kept.length > 0 ? 1 : 0) + line.length;
    if (next > MAX_PROMPT) break;
    kept.push(line);
    size = next;
  }
  return kept.join("\n");
}

interface PromptContext {
  question?: string;
  answer?: string;
  sceneName: string;
  mapName: string | null;
  partyNames: readonly string[];
  recent: readonly string[];
}

/**
 * The text a shortcut puts in the Oracle's input (Solo Play Loop, FR-019). It
 * is only prefilled; the player edits it and sends it. The prompt never asks
 * the Oracle to run the game (FR-021).
 */
export function buildOracleShortcutPrompt(
  kind: OracleShortcut,
  context: PromptContext,
): string {
  return fitWholeLines([
    SHORTCUT_QUESTION[kind],
    ...answerLines(kind, context),
    ...contextLines(context),
    ...recentLines(context.recent),
  ]);
}
