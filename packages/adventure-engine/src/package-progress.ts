import type { AdventureJsonV1 } from "./adventure-json";
import { MAX_PACKAGE_PROGRESS_ENTRIES } from "./schemas";
import type {
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
}

/** A bounded GM-only view of the ledger for the prompt; never shown to players. */
export function packageProgressPromptSummary(
  progress: PackageProgress | undefined,
): PackageProgressPromptSummary | undefined {
  if (progress?.version !== 1) return undefined;
  const events = progress.events ?? [];
  const superseded = new Set(events.flatMap((e) => e.supersedes ?? []));
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
  };
  const over = () =>
    JSON.stringify(summary).length > MAX_PACKAGE_PROGRESS_PROMPT_CHARS;
  while (over() && summary.recentEvents.length > 0) {
    summary.recentEvents.shift();
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
  return over() ? undefined : summary;
}
