import { referenceLine, referenceLines, type Line } from "./retrieval-text";
import type {
  AdventureJsonActor,
  AdventureJsonClue,
  AdventureJsonEncounter,
  AdventureJsonItem,
  AdventureJsonLocation,
  AdventureJsonRumour,
  AdventureJsonScene,
  AdventureJsonSecret,
  AdventureJsonV1,
  SystemInfo,
} from "./schema";

export function* sceneLines(scene: AdventureJsonScene): Iterable<Line> {
  yield ["Title", scene.title];
  yield ["Summary", scene.summary];
  yield referenceLine("Location", scene.locationId);
  yield [
    "Read aloud",
    typeof scene.readAloud === "string" ? [scene.readAloud] : scene.readAloud,
  ];
  yield ["Body", scene.body];
  yield ["Conditions", scene.conditions];
  for (const branch of scene.branches ?? []) {
    yield referenceLine("Branch target", branch.targetSceneId);
    yield [
      "Branch",
      [branch.description, ...(branch.condition ? [branch.condition] : [])],
    ];
  }
}

export function premiseLines(premise: AdventureJsonV1["premise"]): Line[] {
  return [
    ["Background", premise.background],
    ["Hook", premise.hook],
    ["Theme", premise.theme],
    ["Tone", premise.tone],
  ];
}

function range(min?: number, max?: number): string | undefined {
  if (min === undefined && max === undefined) return undefined;
  return `${min ?? "?"}-${max ?? "?"}`;
}

export function systemLines(system: SystemInfo): Line[] {
  const target = system.targetParty;
  return [
    ["Name", system.name],
    ["Party size", range(target?.sizeMin, target?.sizeMax)],
    ["Party level", range(target?.levelMin, target?.levelMax)],
  ];
}

export function* locationLines(
  location: AdventureJsonLocation,
): Iterable<Line> {
  yield ["Name", location.name];
  yield ["Summary", location.summary];
  yield ["Description", location.description];
  yield referenceLine("Parent location", location.parentLocationId);
  for (const connection of location.connections ?? []) {
    yield referenceLine("Connection target", connection.targetLocationId);
    yield [
      "Connection",
      [connection.description, ...(connection.travelConditions ?? [])].filter(
        (value): value is string => value !== undefined,
      ),
    ];
  }
}

export function* encounterLines(
  encounter: AdventureJsonEncounter,
): Iterable<Line> {
  yield ["Title", encounter.title];
  yield referenceLine("Scene", encounter.sceneId);
  yield referenceLine("Location", encounter.locationId);
  yield ["Description", encounter.description];
  yield ["Conditions", encounter.conditions];
  yield referenceLines("Actors", encounter.actorIds);
  for (const solution of encounter.alternativeSolutions) {
    yield ["Alternative solution", [solution.method, solution.description]];
  }
}

export function actorLines(actor: AdventureJsonActor): Line[] {
  return [
    ["Name", actor.name],
    ["Summary", actor.summary],
    ["Description", actor.description],
    ["Role", actor.role],
    ["Motivation", actor.motivation],
    ["Disposition", actor.disposition],
    referenceLine("Faction", actor.factionId),
    referenceLine("Location", actor.locationId),
  ];
}

export function clueLines(clue: AdventureJsonClue): Line[] {
  return [
    ["Text", clue.text],
    ["Reveals", clue.reveals, true],
    referenceLine("Lead target", clue.leadTargetId),
    referenceLine("Placed scene", clue.placedSceneId),
    referenceLine("Placed location", clue.placedLocationId),
    referenceLine("Placed actor", clue.placedActorId),
    referenceLine("Alternative source", clue.alternativeSourceId),
  ];
}

export function itemLines(item: AdventureJsonItem): Line[] {
  return [
    ["Name", item.name],
    ["Summary", item.summary],
    ["Description", item.description],
    referenceLine("Location", item.locationId),
    referenceLine("Actor", item.actorId),
  ];
}

export function rumourLines(rumour: AdventureJsonRumour): Line[] {
  return [
    ["Text", rumour.text],
    ["Truth", rumour.truth, true],
    referenceLine("Source actor", rumour.sourceActorId),
    referenceLine("Source location", rumour.sourceLocationId),
    referenceLine("Target", rumour.targetEntityId),
  ];
}

export function secretLines(secret: AdventureJsonSecret): Line[] {
  return [
    ["Text", secret.text],
    referenceLines("Related", secret.relatedEntityIds),
  ];
}
