/** The v1 collections whose IDs may be referenced. The package ID is excluded. */
export const ENTITY_COLLECTIONS = [
  "locations",
  "actors",
  "factions",
  "scenes",
  "encounters",
  "clues",
  "rumours",
  "items",
  "secrets",
  "endings",
  "unresolved",
] as const;

export type EntityCollectionName = (typeof ENTITY_COLLECTIONS)[number];

type ReferenceTarget = "locations" | "actors" | "factions" | "scenes" | "any";

type ReferencePath =
  readonly [string] | readonly [string, "*"] | readonly [string, "*", string];

function reference(
  source: EntityCollectionName,
  segments: ReferencePath,
  target: ReferenceTarget,
  meaning: string,
  graphDiagnostics: readonly string[] = [],
) {
  const path = segments.reduce<string>(
    (path, segment) => (segment === "*" ? `${path}[]` : `${path}.${segment}`),
    `${source}[]`,
  );
  return {
    source,
    segments,
    path,
    diagnosticPath: path.replaceAll("[]", "[index]"),
    target,
    allowedTargets: target === "any" ? ENTITY_COLLECTIONS : [target],
    cardinality: segments.length === 1 ? "optional" : "optional repeated",
    allowsSelfReference: false,
    diagnostics: {
      missingOrWrongTarget: "UNRESOLVED_REFERENCE",
      selfReference: "SELF_REFERENCE",
      invalidShape: "SCHEMA_VALIDATION_ERROR",
      graph: graphDiagnostics,
    },
    meaning,
  } as const;
}

export const ADVENTURE_JSON_REFERENCES = [
  reference(
    "locations",
    ["parentLocationId"],
    "locations",
    "Containing location.",
    ["HIERARCHY_CYCLE"],
  ),
  reference(
    "locations",
    ["connections", "*", "targetLocationId"],
    "locations",
    "Geographic connection.",
  ),
  reference("actors", ["factionId"], "factions", "Affiliated faction."),
  reference("actors", ["locationId"], "locations", "Actor's location."),
  reference("scenes", ["locationId"], "locations", "Scene setting."),
  reference(
    "scenes",
    ["branches", "*", "targetSceneId"],
    "scenes",
    "Authored scene transition.",
    ["UNREACHABLE_SCENE", "DEAD_END_CYCLE"],
  ),
  reference(
    "encounters",
    ["sceneId"],
    "scenes",
    "Scene containing the encounter.",
  ),
  reference(
    "encounters",
    ["locationId"],
    "locations",
    "Location of the encounter.",
  ),
  reference(
    "encounters",
    ["actorIds", "*"],
    "actors",
    "Encounter participants.",
  ),
  reference("clues", ["leadTargetId"], "any", "Navigable lead to an entity."),
  reference(
    "clues",
    ["placedLocationId"],
    "locations",
    "Location where the clue appears.",
  ),
  reference(
    "clues",
    ["placedActorId"],
    "actors",
    "Actor associated with the clue's placement.",
  ),
  reference(
    "clues",
    ["placedSceneId"],
    "scenes",
    "Scene where the clue appears.",
  ),
  reference(
    "clues",
    ["alternativeSourceId"],
    "any",
    "Alternate source for the clue.",
  ),
  reference(
    "rumours",
    ["sourceActorId"],
    "actors",
    "Actor who supplies the rumour.",
  ),
  reference(
    "rumours",
    ["sourceLocationId"],
    "locations",
    "Location where the rumour is heard.",
  ),
  reference("rumours", ["targetEntityId"], "any", "Subject of the rumour."),
  reference("items", ["locationId"], "locations", "Item's location."),
  reference("items", ["actorId"], "actors", "Actor associated with the item."),
  reference(
    "secrets",
    ["relatedEntityIds", "*"],
    "any",
    "Entities the secret concerns.",
  ),
  reference(
    "unresolved",
    ["relatedEntityId"],
    "any",
    "Entity the unresolved fact concerns.",
    ["DUPLICATE_SCENE_PROGRESSION"],
  ),
] as const;
