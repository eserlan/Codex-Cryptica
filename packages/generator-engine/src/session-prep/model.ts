export const SESSION_PREP_STEPS = [
  "start",
  "pressure",
  "people",
  "places",
  "information",
  "complications",
  "consequences",
  "reserve",
] as const;

export type SessionPrepStep = (typeof SESSION_PREP_STEPS)[number];

/** Who wrote a prep item; AI never overwrites "gm" material. */
export type PrepSource = "gm" | "ai";

export interface PrepPerson {
  id: string;
  name: string;
  wants: string;
  doesNext: string;
  source: PrepSource;
}

export interface PrepPlace {
  id: string;
  name: string;
  detail: string;
  source: PrepSource;
}

export interface PrepClue {
  id: string;
  fact: string;
  routes: string[];
  /** Progress depends on it, so it needs more than one way to be found. */
  critical: boolean;
  source: PrepSource;
}

export interface PrepNote {
  id: string;
  text: string;
  source: PrepSource;
}

export interface PrepConsequences {
  success: string;
  failure: string;
  delay: string;
  avoidance: string;
}

export const CONSEQUENCE_KEYS = [
  "success",
  "failure",
  "delay",
  "avoidance",
] as const satisfies readonly (keyof PrepConsequences)[];

/**
 * Stable item ids and a schema version keep room for post-session
 * reconciliation (marking items happened, changed or unresolved).
 */
export interface SessionPrep {
  version: 1;
  seed: string;
  start: string;
  pressure: string;
  people: PrepPerson[];
  places: PrepPlace[];
  information: PrepClue[];
  complications: PrepNote[];
  consequences: PrepConsequences;
  reserve: PrepNote[];
}

export type PrepPersonDraft = Omit<PrepPerson, "id" | "source">;
export type PrepPlaceDraft = Omit<PrepPlace, "id" | "source">;
export type PrepClueDraft = Omit<PrepClue, "id" | "source">;
export type PrepNoteDraft = Omit<PrepNote, "id" | "source">;

export interface SessionPrepDraft {
  start?: string;
  pressure?: string;
  people?: PrepPersonDraft[];
  places?: PrepPlaceDraft[];
  information?: PrepClueDraft[];
  complications?: PrepNoteDraft[];
  consequences?: PrepConsequences;
  reserve?: PrepNoteDraft[];
}

export type IdFactory = () => string;

export const defaultIdFactory: IdFactory = () => crypto.randomUUID();

export function createEmptySessionPrep(seed = ""): SessionPrep {
  return {
    version: 1,
    seed: seed.trim(),
    start: "",
    pressure: "",
    people: [],
    places: [],
    information: [],
    complications: [],
    consequences: { success: "", failure: "", delay: "", avoidance: "" },
    reserve: [],
  };
}

const filled = (value: string) => value.trim().length > 0;

export function isSessionPrepStepEmpty(
  prep: SessionPrep,
  step: SessionPrepStep,
): boolean {
  switch (step) {
    case "start":
    case "pressure":
      return !filled(prep[step]);
    case "people":
      return !prep.people.some((person) => filled(person.name));
    case "places":
      return !prep.places.some((place) => filled(place.name));
    case "information":
      return !prep.information.some((clue) => filled(clue.fact));
    case "complications":
    case "reserve":
      return !prep[step].some((note) => filled(note.text));
    case "consequences":
      return !CONSEQUENCE_KEYS.some((key) => filled(prep.consequences[key]));
  }
}

export function emptySessionPrepSteps(prep: SessionPrep): SessionPrepStep[] {
  return SESSION_PREP_STEPS.filter((step) =>
    isSessionPrepStepEmpty(prep, step),
  );
}

export function hasSessionPrepContent(prep: SessionPrep): boolean {
  return (
    filled(prep.seed) ||
    emptySessionPrepSteps(prep).length < SESSION_PREP_STEPS.length
  );
}

/** Critical facts that currently have fewer than two discovery routes. */
export function findSingleRouteClues(prep: SessionPrep): PrepClue[] {
  return prep.information.filter(
    (clue) =>
      clue.critical &&
      filled(clue.fact) &&
      clue.routes.filter(filled).length < 2,
  );
}

const TEXT_STEPS = ["start", "pressure"] as const;
const LIST_STEPS = [
  "people",
  "places",
  "information",
  "complications",
  "reserve",
] as const;
type ListStep = (typeof LIST_STEPS)[number];

function isListStep(step: SessionPrepStep): step is ListStep {
  return (LIST_STEPS as readonly string[]).includes(step);
}

function asAiItem<T extends object>(item: T, ids: IdFactory) {
  return { ...item, id: ids(), source: "ai" as const };
}

function hasDraftContent(item: object): boolean {
  return Object.entries(item).some(([key, value]) => {
    if (key === "id" || key === "source") return false;
    if (typeof value === "string") return filled(value);
    return (
      Array.isArray(value) &&
      value.some((entry) => typeof entry === "string" && filled(entry))
    );
  });
}

function fillBlankConsequences(
  target: PrepConsequences,
  source: PrepConsequences | undefined,
): void {
  if (!source) return;
  for (const key of CONSEQUENCE_KEYS) {
    if (!filled(target[key]) && source[key]) target[key] = source[key];
  }
}

/** Fills empty steps from an AI draft; GM-written material always wins. */
export function mergeDraftIntoPrep(
  prep: SessionPrep,
  draft: SessionPrepDraft,
  ids: IdFactory = defaultIdFactory,
): SessionPrep {
  const next = structuredClone(prep);
  const empty = new Set(emptySessionPrepSteps(prep));

  for (const step of TEXT_STEPS) {
    const value = draft[step];
    if (empty.has(step) && value) next[step] = value;
  }
  for (const step of LIST_STEPS) {
    const items = draft[step];
    if (empty.has(step) && items?.length) {
      const existing = (next[step] as object[]).filter(hasDraftContent);
      (next[step] as object[]) = [
        ...existing,
        ...items.map((item) => asAiItem(item, ids)),
      ];
    }
  }
  fillBlankConsequences(next.consequences, draft.consequences);
  return next;
}

/** Empties one step so AI can redraft it; the rest of the prep is untouched. */
export function clearSessionPrepStep(
  prep: SessionPrep,
  step: SessionPrepStep,
): SessionPrep {
  const next = structuredClone(prep);
  if (step === "start" || step === "pressure") next[step] = "";
  else if (step === "consequences") {
    next.consequences = createEmptySessionPrep().consequences;
  } else next[step] = [];
  return next;
}

export type SessionPrepSuggestion =
  | { step: "start" | "pressure"; options: string[] }
  | { step: "people"; options: PrepPersonDraft[] }
  | { step: "places"; options: PrepPlaceDraft[] }
  | { step: "information"; options: PrepClueDraft[] }
  | { step: "complications" | "reserve"; options: PrepNoteDraft[] }
  | { step: "consequences"; options: PrepConsequences[] };

/**
 * Applies the one option the GM picked. Text steps are replaced because the
 * GM chose to; list steps gain an AI item; consequences fill only blanks.
 */
export function applySuggestionOption(
  prep: SessionPrep,
  suggestion: SessionPrepSuggestion,
  index: number,
  ids: IdFactory = defaultIdFactory,
): SessionPrep {
  const option = suggestion.options[index];
  if (option === undefined) return prep;
  const next = structuredClone(prep);
  const { step } = suggestion;

  if (step === "start" || step === "pressure") {
    next[step] = option as string;
  } else if (step === "consequences") {
    fillBlankConsequences(next.consequences, option as PrepConsequences);
  } else if (isListStep(step)) {
    (next[step] as object[]).push(asAiItem(option as object, ids));
  }
  return next;
}

export function addRoutesToClue(
  prep: SessionPrep,
  clueId: string,
  routes: string[],
): SessionPrep {
  const index = prep.information.findIndex((clue) => clue.id === clueId);
  if (index === -1) return prep;
  const next = structuredClone(prep);
  const clue = next.information[index];
  const known = new Set(clue.routes.map((route) => route.trim().toLowerCase()));
  for (const route of routes) {
    const trimmed = route.trim();
    if (!trimmed || known.has(trimmed.toLowerCase())) continue;
    known.add(trimmed.toLowerCase());
    clue.routes.push(trimmed);
  }
  return next;
}

const TITLE_LIMIT = 80;
const TITLE_PREFIX = "Session prep: ";

export function sessionPrepTitle(prep: SessionPrep): string {
  const basis = (filled(prep.seed) ? prep.seed : prep.start)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
  if (!basis) return "Session prep";
  const room = TITLE_LIMIT - TITLE_PREFIX.length;
  if (basis.length <= room) return `${TITLE_PREFIX}${basis}`;
  const cut = basis.slice(0, room - 1).replace(/\s+\S*$/, "");
  return `${TITLE_PREFIX}${cut}…`;
}
