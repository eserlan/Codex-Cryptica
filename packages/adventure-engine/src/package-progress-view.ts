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
  for (const event of events) {
    if (
      event.certainty === "confirmed" &&
      !superseded.has(event.id) &&
      SEEN.includes(event.to) &&
      !ids.includes(event.recordId)
    ) {
      ids.push(event.recordId);
    }
  }
  return ids;
}

/** What a player may see: confirmed, player-visible scenes and clues only. */
export function projectPlayerPackageProgress(
  pkg: AdventureJsonV1,
  progress: PackageProgress | undefined,
): PlayerPackageProgress {
  const counted = countingRecordIds(progress?.events ?? []);
  const visited: PlayerProgressScene[] = [];
  const foundClues: PlayerPackageProgress["foundClues"] = [];
  for (const id of counted) {
    const scene = pkg.scenes.find((item) => item.id === id);
    if (scene) {
      if (scene.visibility === "player-visible") {
        visited.push({
          id: scene.id,
          title: scene.title,
          summary: scene.summary,
        });
      }
      continue;
    }
    const clue = pkg.clues.find((item) => item.id === id);
    if (clue?.visibility === "player-visible") {
      foundClues.push({ id: clue.id, text: clue.text });
    }
  }
  const currentScene = visited.find((scene) => scene.id === progress?.sceneId);
  return {
    ...(currentScene ? { currentScene } : {}),
    visitedScenes: visited.filter((scene) => scene !== currentScene),
    foundClues,
  };
}

function describeRecord(
  pkg: AdventureJsonV1,
  kind: PackageRecordKind,
  recordId: string,
): Pick<PackageAuditEntry, "label" | "visibility"> {
  const found =
    kind === "scene"
      ? pkg.scenes.find((item) => item.id === recordId)
      : kind === "encounter"
        ? pkg.encounters.find((item) => item.id === recordId)
        : kind === "clue"
          ? pkg.clues.find((item) => item.id === recordId)
          : pkg.secrets.find((item) => item.id === recordId);
  if (!found) return { label: recordId, visibility: "unknown" };
  const label =
    "title" in found ? found.title : "text" in found ? found.text : recordId;
  return { label: label || recordId, visibility: found.visibility };
}

/** Every touched record with its full event history, claims and superseded events included. */
export function projectPackageProgressAudit(
  pkg: AdventureJsonV1,
  progress: PackageProgress | undefined,
): PackageAuditEntry[] {
  const events = progress?.events ?? [];
  const supersededBy = new Map<string, string>();
  for (const event of events) {
    if (event.supersedes) supersededBy.set(event.supersedes, event.id);
  }
  const order = new Map<string, PackageRecordKind>();
  for (const event of events) {
    if (!order.has(event.recordId)) order.set(event.recordId, event.kind);
  }
  for (const record of progress?.records ?? []) {
    if (!order.has(record.id)) order.set(record.id, record.kind);
  }
  return [...order].map(([recordId, kind]) => ({
    recordId,
    kind,
    ...describeRecord(pkg, kind, recordId),
    status:
      progress?.records?.find((record) => record.id === recordId)?.status ??
      "unvisited",
    events: events
      .filter((event) => event.recordId === recordId)
      .map((event) => ({
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
  }));
}
