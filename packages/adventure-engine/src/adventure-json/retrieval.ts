import {
  addExcerpts as add,
  clampMaxCharacters,
  createExcerptAdmission,
  type ExcerptAdmission,
} from "./retrieval-budget";
import { recordExcerpts } from "./retrieval-excerpts";
import { splitByVisibility } from "./retrieval-format";
import {
  buildText,
  referenceLine,
  referenceLines,
  type Line,
} from "./retrieval-text";
import type {
  AdventureJsonRetrievalFocus,
  AdventureJsonRetrievalResult,
} from "./retrieval-types";
import { adventureJsonHiddenRecordIds } from "./retrieval-privacy";
export type {
  AdventureJsonExcerpt,
  AdventureJsonExcerptKind,
  AdventureJsonRetrievalFocus,
  AdventureJsonRetrievalResult,
} from "./retrieval-types";
export {
  adventureJsonRecordIds,
  adventureJsonHiddenRecordIds,
  adventureJsonGmOnlyText,
  createAdventureJsonHiddenIdMatcher,
} from "./retrieval-privacy";
export { formatAdventureJsonExcerpts } from "./retrieval-format";
import { entrySceneId } from "./entry-scene";
import type {
  AdventureJsonEncounter,
  AdventureJsonLocation,
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

function addScene(sel: Selection): void {
  if (sel.stopped) return;
  const scene = sel.scene;
  add(
    sel,
    recordExcerpts(
      sel.hiddenIds,
      "scene",
      scene,
      (function* (): Iterable<Line> {
        yield ["Title", scene.title];
        yield ["Summary", scene.summary];
        yield referenceLine("Location", scene.locationId);
        yield [
          "Read aloud",
          typeof scene.readAloud === "string"
            ? [scene.readAloud]
            : scene.readAloud,
        ];
        yield ["Body", scene.body];
        yield ["Conditions", scene.conditions];
        for (const b of scene.branches ?? []) {
          yield referenceLine("Branch target", b.targetSceneId);
          yield [
            "Branch",
            [b.description, ...(b.condition ? [b.condition] : [])],
          ];
        }
      })(),
      sel.maxCharacters,
    ),
    true,
    true,
  );
}

function range(min?: number, max?: number): string | undefined {
  if (min === undefined && max === undefined) return undefined;
  return `${min ?? "?"}-${max ?? "?"}`;
}

function addPremiseAndSystem(sel: Selection): void {
  if (sel.stopped) return;
  const { premise, system } = sel.pkg;
  add(
    sel,
    {
      id: "premise",
      kind: "premise",
      visibility: "player-visible",
      epistemicStatus: "explicit",
      text: buildText(
        [
          ["Background", premise.background],
          ["Hook", premise.hook],
          ["Theme", premise.theme],
          ["Tone", premise.tone],
        ],
        sel.maxCharacters,
      ),
    },
    false,
  );
  if (!system || sel.stopped) return;
  const target = system.targetParty;
  add(
    sel,
    {
      id: "system",
      kind: "system",
      visibility: "player-visible",
      epistemicStatus: "explicit",
      text: buildText(
        [
          ["Name", system.name],
          ["Party size", range(target?.sizeMin, target?.sizeMax)],
          ["Party level", range(target?.levelMin, target?.levelMax)],
        ],
        sel.maxCharacters,
      ),
    },
    false,
  );
}

function addLocation(sel: Selection, location: AdventureJsonLocation): void {
  if (sel.stopped) return;
  add(
    sel,
    recordExcerpts(
      sel.hiddenIds,
      "location",
      location,
      (function* (): Iterable<Line> {
        yield ["Name", location.name];
        yield ["Summary", location.summary];
        yield ["Description", location.description];
        yield referenceLine("Parent location", location.parentLocationId);
        for (const c of location.connections ?? []) {
          yield referenceLine("Connection target", c.targetLocationId);
          yield [
            "Connection",
            [c.description, ...(c.travelConditions ?? [])].filter(
              (value): value is string => value !== undefined,
            ),
          ];
        }
      })(),
      sel.maxCharacters,
    ),
    true,
  );
}

function addEncounters(sel: Selection): AdventureJsonEncounter[] {
  const encounters: AdventureJsonEncounter[] = [];
  for (const e of sel.pkg.encounters) {
    if (sel.stopped) break;
    if (
      e.sceneId !== sel.scene.id &&
      !(sel.locationId !== undefined && e.locationId === sel.locationId)
    )
      continue;
    const before = sel.excerpts.length;
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "encounter",
        e,
        (function* (): Iterable<Line> {
          yield ["Title", e.title];
          yield referenceLine("Scene", e.sceneId);
          yield referenceLine("Location", e.locationId);
          yield ["Description", e.description];
          yield ["Conditions", e.conditions];
          yield referenceLines("Actors", e.actorIds);
          for (const solution of e.alternativeSolutions) {
            yield [
              "Alternative solution",
              [solution.method, solution.description],
            ];
          }
        })(),
        sel.maxCharacters,
      ),
      true,
    );
    if (sel.excerpts.length > before) encounters.push(e);
  }
  return encounters;
}

function addActors(
  sel: Selection,
  focusActorIds: string[] | undefined,
  encounters: AdventureJsonEncounter[],
): void {
  const wanted = new Set([
    ...(focusActorIds ?? []),
    ...encounters.flatMap((e) => e.actorIds ?? []),
  ]);
  for (const a of sel.pkg.actors) {
    if (sel.stopped) break;
    const atLocation =
      sel.locationId !== undefined && a.locationId === sel.locationId;
    if (!wanted.has(a.id) && !atLocation) continue;
    sel.actorIds.add(a.id);
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "actor",
        a,
        [
          ["Name", a.name],
          ["Summary", a.summary],
          ["Description", a.description],
          ["Role", a.role],
          ["Motivation", a.motivation],
          ["Disposition", a.disposition],
          referenceLine("Faction", a.factionId),
          referenceLine("Location", a.locationId),
        ],
        sel.maxCharacters,
      ),
      true,
    );
  }
}

function addClues(sel: Selection): void {
  for (const c of sel.pkg.clues) {
    if (sel.stopped) break;
    const matches =
      c.placedSceneId === sel.scene.id ||
      (c.placedLocationId !== undefined &&
        c.placedLocationId === sel.locationId) ||
      (c.placedActorId !== undefined && sel.actorIds.has(c.placedActorId));
    if (!matches) continue;
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "clue",
        c,
        [
          ["Text", c.text],
          ["Reveals", c.reveals, true],
          referenceLine("Lead target", c.leadTargetId),
          referenceLine("Placed scene", c.placedSceneId),
          referenceLine("Placed location", c.placedLocationId),
          referenceLine("Placed actor", c.placedActorId),
          referenceLine("Alternative source", c.alternativeSourceId),
        ],
        sel.maxCharacters,
      ),
      true,
    );
  }
}

function addItems(sel: Selection): void {
  for (const i of sel.pkg.items) {
    if (sel.stopped) break;
    const matches =
      (i.locationId !== undefined && i.locationId === sel.locationId) ||
      (i.actorId !== undefined && sel.actorIds.has(i.actorId));
    if (!matches) continue;
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "item",
        i,
        [
          ["Name", i.name],
          ["Summary", i.summary],
          ["Description", i.description],
          referenceLine("Location", i.locationId),
          referenceLine("Actor", i.actorId),
        ],
        sel.maxCharacters,
      ),
      true,
    );
  }
}

function addRumours(sel: Selection): void {
  const anchors = new Set<string>([sel.scene.id, ...sel.actorIds]);
  if (sel.locationId !== undefined) anchors.add(sel.locationId);
  for (const r of sel.pkg.rumours) {
    if (sel.stopped) break;
    const refs = [r.sourceActorId, r.sourceLocationId, r.targetEntityId];
    if (!refs.some((id) => id !== undefined && anchors.has(id))) continue;
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "rumour",
        r,
        [
          ["Text", r.text],
          ["Truth", r.truth, true],
          referenceLine("Source actor", r.sourceActorId),
          referenceLine("Source location", r.sourceLocationId),
          referenceLine("Target", r.targetEntityId),
        ],
        sel.maxCharacters,
      ),
      true,
    );
  }
}

function addSecrets(sel: Selection): void {
  for (const s of sel.pkg.secrets) {
    if (sel.stopped) break;
    if (!(s.relatedEntityIds ?? []).some((id) => sel.selectedIds.has(id))) {
      continue;
    }
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "secret",
        s,
        [["Text", s.text], referenceLines("Related", s.relatedEntityIds)],
        sel.maxCharacters,
      ),
      false,
    );
  }
}

function selectExcerpts(
  pkg: AdventureJsonV1,
  focus: AdventureJsonRetrievalFocus,
  sceneId: string,
  maxCharacters: number,
): Selection {
  // Matching requires one in-memory pass over each package tier. Admission
  // happens as records are visited so excerpts and serialized prefixes never
  // accumulate beyond the output budget.
  const scene = pkg.scenes.find((s) => s.id === sceneId)!;
  const location =
    pkg.locations.find((l) => l.id === focus.locationId) ??
    pkg.locations.find((l) => l.id === scene.locationId);
  const sel: Selection = {
    pkg,
    scene,
    locationId: location?.id,
    ...createExcerptAdmission(maxCharacters),
    hiddenIds: new Set(adventureJsonHiddenRecordIds(pkg)),
    actorIds: new Set(),
  };

  addScene(sel);
  addPremiseAndSystem(sel);
  if (location) addLocation(sel, location);
  const encounters = addEncounters(sel);
  addActors(sel, focus.actorIds, encounters);
  addClues(sel);
  addItems(sel);
  addRumours(sel);
  addSecrets(sel);
  return sel;
}

function resolveFocusScene(
  pkg: AdventureJsonV1,
  requested: string | undefined,
): string | undefined {
  return requested !== undefined && pkg.scenes.some((s) => s.id === requested)
    ? requested
    : entrySceneId(pkg);
}

/**
 * Pure, deterministic scene-context retrieval for Adventure JSON v1. Selects
 * the focus scene and the records tied to it, splits them by visibility and
 * keeps the serialised size within `maxCharacters`.
 */
export function retrieveAdventureJsonContext(
  pkg: AdventureJsonV1,
  focus: AdventureJsonRetrievalFocus,
): AdventureJsonRetrievalResult {
  const resolved = resolveFocusScene(pkg, focus.sceneId);
  const sceneFallback =
    focus.sceneId !== undefined && resolved !== focus.sceneId;

  if (resolved === undefined) {
    return {
      playerSafe: [],
      gmOnly: [],
      includedIds: [],
      truncated: false,
      sceneFallback,
      invalidBudget: false,
    };
  }

  const selection = selectExcerpts(
    pkg,
    focus,
    resolved,
    clampMaxCharacters(focus.maxCharacters),
  );
  const kept = selection.excerpts;

  return {
    ...splitByVisibility(kept),
    includedIds: [...new Set(kept.map((e) => e.id))],
    truncated: selection.truncated,
    sceneFallback,
    invalidBudget: selection.invalidBudget,
  };
}
