/**
 * Types and shape validation for the Idea Developer (#3228).
 *
 * The tool develops a user's own RPG idea into a structured "development" and
 * continues it across turns. Everything here is UI-free and stateless; the web
 * app holds the conversation and talks to the model.
 *
 * Validation is hand-written, like the other public generators, so this package
 * does not take a new dependency for it.
 */

import type { ModeId } from "./modes";

export const TURN_KINDS = [
  "idea",
  "answer-questions",
  "change-part",
  "switch-mode",
] as const;
export type TurnKind = (typeof TURN_KINDS)[number];

export type TurnStatus = "pending" | "done" | "failed" | "cancelled";

export const PEOPLE_WHO_CARE_MIN = 2;
export const PEOPLE_WHO_CARE_MAX = 4;
export const CREATOR_QUESTIONS_MIN = 2;
export const CREATOR_QUESTIONS_MAX = 4;
export const PLAYER_DIRECTIONS_MIN = 2;
export const GENERATOR_SUGGESTIONS_MIN = 2;
export const GENERATOR_SUGGESTIONS_MAX = 5;

/** Longest idea, or later turn text, accepted in characters. */
export const MAX_IDEA_LENGTH = 4000;
/** Completed turns allowed in one conversation. */
export const MAX_CONVERSATION_TURNS = 8;

export interface PersonWhoCares {
  name: string;
  role: string;
  wants: string;
  conflictsWith: string;
}

export interface PlayerDirection {
  title: string;
  description: string;
}

export interface GeneratorSuggestion {
  generatorKey: string;
  reason: string;
}

/** The structured result of one turn. The same shape for every mode and turn. */
export interface Development {
  mode: ModeId;
  /** One line; present after the first turn only. */
  whatChanged?: string;
  alreadyInteresting: string;
  centralQuestion: string;
  makeItMove: string;
  peopleWhoCare: PersonWhoCares[];
  playerDirections: PlayerDirection[];
  consequences: string;
  creatorQuestions: string[];
  generatorSuggestions: GeneratorSuggestion[];
}

export interface Turn {
  kind: TurnKind;
  mode: ModeId;
  /** The user's input for the turn. Empty is allowed only for `switch-mode`. */
  text: string;
  status: TurnStatus;
}

export interface Conversation {
  ideaText: string;
  turns: Turn[];
  /** The provider's reference for continuing the conversation. */
  previousInteractionId: string | null;
  latest?: Development;
  hubDraftId?: string;
}

export type ShapeResult =
  { ok: true; value: Development } | { ok: false; reason: string };

export interface ShapeOptions {
  /** Zero for the opening turn. Later turns must carry `whatChanged`. */
  turnIndex: number;
  /** The mode in force for the turn; defaults to "develop". */
  mode?: ModeId;
}

type Read<T> = { ok: true; value: T } | { ok: false; reason: string };

/** A non-empty string, or a list of strings joined into one (models sometimes send a list). */
function text(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const parts = value
      .filter((part): part is string => typeof part === "string")
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join("; ") : null;
  }
  return null;
}

function bad(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function good<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

interface TextSections {
  alreadyInteresting: string;
  centralQuestion: string;
  makeItMove: string;
  consequences: string;
}

const TEXT_SECTIONS = [
  "alreadyInteresting",
  "centralQuestion",
  "makeItMove",
  "consequences",
] as const;

function readTextSections(obj: Record<string, unknown>): Read<TextSections> {
  const found: Partial<TextSections> = {};
  for (const key of TEXT_SECTIONS) {
    const value = text(obj[key]);
    if (!value) return bad(`Missing ${key}.`);
    found[key] = value;
  }
  return good(found as TextSections);
}

function readPerson(entry: unknown): PersonWhoCares | null {
  const p = asRecord(entry);
  const name = text(p.name);
  const role = text(p.role);
  const wants = text(p.wants);
  const conflictsWith = text(p.conflictsWith);
  return name && role && wants && conflictsWith
    ? { name, role, wants, conflictsWith }
    : null;
}

/** Keeps the usable people; a model that adds a fifth is trimmed, not rejected. */
function readPeople(raw: unknown): Read<PersonWhoCares[]> {
  const people = asList(raw)
    .map(readPerson)
    .filter((person): person is PersonWhoCares => person !== null);
  if (people.length < PEOPLE_WHO_CARE_MIN) {
    return bad(
      `peopleWhoCare needs ${PEOPLE_WHO_CARE_MIN} to ${PEOPLE_WHO_CARE_MAX} entries.`,
    );
  }
  return good(people.slice(0, PEOPLE_WHO_CARE_MAX));
}

function readDirection(entry: unknown): PlayerDirection | null {
  const d = asRecord(entry);
  const title = text(d.title);
  const description = text(d.description);
  return title && description ? { title, description } : null;
}

/** Drops unusable and repeated directions; at least two must remain. */
function readDirections(raw: unknown): Read<PlayerDirection[]> {
  const seen = new Set<string>();
  const directions = asList(raw)
    .map(readDirection)
    .filter((direction): direction is PlayerDirection => {
      if (!direction) return false;
      const key = direction.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (directions.length < PLAYER_DIRECTIONS_MIN) {
    return bad(`playerDirections needs at least ${PLAYER_DIRECTIONS_MIN}.`);
  }
  return good(directions);
}

function readQuestions(raw: unknown): Read<string[]> {
  const questions = asList(raw)
    .map(text)
    .filter((question): question is string => question !== null);
  if (questions.length < CREATOR_QUESTIONS_MIN) {
    return bad(
      `creatorQuestions needs ${CREATOR_QUESTIONS_MIN} to ${CREATOR_QUESTIONS_MAX} entries.`,
    );
  }
  return good(questions.slice(0, CREATOR_QUESTIONS_MAX));
}

function readSuggestions(raw: unknown): GeneratorSuggestion[] {
  return asList(raw).flatMap((entry) => {
    const s = asRecord(entry);
    const generatorKey = text(s.generatorKey);
    const reason = text(s.reason);
    return generatorKey && reason ? [{ generatorKey, reason }] : [];
  });
}

/** Later turns need a what-changed line; the first turn ignores one. */
function readWhatChanged(
  obj: Record<string, unknown>,
  turnIndex: number,
): Read<string | undefined> {
  if (turnIndex <= 0) return good(undefined);
  const changed = text(obj.whatChanged);
  return changed ? good(changed) : bad("Later turns need a whatChanged line.");
}

/**
 * Checks the countable rules from the spec: every section present and
 * non-empty, 2–4 people with a conflict, 2+ distinct player directions,
 * 2–4 creator questions, `whatChanged` on later turns only.
 *
 * Generator suggestions are passed through unfiltered here; `suggestions.ts`
 * drops anything not in the catalogue.
 */
export function validateDevelopmentShape(
  raw: unknown,
  options: ShapeOptions,
): ShapeResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return bad("The response was not an object.");
  }
  const obj = raw as Record<string, unknown>;

  const sections = readTextSections(obj);
  if (!sections.ok) return sections;
  const peopleWhoCare = readPeople(obj.peopleWhoCare);
  if (!peopleWhoCare.ok) return peopleWhoCare;
  const playerDirections = readDirections(obj.playerDirections);
  if (!playerDirections.ok) return playerDirections;
  const creatorQuestions = readQuestions(obj.creatorQuestions);
  if (!creatorQuestions.ok) return creatorQuestions;
  const whatChanged = readWhatChanged(obj, options.turnIndex);
  if (!whatChanged.ok) return whatChanged;

  return good({
    mode: options.mode ?? "develop",
    ...(whatChanged.value ? { whatChanged: whatChanged.value } : {}),
    ...sections.value,
    peopleWhoCare: peopleWhoCare.value,
    playerDirections: playerDirections.value,
    creatorQuestions: creatorQuestions.value,
    generatorSuggestions: readSuggestions(obj.generatorSuggestions),
  });
}
