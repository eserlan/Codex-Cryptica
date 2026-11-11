import type {
  AdventureSession,
  ScenarioEvent,
  ScenarioItem,
  ScenarioStatus,
} from "./types";
import { parseAdventureSession, scenarioEventSchema } from "./schemas";
import { scenarioItemIdentityIds } from "./scenario-schemas";

export type ScenarioCommandError =
  | "stale-revision"
  | "pending-roll"
  | "read-only-session"
  | "unknown-scenario"
  | "scenario-not-heard"
  | "invalid-transition"
  | "origin-conflict"
  | "id-collision"
  | "already-applied"
  | "state-budget-exceeded"
  | "invalid-scenario"
  | "invalid-fictional-time"
  | "unknown-discovery";

export type ScenarioCommandResult =
  | { ok: true; session: AdventureSession; changed: boolean }
  | { ok: false; reason: ScenarioCommandError };

function originKey(item: ScenarioItem): string {
  const origin = item.origin;
  if (origin.legacySessionId && origin.legacyScenarioId) {
    return JSON.stringify([
      "legacy",
      origin.legacySessionId,
      origin.legacyScenarioId,
    ]);
  }
  if (origin.kind === "manual")
    return JSON.stringify(["manual", origin.manualId ?? item.id]);
  if (origin.sourceRecordId && origin.sourceFingerprint) {
    return JSON.stringify([
      "source",
      origin.sourceRecordId,
      origin.sourceFingerprint,
      origin.index,
    ]);
  }
  return JSON.stringify(["rumour", origin.batchId, origin.index]);
}

function sameImmutableSeed(a: ScenarioItem, b: ScenarioItem): boolean {
  return (
    a.origin.kind === b.origin.kind &&
    a.playerVisible.rumour === b.playerVisible.rumour &&
    a.playerVisible.lead === b.playerVisible.lead &&
    a.playerVisible.source === b.playerVisible.source &&
    a.gmOnly.truth === b.gmOnly.truth &&
    a.gmOnly.ifInvestigated === b.gmOnly.ifInvestigated
  );
}

function sessionIdentityIds(session: AdventureSession): Set<string> {
  return new Set([
    session.id,
    session.vaultId,
    ...session.visibleState.objectives.map((entry) => entry.id),
    ...session.visibleState.activeCharacters.map((entry) => entry.id),
    ...session.visibleState.knownFacts.map((entry) => entry.id),
    ...session.visibleState.relationships.map((entry) => entry.id),
    ...(session.visibleState.location
      ? [session.visibleState.location.id]
      : []),
    ...(session.visibleState.situation
      ? [session.visibleState.situation.id]
      : []),
    ...session.hiddenState.secrets.map((entry) => entry.id),
    ...session.hiddenState.gmThreads.map((entry) => entry.id),
    ...session.provisionalFacts.map((entry) => entry.id),
    ...session.turns.map((entry) => entry.id),
    ...(session.pendingRoll ? [session.pendingRoll.id] : []),
    ...session.dicePresets.map((entry) => entry.id),
    ...session.resourceCounters.map((entry) => entry.id),
    ...(session.worldTime?.events.map((entry) => entry.id) ?? []),
  ]);
}

function commit(
  session: AdventureSession,
  expectedRevision: number,
  now: string,
  update: (copy: AdventureSession) => void,
): ScenarioCommandResult {
  if (session.revision !== expectedRevision)
    return { ok: false, reason: "stale-revision" };
  if (session.status !== "active")
    return { ok: false, reason: "read-only-session" };
  if (session.pendingRoll) return { ok: false, reason: "pending-roll" };
  const candidate = structuredClone(session);
  update(candidate);
  candidate.revision += 1;
  candidate.updatedAt = now;
  candidate.lastPlayedAt = now;
  try {
    return {
      ok: true,
      session: parseAdventureSession(candidate),
      changed: true,
    };
  } catch {
    return { ok: false, reason: "state-budget-exceeded" };
  }
}

/**
 * Persist player review decisions alongside the adventure without touching
 * committed turn history or the underlying provisional facts. Idempotent on
 * repeated dismissal and validated against player-visible discoveries only.
 */
export function dismissAdventureDiscoveries(
  session: AdventureSession,
  factIds: string[],
  expectedRevision: number,
  now = session.updatedAt,
): ScenarioCommandResult {
  if (session.revision !== expectedRevision)
    return { ok: false, reason: "stale-revision" };
  if (session.status !== "active")
    return { ok: false, reason: "read-only-session" };
  if (session.pendingRoll) return { ok: false, reason: "pending-roll" };
  const available = new Set(
    session.provisionalFacts
      .filter((fact) => fact.visibility === "player-visible")
      .map((fact) => fact.id),
  );
  const unique = [...new Set(factIds)];
  if (unique.some((id) => !available.has(id)))
    return { ok: false, reason: "unknown-discovery" };
  const dismissed = session.dismissedProvisionalFactIds ?? [];
  const toAdd = unique.filter((id) => !dismissed.includes(id));
  if (!toAdd.length) return { ok: true, session, changed: false };
  return commit(session, expectedRevision, now, (copy) => {
    copy.dismissedProvisionalFactIds = [...dismissed, ...toAdd];
  });
}

export function addScenario(
  session: AdventureSession,
  item: ScenarioItem,
  expectedRevision: number,
  now = session.updatedAt,
): ScenarioCommandResult {
  if (session.revision !== expectedRevision)
    return { ok: false, reason: "stale-revision" };
  if (session.status !== "active")
    return { ok: false, reason: "read-only-session" };
  if (session.pendingRoll) return { ok: false, reason: "pending-roll" };
  const collection = session.scenarioCollection ?? {
    version: 1 as const,
    items: [],
    focusedScenarioId: null,
  };
  const key = originKey(item);
  const existing = collection.items.find(
    (candidate) => originKey(candidate) === key,
  );
  if (existing) {
    return sameImmutableSeed(existing, item)
      ? { ok: true, session, changed: false }
      : { ok: false, reason: "origin-conflict" };
  }
  const newIds = scenarioItemIdentityIds(item);
  const currentScenarioIds = new Set(
    collection.items.flatMap(scenarioItemIdentityIds),
  );
  const persistedIds = sessionIdentityIds(session);
  if (newIds.some((id) => currentScenarioIds.has(id) || persistedIds.has(id))) {
    return { ok: false, reason: "id-collision" };
  }
  return commit(session, expectedRevision, now, (candidate) => {
    candidate.scenarioCollection ??= {
      version: 1,
      items: [],
      focusedScenarioId: null,
    };
    candidate.scenarioCollection.items.push(structuredClone(item));
  });
}

export function setScenarioFocus(
  session: AdventureSession,
  scenarioId: string | null,
  expectedRevision: number,
  now = session.updatedAt,
): ScenarioCommandResult {
  const collection = session.scenarioCollection;
  if (
    scenarioId !== null &&
    !collection?.items.some((item) => item.id === scenarioId)
  ) {
    return { ok: false, reason: "unknown-scenario" };
  }
  const target = collection?.items.find((item) => item.id === scenarioId);
  if (target && target.knowledge !== "heard")
    return { ok: false, reason: "scenario-not-heard" };
  if (target && target.status !== "open")
    return { ok: false, reason: "invalid-transition" };
  if ((collection?.focusedScenarioId ?? null) === scenarioId) {
    return { ok: true, session, changed: false };
  }
  return commit(session, expectedRevision, now, (candidate) => {
    candidate.scenarioCollection ??= {
      version: 1,
      items: [],
      focusedScenarioId: null,
    };
    candidate.scenarioCollection.focusedScenarioId = scenarioId;
  });
}

export function markScenarioHeard(
  session: AdventureSession,
  scenarioId: string,
  completedTurnId: string,
): AdventureSession | null {
  const item = session.scenarioCollection?.items.find(
    (entry) => entry.id === scenarioId,
  );
  if (!item || !session.turns.some((turn) => turn.id === completedTurnId))
    return null;
  if (item.knowledge === "heard") return session;
  const candidate = structuredClone(session);
  candidate.scenarioCollection!.items.find(
    (entry) => entry.id === scenarioId,
  )!.knowledge = "heard";
  return candidate;
}

export function appendScenarioEvent(
  session: AdventureSession,
  scenarioId: string,
  event: ScenarioEvent,
  expectedRevision: number,
  now = session.updatedAt,
  secretBindingId?: string,
): ScenarioCommandResult {
  const target = session.scenarioCollection?.items.find(
    (item) => item.id === scenarioId,
  );
  if (!target) return { ok: false, reason: "unknown-scenario" };
  if (session.revision !== expectedRevision)
    return { ok: false, reason: "stale-revision" };
  if (session.status !== "active")
    return { ok: false, reason: "read-only-session" };
  if (session.pendingRoll) return { ok: false, reason: "pending-roll" };
  const parsed = scenarioEventSchema.safeParse(event);
  if (!parsed.success || !parsed.data.text.trim())
    return { ok: false, reason: "invalid-scenario" };
  const replay = scenarioEventReplay(session, parsed.data);
  if (replay) return replay;
  const failure = validateEventAppend(
    session,
    target,
    parsed.data,
    secretBindingId,
  );
  if (failure) return { ok: false, reason: failure };
  return commit(session, expectedRevision, now, (candidate) => {
    const item = candidate.scenarioCollection!.items.find(
      (entry) => entry.id === scenarioId,
    )!;
    item.events.push(parsed.data);
    if (parsed.data.visibility === "player") item.knowledge = "heard";
    if (secretBindingId)
      Object.defineProperty(item.secretBindings.eventIds, parsed.data.id, {
        value: secretBindingId,
        enumerable: true,
        configurable: true,
        writable: true,
      });
  });
}

function scenarioEventReplay(
  session: AdventureSession,
  event: ScenarioEvent,
): ScenarioCommandResult | null {
  const prior = session.scenarioCollection?.items
    .flatMap((item) => item.events)
    .find((entry) => entry.id === event.id);
  if (!prior) return null;
  return JSON.stringify(prior) === JSON.stringify(event)
    ? { ok: true, session, changed: false }
    : { ok: false, reason: "id-collision" };
}

function validateEventAppend(
  session: AdventureSession,
  target: ScenarioItem,
  event: ScenarioEvent,
  secretBindingId: string | undefined,
): ScenarioCommandError | null {
  if (hasEventIdCollision(session, event.id)) return "id-collision";
  if (target.events.length >= 100) return "state-budget-exceeded";
  return validateSecretBinding(session, event, secretBindingId);
}

function hasEventIdCollision(
  session: AdventureSession,
  eventId: string,
): boolean {
  const scenarioIds = new Set(
    (session.scenarioCollection?.items ?? []).flatMap(scenarioItemIdentityIds),
  );
  return scenarioIds.has(eventId) || sessionIdentityIds(session).has(eventId);
}

function validateSecretBinding(
  session: AdventureSession,
  event: ScenarioEvent,
  secretBindingId: string | undefined,
): ScenarioCommandError | null {
  if (event.visibility === "gm" && !secretBindingId) return "invalid-scenario";
  if (!secretBindingId) return null;
  if (secretBindingId.length > 160) return "invalid-scenario";
  return hasSessionIdentity(session, secretBindingId) ? "id-collision" : null;
}

function hasSessionIdentity(session: AdventureSession, id: string): boolean {
  return (
    sessionIdentityIds(session).has(id) ||
    session.hiddenState.secrets.some((secret) => secret.id === id) ||
    session.hiddenState.gmThreads.some((thread) => thread.id === id)
  );
}

export function recordScenarioTheory(
  session: AdventureSession,
  scenarioId: string,
  text: string,
  eventId: string,
  expectedRevision: number,
  now = session.updatedAt,
): ScenarioCommandResult {
  const target = session.scenarioCollection?.items.find(
    (item) => item.id === scenarioId,
  );
  if (!target) return { ok: false, reason: "unknown-scenario" };
  if (target.knowledge !== "heard") {
    return { ok: false, reason: "scenario-not-heard" };
  }
  return appendScenarioEvent(
    session,
    scenarioId,
    {
      id: eventId,
      kind: "theory",
      visibility: "player",
      text: text.trim(),
      at: now,
    },
    expectedRevision,
    now,
  );
}

const STATUS_EVENT_PREFIX: Record<ScenarioStatus, string> = {
  open: "Reopened",
  resolved: "Resolved",
  abandoned: "Abandoned",
};

export function setScenarioStatus(
  session: AdventureSession,
  scenarioId: string,
  status: ScenarioStatus,
  expectedRevision: number,
  event?: ScenarioEvent,
  now = session.updatedAt,
): ScenarioCommandResult {
  const item = session.scenarioCollection?.items.find(
    (entry) => entry.id === scenarioId,
  );
  if (!item) return { ok: false, reason: "unknown-scenario" };
  if (item.knowledge !== "heard")
    return { ok: false, reason: "scenario-not-heard" };
  // An open lead can be concluded or left behind; a closed one can only be
  // reopened (so a mistaken click is recoverable). No closed-to-closed moves.
  const allowed =
    item.status === "open"
      ? status === "resolved" || status === "abandoned"
      : status === "open";
  if (!allowed) return { ok: false, reason: "invalid-transition" };
  if (event) {
    const parsed = scenarioEventSchema.safeParse(event);
    if (
      !parsed.success ||
      parsed.data.kind !== "status-change" ||
      parsed.data.visibility !== "player"
    ) {
      return { ok: false, reason: "invalid-scenario" };
    }
    if (
      session.scenarioCollection!.items.some((entry) =>
        entry.events.some((existing) => existing.id === parsed.data.id),
      )
    ) {
      return { ok: false, reason: "id-collision" };
    }
    if (
      sessionIdentityIds(session).has(parsed.data.id) ||
      session.scenarioCollection!.items.some(
        (entry) =>
          entry.id === parsed.data.id ||
          entry.secretBindings.truth === parsed.data.id ||
          entry.secretBindings.ifInvestigated === parsed.data.id ||
          Object.values(entry.secretBindings.eventIds).includes(parsed.data.id),
      )
    )
      return { ok: false, reason: "id-collision" };
  }
  try {
    return commit(session, expectedRevision, now, (candidate) => {
      const target = candidate.scenarioCollection!.items.find(
        (entry) => entry.id === scenarioId,
      )!;
      target.status = status;
      if (event) {
        const parsed = scenarioEventSchema.parse(event);
        target.events.push({
          ...parsed,
          text: `${STATUS_EVENT_PREFIX[status]}: ${parsed.text}`,
        });
      }
      if (candidate.scenarioCollection!.focusedScenarioId === scenarioId) {
        candidate.scenarioCollection!.focusedScenarioId = null;
      }
    });
  } catch {
    return { ok: false, reason: "invalid-scenario" };
  }
}

/** Ids of the turns that logged a scenario event (a lead surfacing or a stage advancing). */
export function scenarioEventTurnIds(session: AdventureSession): Set<string> {
  const ids = new Set<string>();
  for (const item of session.scenarioCollection?.items ?? []) {
    for (const event of item.events) {
      if (event.turnId) ids.add(event.turnId);
    }
  }
  return ids;
}
