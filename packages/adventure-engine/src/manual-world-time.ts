import { applyScenarioTimePressures, applyTimeAdvance } from "./world-time";
import { parseAdventureSession } from "./schemas";
import type { AdventureSession } from "./types";

export type ManualTimeAdvanceResult =
  | { ok: true; session: AdventureSession; changed: boolean }
  | {
      ok: false;
      reason:
        | "stale-revision"
        | "read-only-session"
        | "pending-roll"
        | "invalid-fictional-time"
        | "id-collision"
        | "state-budget-exceeded";
    };

/**
 * A user-initiated, AI-independent fictional clock advancement. This is a
 * revisioned local commit: opening the app again never ticks the clock.
 * The event is GM-only history, not narration or an automatic NPC action.
 */
export function advanceManualWorldTime(
  session: AdventureSession,
  minutes: number,
  cause: string,
  eventId: string,
  expectedRevision: number,
  now: string,
): ManualTimeAdvanceResult {
  if (session.revision !== expectedRevision)
    return { ok: false, reason: "stale-revision" };
  if (session.status !== "active")
    return { ok: false, reason: "read-only-session" };
  if (session.pendingRoll) return { ok: false, reason: "pending-roll" };
  const text = cause.trim();
  if (
    !Number.isSafeInteger(minutes) ||
    minutes < 1 ||
    minutes > 43_200 ||
    !text ||
    text.length > 500 ||
    !eventId.trim() ||
    eventId.length > 160
  )
    return { ok: false, reason: "invalid-fictional-time" };

  // A retried save/interaction must not repeat the time advance.
  const eventText = `Manual advance (${minutes}m): ${text}`;
  const previous = session.worldTime?.events.find(
    (entry) => entry.id === eventId,
  );
  if (previous) {
    return previous.threadId === "manual-world-time" &&
      previous.text === eventText
      ? { ok: true, session, changed: false }
      : { ok: false, reason: "id-collision" };
  }
  if (
    session.turns.some((turn) => turn.id === eventId) ||
    session.scenarioCollection?.items.some(
      (item) =>
        item.id === eventId ||
        item.events.some((event) => event.id === eventId),
    )
  )
    return { ok: false, reason: "id-collision" };

  const advanced = applyTimeAdvance(
    session,
    { minutes, cause: text, developments: [] },
    eventId,
  );
  if (!advanced.ok || !advanced.value)
    return { ok: false, reason: "invalid-fictional-time" };

  const timeValue = advanced.value;
  const elapsedMinutes = timeValue.elapsedMinutes;
  const next = structuredClone(session);
  const triggered = applyScenarioTimePressures(
    next,
    elapsedMinutes,
    eventId,
    now,
  );
  next.worldTime = {
    ...timeValue,
    events: [
      ...timeValue.events,
      {
        id: eventId,
        // A manual clock action has an idempotency key, not a generated turn.
        turnId: eventId,
        atMinute: elapsedMinutes,
        threadId: "manual-world-time",
        text: eventText,
      },
      ...triggered.map((item) => ({
        id: `${eventId.slice(0, 120)}:world:pressure:${item.scenarioId}`,
        turnId: eventId,
        atMinute: elapsedMinutes,
        threadId: item.scenarioId,
        text: `Scenario pressure consequence: ${item.text}`,
      })),
    ].slice(-80),
  };
  next.revision += 1;
  next.updatedAt = now;
  next.lastPlayedAt = now;
  try {
    return { ok: true, session: parseAdventureSession(next), changed: true };
  } catch {
    return { ok: false, reason: "state-budget-exceeded" };
  }
}
