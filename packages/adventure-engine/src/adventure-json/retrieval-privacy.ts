import { createBoundaryMatcher, isFreeTextMatchableId } from "./term-matcher";
import type { AdventureJsonV1 } from "./schema";
import type { PackageProgress } from "../types";

export interface AdventureJsonRevelationScope {
  readonly revealedReadAloudSceneIds?: ReadonlySet<string>;
}

const REACHED_SCENE_STATUSES = new Set(["active", "resolved", "altered"]);

/** Derives authorised package revelation solely from committed engine progress. */
export function authorisedPackageRevelationScope(
  progress?: PackageProgress,
): AdventureJsonRevelationScope {
  const revealedReadAloudSceneIds = new Set<string>();
  if (progress?.sceneId) {
    revealedReadAloudSceneIds.add(progress.sceneId);
  }
  for (const record of progress?.records ?? []) {
    if (record.kind === "scene" && REACHED_SCENE_STATUSES.has(record.status)) {
      revealedReadAloudSceneIds.add(record.id);
    }
  }
  return { revealedReadAloudSceneIds };
}

function adventureJsonRecords(pkg: AdventureJsonV1) {
  return [
    ...pkg.locations,
    ...pkg.actors,
    ...pkg.factions,
    ...pkg.scenes,
    ...pkg.encounters,
    ...pkg.clues,
    ...pkg.rumours,
    ...pkg.items,
    ...pkg.secrets,
  ];
}

export function adventureJsonRecordIds(pkg: AdventureJsonV1): string[] {
  return adventureJsonRecords(pkg).map((record) => record.id);
}

export function adventureJsonHiddenRecordIds(pkg: AdventureJsonV1): string[] {
  return adventureJsonRecords(pkg)
    .filter((record) => record.visibility !== "player-visible")
    .map((record) => record.id);
}

const GM_ONLY_TEXT_KEYS = [
  "name",
  "title",
  "summary",
  "description",
  "text",
  "body",
  "readAloud",
  "conditions",
] as const;

function appendTextValues(out: Set<string>, value: unknown): void {
  if (typeof value === "string") {
    if (value.length > 0) out.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.length > 0) out.add(item);
    }
  }
}

function appendAlternativeSolutionText(out: Set<string>, value: unknown): void {
  if (!Array.isArray(value)) return;
  for (const solution of value) {
    if (!solution || typeof solution !== "object") continue;
    const { method, description } = solution as Record<string, unknown>;
    appendTextValues(out, method);
    appendTextValues(out, description);
  }
}

function collectGmRecordText(
  out: Set<string>,
  record: ReturnType<typeof adventureJsonRecords>[number],
  allowReadAloud: boolean,
): void {
  const fields = record as Record<string, unknown>;
  for (const key of GM_ONLY_TEXT_KEYS) {
    if (key === "readAloud" && allowReadAloud) continue;
    appendTextValues(out, fields[key]);
  }
  appendAlternativeSolutionText(out, fields.alternativeSolutions);
  appendTextValues(out, record.sourceRef?.textQuote);
}

/** Collects unrevealed GM-only text across the package, omitting only explicitly authorised fields. */
export function adventureJsonGmOnlyText(
  pkg: AdventureJsonV1,
  scope?: AdventureJsonRevelationScope,
): string[] {
  const out = new Set<string>();
  const revealedSceneIds = scope?.revealedReadAloudSceneIds;
  const sceneIds = new Set(pkg.scenes.map((scene) => scene.id));
  for (const secret of pkg.secrets) appendTextValues(out, secret.text);
  for (const clue of pkg.clues) appendTextValues(out, clue.reveals);
  for (const record of adventureJsonRecords(pkg)) {
    if (record.visibility === "player-visible") continue;
    const allowReadAloud =
      sceneIds.has(record.id) && Boolean(revealedSceneIds?.has(record.id));
    collectGmRecordText(out, record, allowReadAloud);
  }
  return [...out];
}

/** The rule retrieval uses to decide that a line of text names a hidden record ID. */
export function createAdventureJsonHiddenIdMatcher(
  hiddenIds: Iterable<string>,
): (text: string) => boolean {
  return createBoundaryMatcher([...hiddenIds].filter(isFreeTextMatchableId));
}
