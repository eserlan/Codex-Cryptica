import type { AdventureSession, CommittedAdventureTurn } from "./types";

/** Consecutive unresolved exchanges required before targeted dialogue recovery. */
export const DIALOGUE_LOOP_TURN_LIMIT = 3;
const MAX_DIALOGUE_WINDOW = 6;

/**
 * Conservative, deterministic signal only. It deliberately favours missing a
 * loop over classifying a legitimate refusal or an ordinary chat as stuck.
 * No generated text, model calls or GM-only details are stored in the result.
 */
export interface DialogueLoopPacing {
  repeatedTurns: number;
  recoveryDue: boolean;
}

const STOP_WORDS = new Set(
  "a an the and or but to of in on at for from with is are was were be been being has have had do does did can could would should will shall i me my we our you your he she they them their it its this that these those there here not no yes who whom what which where when why how as about into by so if then still just tell ask asking know knowing explain mean meaning something someone anyone people person thing things again really please".split(
    " ",
  ),
);

// Small, general synonym families; never use the GM's hidden information to
// guess what a player is asking about. This is not an embedding similarity.
const TOPIC_ALIASES: Record<string, string> = {
  owe: "debt",
  owes: "debt",
  owed: "debt",
  owing: "debt",
  debts: "debt",
  money: "debt",
  creditor: "debt",
  creditors: "debt",
  lender: "debt",
  lenders: "debt",
  loan: "debt",
  loans: "debt",
  owned: "own",
  owning: "own",
  ownership: "own",
  proprietor: "own",
  proprietors: "own",
  missing: "disappear",
  vanished: "disappear",
  disappearance: "disappear",
  disappearances: "disappear",
  lost: "disappear",
  ledger: "record",
  ledgers: "record",
  records: "record",
  registered: "record",
  registry: "record",
  register: "record",
};

const EXTRA_TOPIC_STOP_WORDS = new Set(
  "him his her hers herself himself themselves one two three some such other another more most much many very only even also onto over under".split(
    " ",
  ),
);

export function topicWords(value: string): Set<string> {
  const words = value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(
    words
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
      .map((word) => TOPIC_ALIASES[word] ?? word),
  );
}

/** Topic words excluding common pronouns, quantifiers, and prepositions. */
export function threadTopicWords(value: string): Set<string> {
  const words = topicWords(value);
  for (const stop of EXTRA_TOPIC_STOP_WORDS) words.delete(stop);
  return words;
}

function intersects(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  for (const word of a) if (b.has(word)) return true;
  return false;
}

function sharedTopic(actions: string[]): Set<string> {
  const [first, ...rest] = actions.map(topicWords);
  if (!first) return new Set();
  return new Set(
    [...first].filter((word) => rest.every((set) => set.has(word))),
  );
}

const DELIBERATE_REPEAT_RE =
  /^(repeat|keep asking|ask again|continue repeating|insist again)\b/;

export function isDeliberateRepeat(action: string): boolean {
  return DELIBERATE_REPEAT_RE.test(action.trim().toLowerCase());
}

export function isInquiry(action: string): boolean {
  if (isDeliberateRepeat(action)) return false;
  const cleaned = action.trim().toLowerCase();
  return (
    cleaned.includes("?") ||
    /^(?:ask|tell|explain|who|what|where|when|why|how|which|whether|is|are|can|could|do|does|did|so|but|no\b|i mean)\b/.test(
      cleaned,
    ) ||
    /(?:doesn.t make sense|that.s inconsistent|that.s impossible)/.test(cleaned)
  );
}

export function isNonAnswer(narration: string): boolean {
  return /\b(?:don.t|do not|doesn.t|does not|didn.t|did not|can.t|cannot|couldn.t|could not|won.t|will not|wouldn.t|would not|isn.t|is not|aren.t|are not|no idea|no record|not sure|not certain|unable to|unknown|no way to|can.t say|won.t guess)\b/i.test(
    narration,
  );
}

function relevantText(
  text: string | undefined,
  topic: ReadonlySet<string>,
): boolean {
  return text != null && intersects(topicWords(text), topic);
}

/** A new unrelated fact is not evidence that this question was answered. */
function progressedOnTopic(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  topic: ReadonlySet<string>,
): boolean {
  if (
    turn.visiblePatch.location !== undefined ||
    turn.visiblePatch.situation !== undefined ||
    turn.resolvedRoll ||
    turn.rollOutcome
  ) {
    return true;
  }
  const patch = turn.visiblePatch;
  const changes = [
    ...patch.knownFacts.add,
    ...patch.knownFacts.update,
    ...patch.objectives.add,
    ...patch.objectives.update,
    ...patch.activeCharacters.add,
    ...patch.activeCharacters.update,
  ];
  if (changes.some((entry) => relevantText(entry.text, topic))) return true;
  const relationshipChanges = [
    ...patch.relationships.add,
    ...patch.relationships.update,
  ];
  if (
    relationshipChanges.some(
      (entry) =>
        relevantText(entry.text, topic) ||
        relevantText(entry.disposition, topic),
    )
  ) {
    return true;
  }
  const newFacts = session.provisionalFacts.filter((fact) =>
    turn.provisionalFactIds.includes(fact.id),
  );
  if (
    newFacts.some(
      (fact) =>
        relevantText(fact.name, topic) || relevantText(fact.summary, topic),
    )
  ) {
    return true;
  }
  return (
    session.scenarioCollection?.items.some((scenario) =>
      scenario.events.some(
        (event) =>
          event.turnId === turn.id &&
          event.visibility === "player" &&
          relevantText(event.text, topic),
      ),
    ) ?? false
  );
}

/**
 * Detects a series of related inquiries met with refusals/unknowns and no
 * topic-relevant change. The caller may supply the NEXT player action; a
 * switch of subject suppresses recovery so the GM follows the player.
 */
export function dialogueLoopPacing(
  session: AdventureSession,
  nextAction?: string,
): DialogueLoopPacing | undefined {
  if (session.pendingRoll || session.turns.length < DIALOGUE_LOOP_TURN_LIMIT)
    return undefined;

  const recent = session.turns.slice(-MAX_DIALOGUE_WINDOW);
  let repeatedTurns = 0;
  let topic = new Set<string>();

  for (
    let count = DIALOGUE_LOOP_TURN_LIMIT;
    count <= recent.length;
    count += 1
  ) {
    const tail = recent.slice(-count);
    const shared = sharedTopic(tail.map((turn) => turn.playerAction));
    if (
      shared.size === 0 ||
      tail.some(
        (turn) =>
          !isInquiry(turn.playerAction) ||
          !isNonAnswer(turn.narration) ||
          progressedOnTopic(turn, session, shared),
      )
    ) {
      break;
    }
    repeatedTurns = count;
    topic = shared;
  }

  if (repeatedTurns < DIALOGUE_LOOP_TURN_LIMIT) return undefined;
  return {
    repeatedTurns,
    recoveryDue:
      nextAction === undefined ||
      (isInquiry(nextAction) && intersects(topicWords(nextAction), topic)),
  };
}
