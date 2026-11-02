import type {
  AdventureSession,
  TimeAdvanceProposal,
  WorldTimeState,
} from "./types";

/** Advance only from a committed fictional action, never the device clock. */
export function applyTimeAdvance(
  session: AdventureSession,
  advance: TimeAdvanceProposal | undefined,
  turnId: string,
):
  | { ok: true; value: WorldTimeState | undefined }
  | { ok: false; reason: string } {
  if (!advance) return { ok: true, value: session.worldTime };
  if (
    session.status !== "active" ||
    !Number.isSafeInteger(advance.minutes) ||
    advance.minutes < 1 ||
    advance.minutes > 43_200 ||
    !advance.cause.trim() ||
    advance.developments.length > 3
  ) {
    return { ok: false, reason: "invalid-fictional-time" };
  }
  const previous = session.worldTime ?? {
    version: 1 as const,
    elapsedMinutes: 0,
    events: [],
  };
  const elapsedMinutes = previous.elapsedMinutes + advance.minutes;
  if (elapsedMinutes > 52_560_000) {
    return { ok: false, reason: "fictional-time-limit-exceeded" };
  }
  const known = new Set(session.hiddenState.gmThreads.map((thread) => thread.id));
  const seen = new Set<string>();
  for (const change of advance.developments) {
    if (
      !known.has(change.threadId) ||
      seen.has(change.threadId) ||
      !change.text.trim() ||
      change.text.length > 600
    ) {
      return { ok: false, reason: "unknown-or-duplicate-background-thread" };
    }
    seen.add(change.threadId);
  }
  if (previous.events.length + advance.developments.length > 80) {
    return { ok: false, reason: "fictional-time-event-limit-exceeded" };
  }
  return {
    ok: true,
    value: {
      version: 1,
      elapsedMinutes,
      events: [
        ...previous.events,
        ...advance.developments.map((item, index) => ({
          id: `${turnId}:world:${index + 1}`,
          turnId,
          atMinute: elapsedMinutes,
          threadId: item.threadId,
          text: item.text,
        })),
      ],
    },
  };
}
