import type { AdventureJsonV1 } from "./adventure-json";
import {
  MAX_ACTOR_FACT_CHARS,
  MAX_ACTOR_REMEMBERED_FACTS,
  MAX_PACKAGE_PROGRESS_ENTRIES,
} from "./schemas";
import type {
  ActorDisposition,
  ActorEventProposal,
  ActorProgressStatus,
  ActorProposalStatus,
  PackageActorEvent,
  PackageActorState,
  PackageEventProposal,
  PackageProgress,
  PackageProgressEvent,
  PackageProgressRecord,
  PackageProgressStatus,
  PackageRecordKind,
} from "./types";

export interface PackageProgressIndex {
  packageSceneIds: string[];
  packageRecordKinds: Record<string, PackageRecordKind>;
  packageSceneBranches: Record<string, string[]>;
  packageActorIds: string[];
}

export type PackageProgressInput = PackageEventProposal;

export interface PackageProgressResult {
  progress: PackageProgress;
  dropped: string[];
}

const ALLOWED: Record<PackageProgressStatus, PackageProgressStatus[]> = {
  unvisited: ["available", "active", "skipped", "resolved"],
  available: ["active", "skipped", "resolved"],
  active: ["resolved", "altered", "skipped", "available"],
  skipped: ["active"],
  resolved: ["altered"],
  altered: [],
};

/** An id-keyed map with no prototype, so ids like `__proto__` are plain keys. */
export function nullMap<T>(
  entries: Iterable<readonly [string, T]> = [],
): Record<string, T> {
  const map = Object.create(null) as Record<string, T>;
  for (const [key, value] of entries) {
    Object.defineProperty(map, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return map;
}

const RECORD_KINDS: readonly string[] = [
  "scene",
  "encounter",
  "clue",
  "secret",
];

/** The package's scenes, record kinds and scene branches; built from the package alone. */
export function packageProgressIndex(
  pkg: AdventureJsonV1,
): PackageProgressIndex {
  const packageRecordKinds = nullMap<PackageRecordKind>();
  const groups: [PackageRecordKind, { id: string }[]][] = [
    ["scene", pkg.scenes],
    ["encounter", pkg.encounters],
    ["clue", pkg.clues],
    ["secret", pkg.secrets],
  ];
  for (const [kind, records] of groups) {
    for (const record of records) {
      Object.defineProperty(packageRecordKinds, record.id, {
        value: kind,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  return {
    packageSceneIds: pkg.scenes.map((scene) => scene.id),
    packageRecordKinds,
    packageSceneBranches: nullMap(
      pkg.scenes.map((scene) => [
        scene.id,
        (scene.branches ?? []).map((branch) => branch.targetSceneId),
      ]),
    ),
    packageActorIds: pkg.actors.map((actor) => actor.id),
  };
}

export function canTransitionPackageStatus(
  from: PackageProgressStatus,
  to: PackageProgressStatus,
): boolean {
  return ALLOWED[from].includes(to);
}

function statusOf(
  records: readonly PackageProgressRecord[],
  recordId: string,
): PackageProgressStatus {
  return (
    records.find((record) => record.id === recordId)?.status ?? "unvisited"
  );
}

function confirmedStatus(
  events: readonly PackageProgressEvent[],
  recordId: string,
  superseded: ReadonlySet<string>,
  leaveOut?: string,
): PackageProgressStatus {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (
      event.recordId === recordId &&
      event.certainty === "confirmed" &&
      !superseded.has(event.id) &&
      event.id !== leaveOut
    ) {
      return event.to;
    }
  }
  return "unvisited";
}

type Checked =
  | { reason: string }
  | { target?: PackageProgressEvent; current: PackageProgressStatus };

function invalidField(
  input: PackageProgressInput,
  note: string,
  kinds: PackageProgressIndex["packageRecordKinds"],
): string | null {
  if (!RECORD_KINDS.includes(input.kind)) return "wrong kind";
  if (!Object.hasOwn(kinds, input.recordId)) return "unknown record";
  const known = kinds[input.recordId];
  if (known !== input.kind) return "wrong kind";
  if (input.to === "unvisited" || note.length === 0) {
    return "invalid status or note";
  }
  return null;
}

/** The event a correction names, or null when it cannot be corrected. */
function supersedeTarget(
  events: readonly PackageProgressEvent[],
  input: PackageProgressInput,
): PackageProgressEvent | null {
  const target = events.find((e) => e.id === input.supersedes);
  if (!target || target.recordId !== input.recordId) return null;
  return events.some((e) => e.supersedes === target.id) ? null : target;
}

function transitionAllowed(
  events: readonly PackageProgressEvent[],
  input: PackageProgressInput,
  current: PackageProgressStatus,
  target: PackageProgressEvent | undefined,
): boolean {
  if (input.certainty !== "confirmed") return true;
  if (!target) return canTransitionPackageStatus(current, input.to);
  const superseded = new Set(events.flatMap((e) => e.supersedes ?? []));
  const baseline = confirmedStatus(
    events,
    input.recordId,
    superseded,
    target.id,
  );
  return (
    baseline === input.to || canTransitionPackageStatus(baseline, input.to)
  );
}

/** Everything about an input that does not depend on its event ID. */
function checkInput(
  records: readonly PackageProgressRecord[],
  events: readonly PackageProgressEvent[],
  input: PackageProgressInput,
  note: string,
  kinds: PackageProgressIndex["packageRecordKinds"],
): Checked {
  const invalid = invalidField(input, note, kinds);
  if (invalid) return { reason: invalid };
  const current = statusOf(records, input.recordId);
  let target: PackageProgressEvent | undefined;
  if (input.supersedes) {
    target = supersedeTarget(events, input) ?? undefined;
    if (
      !target ||
      (input.certainty === "claimed" && target.certainty !== "claimed")
    ) {
      return { reason: "invalid supersede" };
    }
  }
  if (!transitionAllowed(events, input, current, target)) {
    return { reason: "transition not allowed" };
  }
  return { target, current };
}

function eventIdProblem(
  events: readonly PackageProgressEvent[],
  eventId: string,
): string | null {
  if (events.some((e) => e.id === eventId)) return "duplicate event";
  return events.length >= MAX_PACKAGE_PROGRESS_ENTRIES ? "ledger full" : null;
}

/**
 * Applies ledger inputs in order to a copy of `progress`. A rejected input is
 * reported in `dropped`; accepted ones are appended and never edited later.
 */
export function applyPackageProgressEvents(
  progress: PackageProgress,
  inputs: readonly PackageProgressInput[],
  context: {
    turnId: string;
    index: Pick<PackageProgressIndex, "packageRecordKinds">;
  },
): PackageProgressResult {
  const next: PackageProgress = {
    sceneId: progress.sceneId,
    version: 1,
    records: structuredClone(progress.records ?? []),
    events: structuredClone(progress.events ?? []),
    ...(progress.actors !== undefined
      ? { actors: structuredClone(progress.actors) }
      : {}),
    ...(progress.actorEvents !== undefined
      ? { actorEvents: structuredClone(progress.actorEvents) }
      : {}),
  };
  const records = next.records!;
  const events = next.events!;
  const dropped: string[] = [];
  let written = 0;
  for (const input of inputs) {
    const note = input.note.trim().slice(0, 240);
    const eventId = `${context.turnId.slice(0, 130)}:pkg:${written + 1}`;
    const checked = checkInput(
      records,
      events,
      input,
      note,
      context.index.packageRecordKinds,
    );
    const reason =
      "reason" in checked ? checked.reason : eventIdProblem(events, eventId);
    if ("reason" in checked || reason !== null) {
      dropped.push(`packageEvents: ${reason} ${input.recordId.slice(0, 80)}`);
      continue;
    }
    const confirmed = input.certainty === "confirmed";
    events.push({
      id: eventId,
      turnId: context.turnId.slice(0, 160),
      recordId: input.recordId,
      kind: input.kind,
      from: checked.current,
      to: input.to,
      certainty: input.certainty,
      note,
      ...(input.supersedes ? { supersedes: input.supersedes } : {}),
    });
    written += 1;
    if (confirmed) setRecordStatus(records, events, input);
  }
  return { progress: next, dropped };
}

/** The record's status is always derived from its non-superseded confirmed events. */
function setRecordStatus(
  records: PackageProgressRecord[],
  events: readonly PackageProgressEvent[],
  input: PackageProgressInput,
): void {
  const superseded = new Set(events.flatMap((e) => e.supersedes ?? []));
  const status = confirmedStatus(events, input.recordId, superseded);
  const existing = records.find((record) => record.id === input.recordId);
  if (existing) existing.status = status;
  else records.push({ id: input.recordId, kind: input.kind, status });
}

/**
 * The confirmed inputs a scene move implies: the entry scene starts, the scene
 * left becomes available again, the new scene starts, its branches open up.
 * Steps the transition rules do not allow are left out.
 */
export function planSceneProgress(
  progress: PackageProgress,
  index: PackageProgressIndex,
  moveTo?: string,
): PackageProgressInput[] {
  const statuses = new Map<string, PackageProgressStatus>();
  const inputs: PackageProgressInput[] = [];
  const get = (id: string) =>
    statuses.get(id) ?? statusOf(progress.records ?? [], id);
  const step = (id: string, to: PackageProgressStatus, note: string) => {
    if (!Object.hasOwn(index.packageRecordKinds, id)) return;
    const kind = index.packageRecordKinds[id];
    if (!canTransitionPackageStatus(get(id), to)) return;
    statuses.set(id, to);
    inputs.push({ recordId: id, kind, to, certainty: "confirmed", note });
  };
  const openBranches = (sceneId: string) => {
    if (!Object.hasOwn(index.packageSceneBranches, sceneId)) return;
    for (const target of index.packageSceneBranches[sceneId]) {
      if (get(target) === "unvisited") step(target, "available", "Next scene.");
    }
  };
  const current = progress.sceneId;
  if (get(current) === "unvisited") {
    step(current, "active", "Scene entered.");
    openBranches(current);
  }
  if (moveTo && moveTo !== current) {
    step(current, "available", "Scene left.");
    step(moveTo, "active", "Scene entered.");
    if (get(moveTo) === "active") openBranches(moveTo);
  }
  return inputs;
}

export type ActorProgressInput = ActorEventProposal;

const ALLOWED_ACTOR_STATUS: Record<
  ActorProgressStatus,
  readonly ActorProposalStatus[]
> = {
  unknown: ["present", "absent", "dead"],
  present: ["present", "absent", "dead"],
  absent: ["present", "absent", "dead"],
  dead: [],
};

function actorStateOf(
  actors: readonly PackageActorState[],
  actorId: string,
): PackageActorState {
  return (
    actors.find((actor) => actor.actorId === actorId) ?? {
      actorId,
      status: "unknown",
      disposition: "neutral",
      facts: [],
    }
  );
}

function replayActorState(
  events: readonly PackageActorEvent[],
  actorId: string,
  superseded: ReadonlySet<string>,
  leaveOut?: string,
): PackageActorState {
  let status: ActorProgressStatus = "unknown";
  let disposition: ActorDisposition = "neutral";
  const facts: string[] = [];
  for (const event of events) {
    if (
      event.actorId !== actorId ||
      event.certainty !== "confirmed" ||
      superseded.has(event.id) ||
      event.id === leaveOut
    ) {
      continue;
    }
    if (event.status !== undefined) status = event.status;
    if (event.disposition !== undefined) disposition = event.disposition;
    if (event.fact !== undefined) {
      const existingIdx = facts.indexOf(event.fact);
      if (existingIdx >= 0) facts.splice(existingIdx, 1);
      facts.push(event.fact);
      if (facts.length > MAX_ACTOR_REMEMBERED_FACTS) {
        facts.shift();
      }
    }
  }
  return { actorId, status, disposition, facts };
}

function supersedeActorTarget(
  events: readonly PackageActorEvent[],
  input: ActorProgressInput,
): PackageActorEvent | null {
  const target = events.find((e) => e.id === input.supersedes);
  if (!target || target.actorId !== input.actorId) return null;
  return events.some((e) => e.supersedes === target.id) ? null : target;
}

function actorTransitionAllowed(
  events: readonly PackageActorEvent[],
  input: ActorProgressInput,
  current: PackageActorState,
  target: PackageActorEvent | undefined,
): boolean {
  if (input.certainty !== "confirmed" || input.status === undefined) {
    return true;
  }
  if (!target)
    return ALLOWED_ACTOR_STATUS[current.status].includes(input.status);
  const superseded = new Set(events.flatMap((e) => e.supersedes ?? []));
  const baseline = replayActorState(
    events,
    input.actorId,
    superseded,
    target.id,
  );
  return (
    baseline.status === input.status ||
    ALLOWED_ACTOR_STATUS[baseline.status].includes(input.status)
  );
}

type ActorChecked =
  { reason: string } | { current: PackageActorState; fact?: string };

function checkActorInput(
  actors: readonly PackageActorState[],
  events: readonly PackageActorEvent[],
  input: ActorProgressInput,
  note: string,
  knownActors: ReadonlySet<string>,
): ActorChecked {
  if (!knownActors.has(input.actorId)) return { reason: "unknown actor" };
  if (note.length === 0) return { reason: "invalid note" };
  const fact =
    input.fact !== undefined
      ? input.fact.trim().slice(0, MAX_ACTOR_FACT_CHARS)
      : undefined;
  if (input.fact !== undefined && (!fact || fact.length === 0)) {
    return { reason: "invalid fact" };
  }
  if (
    input.status === undefined &&
    input.disposition === undefined &&
    fact === undefined
  ) {
    return { reason: "empty change" };
  }
  const current = actorStateOf(actors, input.actorId);
  let target: PackageActorEvent | undefined;
  if (input.supersedes) {
    target = supersedeActorTarget(events, input) ?? undefined;
    if (
      !target ||
      (input.certainty === "claimed" && target.certainty !== "claimed")
    ) {
      return { reason: "invalid supersede" };
    }
  }
  if (!actorTransitionAllowed(events, input, current, target)) {
    return { reason: "transition not allowed" };
  }
  return { current, fact };
}

function actorEventCapacityProblem(
  actors: readonly PackageActorState[],
  events: readonly PackageActorEvent[],
  input: ActorProgressInput,
  eventId: string,
): string | null {
  if (events.some((e) => e.id === eventId)) return "duplicate event";
  if (events.length >= MAX_PACKAGE_PROGRESS_ENTRIES) return "ledger full";
  if (
    input.certainty === "confirmed" &&
    !actors.some((a) => a.actorId === input.actorId) &&
    actors.length >= MAX_PACKAGE_PROGRESS_ENTRIES
  ) {
    return "ledger full";
  }
  return null;
}

/**
 * Applies actor ledger inputs in order to a copy of `progress`. Rejected
 * inputs are reported in `dropped`; accepted ones are appended and never edited later.
 */
export function applyPackageActorEvents(
  progress: PackageProgress,
  inputs: readonly ActorProgressInput[],
  context: {
    turnId: string;
    index: Pick<PackageProgressIndex, "packageActorIds">;
  },
): PackageProgressResult {
  const next: PackageProgress = {
    sceneId: progress.sceneId,
    version: 1,
    records: structuredClone(progress.records ?? []),
    events: structuredClone(progress.events ?? []),
    actors: structuredClone(progress.actors ?? []),
    actorEvents: structuredClone(progress.actorEvents ?? []),
  };
  const actors = next.actors!;
  const actorEvents = next.actorEvents!;
  const knownActors = new Set(context.index.packageActorIds);
  const dropped: string[] = [];
  let written = 0;
  for (const input of inputs) {
    const note = input.note.trim().slice(0, 240);
    const eventId = `${context.turnId.slice(0, 130)}:actor:${written + 1}`;
    const checked = checkActorInput(
      actors,
      actorEvents,
      input,
      note,
      knownActors,
    );
    const reason =
      "reason" in checked
        ? checked.reason
        : actorEventCapacityProblem(actors, actorEvents, input, eventId);
    if ("reason" in checked || reason !== null) {
      dropped.push(`actorEvents: ${reason} ${input.actorId.slice(0, 80)}`);
      continue;
    }
    actorEvents.push({
      id: eventId,
      turnId: context.turnId.slice(0, 160),
      actorId: input.actorId,
      ...(input.status !== undefined
        ? { fromStatus: checked.current.status, status: input.status }
        : {}),
      ...(input.disposition !== undefined
        ? {
            fromDisposition: checked.current.disposition,
            disposition: input.disposition,
          }
        : {}),
      ...(checked.fact !== undefined ? { fact: checked.fact } : {}),
      certainty: input.certainty,
      note,
      ...(input.supersedes ? { supersedes: input.supersedes } : {}),
    });
    written += 1;
    if (input.certainty === "confirmed") {
      const superseded = new Set(
        actorEvents.flatMap((e) => e.supersedes ?? []),
      );
      const updated = replayActorState(actorEvents, input.actorId, superseded);
      const existing = actors.find((a) => a.actorId === input.actorId);
      if (existing) {
        existing.status = updated.status;
        existing.disposition = updated.disposition;
        existing.facts = updated.facts;
      } else {
        actors.push(updated);
      }
    }
  }
  return { progress: next, dropped };
}

export const MAX_PACKAGE_PROGRESS_PROMPT_CHARS = 4000;
const SUMMARY_EVENTS = 12;
const SUMMARY_NOTE_CHARS = 120;

export interface PackageProgressPromptSummary {
  sceneId: string;
  records: {
    id: string;
    kind: PackageRecordKind;
    status: PackageProgressStatus;
  }[];
  recentEvents: {
    id: string;
    recordId: string;
    certainty: "claimed" | "confirmed";
    note: string;
    to: PackageProgressStatus;
    supersedes?: string;
    superseded?: true;
  }[];
  actors?: PackageActorState[];
  recentActorEvents?: {
    id: string;
    actorId: string;
    certainty: "claimed" | "confirmed";
    note: string;
    status?: ActorProposalStatus;
    disposition?: ActorDisposition;
    fact?: string;
    supersedes?: string;
    superseded?: true;
  }[];
}

function evictExcessActorSummary(
  summary: PackageProgressPromptSummary,
): boolean {
  const actors = summary.actors;
  if (!actors || actors.length === 0) return false;
  let maxFactsIdx = -1;
  let maxFactsLen = 0;
  for (let i = 0; i < actors.length; i++) {
    if (actors[i].facts.length > maxFactsLen) {
      maxFactsLen = actors[i].facts.length;
      maxFactsIdx = i;
    }
  }
  if (maxFactsIdx >= 0) {
    actors[maxFactsIdx].facts.shift();
    return true;
  }
  actors.pop();
  if (actors.length === 0) delete summary.actors;
  return true;
}

/** A bounded GM-only view of the ledger for the prompt; never shown to players. */
export function packageProgressPromptSummary(
  progress: PackageProgress | undefined,
  featuredActorIds?: readonly string[],
): PackageProgressPromptSummary | undefined {
  if (progress?.version !== 1) return undefined;
  const events = progress.events ?? [];
  const superseded = new Set(events.flatMap((e) => e.supersedes ?? []));
  const featured =
    featuredActorIds !== undefined ? new Set(featuredActorIds) : undefined;
  const actors = (progress.actors ?? [])
    .filter((actor) => !featured || featured.has(actor.actorId))
    .map((actor) => ({
      actorId: actor.actorId,
      status: actor.status,
      disposition: actor.disposition,
      facts: [...actor.facts],
    }));
  const actorEvents = (progress.actorEvents ?? []).filter(
    (event) => !featured || featured.has(event.actorId),
  );
  const actorSuperseded = new Set(
    (progress.actorEvents ?? []).flatMap((e) => e.supersedes ?? []),
  );
  const recentActorEvents = actorEvents.slice(-SUMMARY_EVENTS).map((event) => ({
    id: event.id,
    actorId: event.actorId,
    certainty: event.certainty,
    note: event.note.trim().slice(0, SUMMARY_NOTE_CHARS),
    ...(event.status !== undefined ? { status: event.status } : {}),
    ...(event.disposition !== undefined
      ? { disposition: event.disposition }
      : {}),
    ...(event.fact !== undefined ? { fact: event.fact } : {}),
    ...(event.supersedes ? { supersedes: event.supersedes } : {}),
    ...(actorSuperseded.has(event.id) ? { superseded: true as const } : {}),
  }));
  const summary: PackageProgressPromptSummary = {
    sceneId: progress.sceneId,
    records: (progress.records ?? [])
      .filter((record) => record.status !== "unvisited")
      .map(({ id, kind, status }) => ({ id, kind, status })),
    recentEvents: events.slice(-SUMMARY_EVENTS).map((event) => ({
      id: event.id,
      recordId: event.recordId,
      certainty: event.certainty,
      note: event.note.trim().slice(0, SUMMARY_NOTE_CHARS),
      to: event.to,
      ...(event.supersedes ? { supersedes: event.supersedes } : {}),
      ...(superseded.has(event.id) ? { superseded: true as const } : {}),
    })),
    ...(actors.length > 0 ? { actors } : {}),
    ...(recentActorEvents.length > 0 ? { recentActorEvents } : {}),
  };
  const over = () =>
    JSON.stringify(summary).length > MAX_PACKAGE_PROGRESS_PROMPT_CHARS;
  while (
    over() &&
    ((summary.recentActorEvents?.length ?? 0) > 0 ||
      summary.recentEvents.length > 0)
  ) {
    if (summary.recentActorEvents && summary.recentActorEvents.length > 0) {
      summary.recentActorEvents.shift();
      if (summary.recentActorEvents.length === 0) {
        delete summary.recentActorEvents;
      }
    }
    if (over() && summary.recentEvents.length > 0) {
      summary.recentEvents.shift();
    }
  }
  while (over() && evictExcessActorSummary(summary)) {
    // Evict oldest actor facts, then excess actors.
  }
  while (over()) {
    let at = -1;
    for (let i = summary.records.length - 1; i >= 0; i--) {
      if (summary.records[i].status === "available") {
        at = i;
        break;
      }
    }
    if (at < 0) at = summary.records.length - 1;
    if (at < 0) break;
    summary.records.splice(at, 1);
  }
  return summary;
}
