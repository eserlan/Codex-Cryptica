import {
  addExcerpts,
  createExcerptAdmission,
  type ExcerptAdmission,
} from "./retrieval-budget";
import { recordExcerpts, type ExcerptRecord } from "./retrieval-excerpts";
import { adventureJsonHiddenRecordIds } from "./retrieval-privacy";
import {
  actorLines,
  clueLines,
  encounterLines,
  itemLines,
  locationLines,
  premiseLines,
  rumourLines,
  sceneLines,
  secretLines,
  systemLines,
} from "./retrieval-record-lines";
import { buildText, type Line } from "./retrieval-text";
import type {
  AdventureJsonExcerptKind,
  AdventureJsonRetrievalFocus,
} from "./retrieval-types";
import type {
  AdventureJsonEncounter,
  AdventureJsonScene,
  AdventureJsonV1,
} from "./schema";

interface Selection extends ExcerptAdmission {
  pkg: AdventureJsonV1;
  scene: AdventureJsonScene;
  locationId: string | undefined;
  /** Ids of every package record that is not player-visible. */
  hiddenIds: Set<string>;
  actorIds: Set<string>;
}

function addRecord(
  sel: Selection,
  kind: AdventureJsonExcerptKind,
  record: ExcerptRecord,
  lines: Iterable<Line>,
  selectable = true,
  focusScene = false,
): void {
  if (sel.stopped) return;
  addExcerpts(
    sel,
    recordExcerpts(sel.hiddenIds, kind, record, lines, sel.maxCharacters),
    selectable,
    focusScene,
  );
}

/** Visits matching records in source order and returns only admitted records. */
function addMatchingRecords<T extends ExcerptRecord>(
  sel: Selection,
  kind: AdventureJsonExcerptKind,
  records: T[],
  matches: (record: T) => boolean,
  lines: (record: T) => Iterable<Line>,
  selectable = true,
): T[] {
  const admitted: T[] = [];
  for (const record of records) {
    if (sel.stopped) break;
    if (!matches(record)) continue;
    const before = sel.excerpts.length;
    addRecord(sel, kind, record, lines(record), selectable);
    if (sel.excerpts.length > before) admitted.push(record);
  }
  return admitted;
}

function addOverview(
  sel: Selection,
  kind: "premise" | "system",
  lines: Line[],
): void {
  addExcerpts(
    sel,
    {
      id: kind,
      kind,
      visibility: "player-visible",
      epistemicStatus: "explicit",
      text: buildText(lines, sel.maxCharacters),
    },
    false,
  );
}

function addPremiseAndSystem(sel: Selection): void {
  if (sel.stopped) return;
  const { premise, system } = sel.pkg;
  addOverview(sel, "premise", premiseLines(premise));
  if (!system || sel.stopped) return;
  addOverview(sel, "system", systemLines(system));
}

function atLocation(sel: Selection, locationId: string | undefined): boolean {
  return sel.locationId !== undefined && locationId === sel.locationId;
}

function atActor(sel: Selection, actorId: string | undefined): boolean {
  return actorId !== undefined && sel.actorIds.has(actorId);
}

function addEncounters(sel: Selection): AdventureJsonEncounter[] {
  return addMatchingRecords(
    sel,
    "encounter",
    sel.pkg.encounters,
    (encounter) =>
      encounter.sceneId === sel.scene.id ||
      atLocation(sel, encounter.locationId),
    encounterLines,
  );
}

function addActors(
  sel: Selection,
  focusActorIds: string[] | undefined,
  encounters: AdventureJsonEncounter[],
): void {
  const wanted = new Set([
    ...(focusActorIds ?? []),
    ...encounters.flatMap((encounter) => encounter.actorIds ?? []),
  ]);
  for (const actor of sel.pkg.actors) {
    if (sel.stopped) break;
    const atFocusLocation = atLocation(sel, actor.locationId);
    if (!wanted.has(actor.id) && !atFocusLocation) continue;
    sel.actorIds.add(actor.id);
    addRecord(sel, "actor", actor, actorLines(actor));
  }
}

function addClues(sel: Selection): void {
  addMatchingRecords(
    sel,
    "clue",
    sel.pkg.clues,
    (clue) =>
      clue.placedSceneId === sel.scene.id ||
      atLocation(sel, clue.placedLocationId) ||
      atActor(sel, clue.placedActorId),
    clueLines,
  );
}

function addItems(sel: Selection): void {
  addMatchingRecords(
    sel,
    "item",
    sel.pkg.items,
    (item) => atLocation(sel, item.locationId) || atActor(sel, item.actorId),
    itemLines,
  );
}

function addRumours(sel: Selection): void {
  const anchors = new Set<string>([sel.scene.id, ...sel.actorIds]);
  if (sel.locationId !== undefined) anchors.add(sel.locationId);
  addMatchingRecords(
    sel,
    "rumour",
    sel.pkg.rumours,
    (rumour) =>
      [
        rumour.sourceActorId,
        rumour.sourceLocationId,
        rumour.targetEntityId,
      ].some((id) => id !== undefined && anchors.has(id)),
    rumourLines,
  );
}

function addSecrets(sel: Selection): void {
  addMatchingRecords(
    sel,
    "secret",
    sel.pkg.secrets,
    (secret) =>
      (secret.relatedEntityIds ?? []).some((id) => sel.selectedIds.has(id)),
    secretLines,
    false,
  );
}

export function selectExcerpts(
  pkg: AdventureJsonV1,
  focus: AdventureJsonRetrievalFocus,
  sceneId: string,
  maxCharacters: number,
): ExcerptAdmission {
  // Matching requires one in-memory pass over each package tier. Admission
  // happens as records are visited so excerpts and serialized prefixes never
  // accumulate beyond the output budget.
  const scene = pkg.scenes.find((scene) => scene.id === sceneId)!;
  const location =
    pkg.locations.find((location) => location.id === focus.locationId) ??
    pkg.locations.find((location) => location.id === scene.locationId);
  const sel: Selection = {
    pkg,
    scene,
    locationId: location?.id,
    ...createExcerptAdmission(maxCharacters),
    hiddenIds: new Set(adventureJsonHiddenRecordIds(pkg)),
    actorIds: new Set(),
  };

  addRecord(sel, "scene", scene, sceneLines(scene), true, true);
  addPremiseAndSystem(sel);
  if (location) addRecord(sel, "location", location, locationLines(location));
  const encounters = addEncounters(sel);
  addActors(sel, focus.actorIds, encounters);
  addClues(sel);
  addItems(sel);
  addRumours(sel);
  addSecrets(sel);
  return sel;
}
