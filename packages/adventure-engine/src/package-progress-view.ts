import type { AdventureJsonV1 } from "./adventure-json";
import type {
  PackageProgress,
  PackageProgressEvent,
  PackageProgressStatus,
  PackageRecordKind,
} from "./types";

export interface PlayerProgressScene {
  id: string;
  title: string;
  summary: string;
}

export interface PlayerPackageProgress {
  currentScene?: PlayerProgressScene;
  visitedScenes: PlayerProgressScene[];
  foundClues: { id: string; text: string }[];
}

export interface PackageAuditEvent {
  id: string;
  turnId: string;
  from: PackageProgressStatus;
  to: PackageProgressStatus;
  certainty: "claimed" | "confirmed";
  note: string;
  supersedes?: string;
  supersededBy?: string;
}

export interface PackageAuditEntry {
  recordId: string;
  kind: PackageRecordKind;
  label: string;
  visibility: "player-visible" | "gm-only" | "unknown";
  status: PackageProgressStatus;
  events: PackageAuditEvent[];
}

const SEEN: readonly PackageProgressStatus[] = [
  "active",
  "resolved",
  "altered",
];

/** Ids of confirmed, active-or-later events that no later event supersedes, in ledger order. */
function countingRecordIds(events: readonly PackageProgressEvent[]): string[] {
  const superseded = new Set(
    events.flatMap((event) => (event.supersedes ? [event.supersedes] : [])),
  );
  const ids: string[] = [];
  const included = new Set<string>();
  for (const event of events) {
    if (
      event.certainty === "confirmed" &&
      !superseded.has(event.id) &&
      SEEN.includes(event.to) &&
      !included.has(event.recordId)
    ) {
      ids.push(event.recordId);
      included.add(event.recordId);
    }
  }
  return ids;
}

type PackageRecordDetails = Pick<PackageAuditEntry, "label" | "visibility">;
interface PackageRecordIndex {
  byKind: Map<PackageRecordKind, Map<string, PackageRecordDetails>>;
  sceneSummaries: Map<string, string>;
}

const packageRecordIndexes = new WeakMap<AdventureJsonV1, PackageRecordIndex>();

function indexPackageRecords(pkg: AdventureJsonV1): PackageRecordIndex {
  const cached = packageRecordIndexes.get(pkg);
  if (cached) return cached;
  const index = new Map<PackageRecordKind, Map<string, PackageRecordDetails>>([
    ["scene", new Map()],
    ["encounter", new Map()],
    ["clue", new Map()],
    ["secret", new Map()],
  ]);
  const add = (
    kind: PackageRecordKind,
    id: string,
    label: string | undefined,
    visibility: PackageRecordDetails["visibility"],
  ) => {
    const records = index.get(kind)!;
    if (!records.has(id)) records.set(id, { label: label || id, visibility });
  };

  for (const scene of pkg.scenes)
    add("scene", scene.id, scene.title, scene.visibility);
  for (const encounter of pkg.encounters)
    add("encounter", encounter.id, encounter.title, encounter.visibility);
  for (const clue of pkg.clues)
    add("clue", clue.id, clue.text, clue.visibility);
  for (const secret of pkg.secrets)
    add("secret", secret.id, secret.text, secret.visibility);
  const result = {
    byKind: index,
    sceneSummaries: new Map(
      pkg.scenes.map((scene) => [scene.id, scene.summary]),
    ),
  };
  packageRecordIndexes.set(pkg, result);
  return result;
}

/** What a player may see: confirmed, player-visible scenes and clues only. */
export function projectPlayerPackageProgress(
  pkg: AdventureJsonV1,
  progress: PackageProgress | undefined,
): PlayerPackageProgress {
  const counted = countingRecordIds(progress?.events ?? []);
  const packageIndex = indexPackageRecords(pkg);
  const records = packageIndex.byKind;
  const scenes = records.get("scene")!;
  const clues = records.get("clue")!;
  const sceneSummaries = packageIndex.sceneSummaries;
  const visited: PlayerProgressScene[] = [];
  const foundClues: PlayerPackageProgress["foundClues"] = [];
  for (const id of counted) {
    const scene = scenes.get(id);
    if (scene) {
      if (scene.visibility === "player-visible") {
        visited.push({
          id,
          title: scene.label,
          summary: sceneSummaries.get(id) ?? "",
        });
      }
      continue;
    }
    const clue = clues.get(id);
    if (clue?.visibility === "player-visible") {
      foundClues.push({ id, text: clue.label });
    }
  }
  const currentScene = visited.find((scene) => scene.id === progress?.sceneId);
  return {
    ...(currentScene ? { currentScene } : {}),
    visitedScenes: visited.filter((scene) => scene !== currentScene),
    foundClues,
  };
}

/** Every touched record with its full event history, claims and superseded events included. */
export function projectPackageProgressAudit(
  pkg: AdventureJsonV1,
  progress: PackageProgress | undefined,
): PackageAuditEntry[] {
  const events = progress?.events ?? [];
  const packageRecords = indexPackageRecords(pkg).byKind;
  const supersededBy = new Map<string, string>();
  const eventsByRecord = new Map<string, PackageProgressEvent[]>();
  const kinds = new Map<string, PackageRecordKind>();
  for (const event of events) {
    if (event.supersedes) supersededBy.set(event.supersedes, event.id);
    const group = eventsByRecord.get(event.recordId);
    if (group) group.push(event);
    else eventsByRecord.set(event.recordId, [event]);
    if (!kinds.has(event.recordId)) kinds.set(event.recordId, event.kind);
  }
  const statuses = new Map<string, PackageProgressStatus>();
  for (const record of progress?.records ?? []) {
    if (!statuses.has(record.id)) statuses.set(record.id, record.status);
    if (!kinds.has(record.id)) kinds.set(record.id, record.kind);
  }
  const recordIds = [...eventsByRecord.keys()];
  for (const record of progress?.records ?? []) {
    if (!eventsByRecord.has(record.id)) recordIds.push(record.id);
  }
  return recordIds.map((recordId) => {
    const kind = kinds.get(recordId)!;
    const details = packageRecords.get(kind)?.get(recordId) ?? {
      label: recordId,
      visibility: "unknown" as const,
    };
    return {
      recordId,
      kind,
      ...details,
      status: statuses.get(recordId) ?? "unvisited",
      events: (eventsByRecord.get(recordId) ?? []).map((event) => ({
        id: event.id,
        turnId: event.turnId,
        from: event.from,
        to: event.to,
        certainty: event.certainty,
        note: event.note,
        ...(event.supersedes ? { supersedes: event.supersedes } : {}),
        ...(supersededBy.has(event.id)
          ? { supersededBy: supersededBy.get(event.id) }
          : {}),
      })),
    };
  });
}
