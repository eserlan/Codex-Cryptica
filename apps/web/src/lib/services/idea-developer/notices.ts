import type { ContinueResult, StartResult } from "./idea-developer-service";

/**
 * What the tool tells the user when a turn did not produce a result (#3228).
 * One place turns a service result into a plain-language notice, for both the
 * first turn and later turns.
 */
export type IdeaDeveloperNotice =
  | { kind: "error"; message: string }
  | { kind: "limited"; message: string; retryAt: number }
  | { kind: "rejected"; message: string }
  | { kind: "needs-rpg-idea"; message: string }
  | { kind: "capped"; message: string };

const NEEDS_RPG_IDEA_FALLBACK =
  "Tell me about a game or RPG idea, even a rough one.";

/** The notice for a result, or null when there is nothing to tell the user. */
export function noticeFor(
  result: StartResult | ContinueResult,
): IdeaDeveloperNotice | null {
  switch (result.status) {
    case "failed":
      return { kind: "error", message: result.failure.message };
    case "limited":
      return {
        kind: "limited",
        message: result.message,
        retryAt: result.retryAt,
      };
    case "rejected":
      return { kind: "rejected", message: result.message };
    case "capped":
      return { kind: "capped", message: result.message };
    case "needs-rpg-idea":
      return {
        kind: "needs-rpg-idea",
        message: result.message?.trim() || NEEDS_RPG_IDEA_FALLBACK,
      };
    default:
      return null;
  }
}
