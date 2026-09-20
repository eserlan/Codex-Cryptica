import { isModeId, type Conversation, type ModeId } from "generator-engine";

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

function isUsableConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Conversation>;
  return typeof candidate.ideaText === "string" && !!candidate.latest;
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
    conversation: isUsableConversation(parsed.conversation)
      ? parsed.conversation
      : null,
  };
}
