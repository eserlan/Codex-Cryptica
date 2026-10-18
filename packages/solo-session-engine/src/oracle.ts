/**
 * The solo yes/no oracle and random events (spec 174, US1 and US2).
 * Dice only: no AI, no network. Wording and odds are our own (FR-008).
 */
import { FOCI, ACTIONS, type Focus } from "./event-tables";

export type Likelihood =
  "very_unlikely" | "unlikely" | "even" | "likely" | "very_likely";
export const LIKELIHOODS: readonly Likelihood[] = [
  "very_unlikely",
  "unlikely",
  "even",
  "likely",
  "very_likely",
];

export type Answer =
  "Yes, and" | "Yes" | "Yes, but" | "No, but" | "No" | "No, and";

/** Upper bounds (inclusive) on a d100 roll for each answer, per likelihood. */
const LADDERS: Record<Likelihood, readonly (readonly [number, Answer])[]> = {
  very_likely: [
    [25, "Yes, and"],
    [75, "Yes"],
    [85, "Yes, but"],
    [93, "No, but"],
    [98, "No"],
    [100, "No, and"],
  ],
  likely: [
    [15, "Yes, and"],
    [65, "Yes"],
    [80, "Yes, but"],
    [90, "No, but"],
    [97, "No"],
    [100, "No, and"],
  ],
  even: [
    [10, "Yes, and"],
    [45, "Yes"],
    [55, "Yes, but"],
    [65, "No, but"],
    [90, "No"],
    [100, "No, and"],
  ],
  unlikely: [
    [3, "Yes, and"],
    [10, "Yes"],
    [20, "Yes, but"],
    [35, "No, but"],
    [85, "No"],
    [100, "No, and"],
  ],
  very_unlikely: [
    [2, "Yes, and"],
    [8, "Yes"],
    [12, "Yes, but"],
    [22, "No, but"],
    [90, "No"],
    [100, "No, and"],
  ],
};

export const QUESTION_LIMIT = 200;
export const TENSION_MIN = 1;
export const TENSION_MAX = 9;
export const TENSION_DEFAULT = 5;

/** A d100 roll, 1 to 100, from a random source in [0, 1). */
export function rollD100(rng: () => number): number {
  return Math.min(100, Math.floor(rng() * 100) + 1);
}

/** The answer for a roll at a likelihood. */
export function answerFor(likelihood: Likelihood, roll: number): Answer {
  for (const [upTo, answer] of LADDERS[likelihood]) {
    if (roll <= upTo) return answer;
  }
  return "No, and";
}

/** Whether a random event follows an answer: the event roll is at most twice the tension (FR-012). */
export function eventHappens(eventRoll: number, tension: number): boolean {
  return eventRoll <= 2 * clampTension(tension);
}

export function clampTension(value: number): number {
  if (!Number.isFinite(value)) return TENSION_DEFAULT;
  return Math.min(TENSION_MAX, Math.max(TENSION_MIN, Math.round(value)));
}

/** Context a random event can refer to. */
export interface EventContext {
  openThreads: readonly { id: string; title: string }[];
  partyNames: readonly string[];
  placeName: string | null;
}

export interface RandomEvent {
  focus: Focus["id"];
  action: string;
  subject: {
    kind: "thread" | "party" | "place" | "newcomer";
    label: string;
    threadId?: string;
  };
  text: string;
}

const pick = <T>(items: readonly T[], rng: () => number): T =>
  items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

/**
 * A random event: a focus, an action and a subject, written as one sentence.
 * A focus that needs a thread, a party member or a place falls back in a fixed
 * order (thread, party, place, someone new) when none is available, so an event
 * never names a closed thread or an empty party (FR-015).
 */
export function rollRandomEvent(
  context: EventContext,
  rng: () => number,
): RandomEvent {
  const focus = pick(FOCI, rng);
  const action = pick(ACTIONS, rng);
  const subject = resolveSubject(focus, context, rng);
  return {
    focus: focus.id,
    action,
    subject,
    text: `${focus.label}: ${action} ${subject.label}.`,
  };
}

function resolveSubject(
  focus: Focus,
  context: EventContext,
  rng: () => number,
): RandomEvent["subject"] {
  const thread = (): RandomEvent["subject"] | null => {
    if (context.openThreads.length === 0) return null;
    const chosen = pick(context.openThreads, rng);
    return { kind: "thread", label: chosen.title, threadId: chosen.id };
  };
  const party = (): RandomEvent["subject"] | null => {
    if (context.partyNames.length === 0) return null;
    return { kind: "party", label: pick(context.partyNames, rng) };
  };
  const place = (): RandomEvent["subject"] | null =>
    context.placeName ? { kind: "place", label: context.placeName } : null;
  const newcomer = (): RandomEvent["subject"] => ({
    kind: "newcomer",
    label: "someone new",
  });

  const order: Record<
    Focus["subject"],
    Array<() => RandomEvent["subject"] | null>
  > = {
    thread: [thread, party, place],
    party: [party, place],
    place: [place],
    newcomer: [],
  };
  for (const attempt of order[focus.subject]) {
    const found = attempt();
    if (found) return found;
  }
  return newcomer();
}

export interface OracleAnswer {
  question: string;
  likelihood: Likelihood;
  roll: number;
  answer: Answer;
  eventRoll: number;
  event: RandomEvent | null;
}

/**
 * Asks the dice a yes/no question. The question is optional and trimmed to 200
 * characters. Tension changes how often an event follows, not the answer.
 */
export function askOracle(
  input: {
    question: string;
    likelihood: Likelihood;
    tension: number;
    context: EventContext;
  },
  rng: () => number,
): OracleAnswer {
  const roll = rollD100(rng);
  const eventRoll = rollD100(rng);
  const answer = answerFor(input.likelihood, roll);
  const event = eventHappens(eventRoll, input.tension)
    ? rollRandomEvent(input.context, rng)
    : null;
  return {
    question: input.question.trim().slice(0, QUESTION_LIMIT),
    likelihood: input.likelihood,
    roll,
    answer,
    eventRoll,
    event,
  };
}
