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

function clonePackageProgress(
  progress: PackageProgress,
  includeActors = false,
): PackageProgress {
  return {
    sceneId: progress.sceneId,
    version: 1,
    records: structuredClone(progress.records ?? []),
    events: structuredClone(progress.events ?? []),
    ...(includeActors || progress.actors !== undefined
      ? { actors: structuredClone(progress.actors ?? []) }
      : {}),
    ...(includeActors || progress.actorEvents !== undefined
      ? { actorEvents: structuredClone(progress.actorEvents ?? []) }
      : {}),
  };
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
  const next = clonePackageProgress(progress);
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

function appendRememberedFact(facts: string[], fact: string): void {
  const existingIdx = facts.indexOf(fact);
  if (existingIdx >= 0) facts.splice(existingIdx, 1);
  facts.push(fact);
  if (facts.length > MAX_ACTOR_REMEMBERED_FACTS) {
    facts.shift();
  }
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
    const skip =
      event.actorId !== actorId ||
      event.certainty !== "confirmed" ||
      superseded.has(event.id) ||
      event.id === leaveOut;
    if (skip) continue;
    status = event.status ?? status;
    disposition = event.disposition ?? disposition;
    if (event.fact !== undefined) appendRememberedFact(facts, event.fact);
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

function validateActorFields(
  input: ActorProgressInput,
  note: string,
  knownActors: ReadonlySet<string>,
): { reason: string } | { fact?: string } {
  if (!knownActors.has(input.actorId)) return { reason: "unknown actor" };
  if (note.length === 0) return { reason: "invalid note" };
  const fact = input.fact?.trim().slice(0, MAX_ACTOR_FACT_CHARS);
  if (input.fact !== undefined && !fact) return { reason: "invalid fact" };
  const hasChange =
    input.status !== undefined ||
    input.disposition !== undefined ||
    fact !== undefined;
  return hasChange ? { fact } : { reason: "empty change" };
}

function checkActorInput(
  actors: readonly PackageActorState[],
  events: readonly PackageActorEvent[],
  input: ActorProgressInput,
  note: string,
  knownActors: ReadonlySet<string>,
): ActorChecked {
  const fields = validateActorFields(input, note, knownActors);
  if ("reason" in fields) return fields;
  const current = actorStateOf(actors, input.actorId);
  let target: PackageActorEvent | undefined;
  if (input.supersedes) {
    target = supersedeActorTarget(events, input) ?? undefined;
    const claimedOnConfirmed =
      input.certainty === "claimed" && target?.certainty !== "claimed";
    if (!target || claimedOnConfirmed) return { reason: "invalid supersede" };
  }
  if (!actorTransitionAllowed(events, input, current, target)) {
    return { reason: "transition not allowed" };
  }
  return { current, fact: fields.fact };
}

function actorEventCapacityProblem(
  actors: readonly PackageActorState[],
  events: readonly PackageActorEvent[],
  input: ActorProgressInput,
  eventId: string,
): string | null {
  if (events.some((e) => e.id === eventId)) return "duplicate event";
  if (events.length >= MAX_PACKAGE_PROGRESS_ENTRIES) return "ledger full";
  const needsNewActorSlot =
    input.certainty === "confirmed" &&
    !actors.some((a) => a.actorId === input.actorId) &&
    actors.length >= MAX_PACKAGE_PROGRESS_ENTRIES;
  return needsNewActorSlot ? "ledger full" : null;
}

function buildActorEvent(
  input: ActorProgressInput,
  eventId: string,
  turnId: string,
  note: string,
  checked: { current: PackageActorState; fact?: string },
): PackageActorEvent {
  return {
    id: eventId,
    turnId: turnId.slice(0, 160),
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
  };
}

function syncConfirmedActorState(
  actors: PackageActorState[],
  actorEvents: readonly PackageActorEvent[],
  actorId: string,
): void {
  const superseded = new Set(actorEvents.flatMap((e) => e.supersedes ?? []));
  const updated = replayActorState(actorEvents, actorId, superseded);
  const existing = actors.find((a) => a.actorId === actorId);
  if (existing) {
    existing.status = updated.status;
    existing.disposition = updated.disposition;
    existing.facts = updated.facts;
  } else {
    actors.push(updated);
  }
}

function tryApplyActorEvent(
  actors: PackageActorState[],
  actorEvents: PackageActorEvent[],
  input: ActorProgressInput,
  context: {
    turnId: string;
    eventId: string;
    knownActors: ReadonlySet<string>;
  },
): string | null {
  const note = input.note.trim().slice(0, 240);
  const checked = checkActorInput(
    actors,
    actorEvents,
    input,
    note,
    context.knownActors,
  );
  const reason =
    "reason" in checked
      ? checked.reason
      : actorEventCapacityProblem(actors, actorEvents, input, context.eventId);
  if ("reason" in checked || reason !== null) {
    return `actorEvents: ${reason} ${input.actorId.slice(0, 80)}`;
  }
  actorEvents.push(
    buildActorEvent(input, context.eventId, context.turnId, note, checked),
  );
  if (input.certainty === "confirmed") {
    syncConfirmedActorState(actors, actorEvents, input.actorId);
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
  const next = clonePackageProgress(progress, true);
  const actors = next.actors!;
  const actorEvents = next.actorEvents!;
  const knownActors = new Set(context.index.packageActorIds);
  const dropped: string[] = [];
  let written = 0;
  for (const input of inputs) {
    const eventId = `${context.turnId.slice(0, 130)}:actor:${written + 1}`;
    const problem = tryApplyActorEvent(actors, actorEvents, input, {
      turnId: context.turnId,
      eventId,
      knownActors,
    });
    if (problem) dropped.push(problem);
    else written += 1;
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

function summarizeActors(
  progress: PackageProgress,
  featured: ReadonlySet<string> | undefined,
): PackageActorState[] {
  return (progress.actors ?? [])
    .filter((actor) => !featured || featured.has(actor.actorId))
    .map((actor) => ({
      actorId: actor.actorId,
      status: actor.status,
      disposition: actor.disposition,
      facts: [...actor.facts],
    }));
}

function summarizeRecentActorEvents(
  progress: PackageProgress,
  featured: ReadonlySet<string> | undefined,
): NonNullable<PackageProgressPromptSummary["recentActorEvents"]> {
  const all = progress.actorEvents ?? [];
  const superseded = new Set(all.flatMap((e) => e.supersedes ?? []));
  return all
    .filter((event) => !featured || featured.has(event.actorId))
    .slice(-SUMMARY_EVENTS)
    .map((event) => ({
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
      ...(superseded.has(event.id) ? { superseded: true as const } : {}),
    }));
}

function summarizeRecentEvents(
  events: readonly PackageProgressEvent[],
): PackageProgressPromptSummary["recentEvents"] {
  const superseded = new Set(events.flatMap((e) => e.supersedes ?? []));
  return events.slice(-SUMMARY_EVENTS).map((event) => ({
    id: event.id,
    recordId: event.recordId,
    certainty: event.certainty,
    note: event.note.trim().slice(0, SUMMARY_NOTE_CHARS),
    to: event.to,
    ...(event.supersedes ? { supersedes: event.supersedes } : {}),
    ...(superseded.has(event.id) ? { superseded: true as const } : {}),
  }));
}

function shiftOneSummaryEvent(summary: PackageProgressPromptSummary): boolean {
  if (summary.recentActorEvents?.length) {
    summary.recentActorEvents.shift();
    if (summary.recentActorEvents.length === 0)
      delete summary.recentActorEvents;
    return true;
  }
  if (summary.recentEvents.length > 0) {
    summary.recentEvents.shift();
    return true;
  }
  return false;
}

function evictSummaryEvents(
  summary: PackageProgressPromptSummary,
  over: () => boolean,
): void {
  while (over() && shiftOneSummaryEvent(summary)) {
    // Evict oldest actor events before older package events.
  }
}

function evictSummaryRecords(
  summary: PackageProgressPromptSummary,
  over: () => boolean,
): void {
  while (over() && summary.records.length > 0) {
    const availIdx = summary.records.findLastIndex(
      (r) => r.status === "available",
    );
    summary.records.splice(
      availIdx >= 0 ? availIdx : summary.records.length - 1,
      1,
    );
  }
}

/** A bounded GM-only view of the ledger for the prompt; never shown to players. */
export function packageProgressPromptSummary(
  progress: PackageProgress | undefined,
  featuredActorIds?: readonly string[],
): PackageProgressPromptSummary | undefined {
  if (progress?.version !== 1) return undefined;
  const featured =
    featuredActorIds !== undefined ? new Set(featuredActorIds) : undefined;
  const actors = summarizeActors(progress, featured);
  const recentActorEvents = summarizeRecentActorEvents(progress, featured);
  const summary: PackageProgressPromptSummary = {
    sceneId: progress.sceneId,
    records: (progress.records ?? [])
      .filter((record) => record.status !== "unvisited")
      .map(({ id, kind, status }) => ({ id, kind, status })),
    recentEvents: summarizeRecentEvents(progress.events ?? []),
    ...(actors.length > 0 ? { actors } : {}),
    ...(recentActorEvents.length > 0 ? { recentActorEvents } : {}),
  };
  const over = () =>
    JSON.stringify(summary).length > MAX_PACKAGE_PROGRESS_PROMPT_CHARS;
  evictSummaryEvents(summary, over);
  while (over() && evictExcessActorSummary(summary)) {
    // Evict oldest actor facts, then excess actors.
  }
  evictSummaryRecords(summary, over);
  return summary;
}
