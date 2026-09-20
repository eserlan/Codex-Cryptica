import {
  isModeId,
  MAX_CONVERSATION_TURNS,
  MAX_IDEA_LENGTH,
  TURN_KINDS,
  type Conversation,
  type Development,
  type ModeId,
  type PersonWhoCares,
  type PlayerDirection,
  type Turn,
  type TurnKind,
  type TurnStatus,
} from "generator-engine";

/**
 * How the Idea Developer's tab session is written to and read from
 * `sessionStorage` (#3228, FR-030). Pure functions: the store decides when to
 * save and restore; this decides what a saved session looks like and what is
 * safe to trust when reading one back.
 */
export interface SessionSnapshot {
  ideaDraft: string;
  mode: ModeId;
  conversation: Conversation | null;
}

export interface RestoredSession {
  ideaDraft: string;
  /** Null when the saved mode is not one that exists. */
  mode: ModeId | null;
  conversation: Conversation | null;
}

const VERSION = 1;

export function serialiseSession(snapshot: SessionSnapshot): string {
  return JSON.stringify({ version: VERSION, ...snapshot });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function readPerson(value: unknown): PersonWhoCares | null {
  if (!isRecord(value)) return null;
  const { name, role, wants, conflictsWith } = value;
  return nonEmptyText(name) &&
    nonEmptyText(role) &&
    nonEmptyText(wants) &&
    nonEmptyText(conflictsWith)
    ? { name, role, wants, conflictsWith }
    : null;
}

function readPeople(value: unknown): PersonWhoCares[] | null {
  if (!Array.isArray(value)) return null;
  const people = value.map(readPerson);
  return people.every((person): person is PersonWhoCares => person !== null)
    ? people
    : null;
}

function readDirection(value: unknown): PlayerDirection | null {
  if (!isRecord(value)) return null;
  const { title, description } = value;
  return nonEmptyText(title) && nonEmptyText(description)
    ? { title, description }
    : null;
}

function readDirections(value: unknown): PlayerDirection[] | null {
  if (!Array.isArray(value)) return null;
  const directions = value.map(readDirection);
  return directions.every(
    (direction): direction is PlayerDirection => direction !== null,
  )
    ? directions
    : null;
}

function readQuestions(value: unknown): string[] | null {
  return Array.isArray(value) && value.every(nonEmptyText) ? value : null;
}

function readSuggestion(
  value: unknown,
): Development["generatorSuggestions"][number] | null {
  if (!isRecord(value)) return null;
  const { generatorKey, reason } = value;
  return nonEmptyText(generatorKey) && nonEmptyText(reason)
    ? { generatorKey, reason }
    : null;
}

function readSuggestions(
  value: unknown,
): Development["generatorSuggestions"] | null {
  if (!Array.isArray(value)) return null;
  const suggestions = value.map(readSuggestion);
  return suggestions.every(
    (suggestion): suggestion is Development["generatorSuggestions"][number] =>
      suggestion !== null,
  )
    ? suggestions
    : null;
}

function readDevelopmentTexts(
  value: Record<string, unknown>,
):
  | (Pick<
      Development,
      "alreadyInteresting" | "centralQuestion" | "makeItMove" | "consequences"
    > & { whatChanged?: string })
  | null {
  const alreadyInteresting = value.alreadyInteresting;
  const centralQuestion = value.centralQuestion;
  const makeItMove = value.makeItMove;
  const consequences = value.consequences;
  const whatChanged = value.whatChanged;
  if (
    !nonEmptyText(alreadyInteresting) ||
    !nonEmptyText(centralQuestion) ||
    !nonEmptyText(makeItMove) ||
    !nonEmptyText(consequences) ||
    (whatChanged !== undefined && !nonEmptyText(whatChanged))
  ) {
    return null;
  }
  return {
    alreadyInteresting,
    centralQuestion,
    makeItMove,
    consequences,
    ...(whatChanged ? { whatChanged } : {}),
  };
}

function readDevelopment(value: unknown): Development | null {
  if (!isRecord(value) || !isModeId(value.mode)) return null;
  const texts = readDevelopmentTexts(value);
  const peopleWhoCare = readPeople(value.peopleWhoCare);
  const playerDirections = readDirections(value.playerDirections);
  const creatorQuestions = readQuestions(value.creatorQuestions);
  const generatorSuggestions = readSuggestions(value.generatorSuggestions);
  if (
    !texts ||
    !peopleWhoCare ||
    !playerDirections ||
    !creatorQuestions ||
    !generatorSuggestions
  ) {
    return null;
  }

  return {
    mode: value.mode,
    ...texts,
    peopleWhoCare,
    playerDirections,
    creatorQuestions,
    generatorSuggestions,
  };
}

const TURN_STATUSES = ["pending", "done", "failed", "cancelled"] as const;

function readTurn(value: unknown): Turn | null {
  if (!isRecord(value)) return null;
  const kind = value.kind;
  const status = value.status;
  if (
    !TURN_KINDS.includes(kind as TurnKind) ||
    !TURN_STATUSES.includes(status as TurnStatus) ||
    !isModeId(value.mode) ||
    typeof value.text !== "string" ||
    value.text.length > MAX_IDEA_LENGTH
  ) {
    return null;
  }
  return {
    kind: kind as TurnKind,
    mode: value.mode,
    text: value.text,
    status: status as TurnStatus,
  };
}

function readTurns(value: unknown): Turn[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_CONVERSATION_TURNS
  ) {
    return null;
  }
  const turns = value.map(readTurn);
  return turns.every((turn): turn is Turn => turn !== null) ? turns : null;
}

function readConversationBasics(value: Record<string, unknown>): {
  ideaText: string;
  previousInteractionId: string | null;
  hubDraftId?: string;
} | null {
  if (
    !nonEmptyText(value.ideaText) ||
    value.ideaText.length > MAX_IDEA_LENGTH ||
    (typeof value.previousInteractionId !== "string" &&
      value.previousInteractionId !== null) ||
    (value.hubDraftId !== undefined && typeof value.hubDraftId !== "string")
  ) {
    return null;
  }
  return {
    ideaText: value.ideaText,
    previousInteractionId: value.previousInteractionId,
    ...(value.hubDraftId ? { hubDraftId: value.hubDraftId } : {}),
  };
}

function readConversation(value: unknown): Conversation | null {
  if (!isRecord(value)) return null;
  const basics = readConversationBasics(value);
  const turns = readTurns(value.turns);
  const latest = readDevelopment(value.latest);
  if (!basics || !turns || !latest) return null;

  return {
    ...basics,
    turns,
    latest,
  };
}

/** Returns nothing for missing, corrupt or old-version data. */
export function parseStoredSession(raw: string | null): RestoredSession | null {
  if (!raw) return null;
  let parsed: Record<string, unknown> | null;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown> | null;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || parsed.version !== VERSION) {
    return null;
  }
  return {
    ideaDraft: typeof parsed.ideaDraft === "string" ? parsed.ideaDraft : "",
    mode: isModeId(parsed.mode) ? parsed.mode : null,
    conversation: readConversation(parsed.conversation),
  };
}
