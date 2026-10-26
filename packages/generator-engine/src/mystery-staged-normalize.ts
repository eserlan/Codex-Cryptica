/** Maps the field-name and value-shape variants models return onto the staged mystery contract. */
import type { JsonObject } from "./staged-runtime";

type Obj = JsonObject;

const isRecord = (value: unknown): value is Obj =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** Flattens each value and joins the non-empty results, without an intermediate map/filter array. */
function joinFlattened(values: Iterable<unknown>, separator: string): string {
  const parts: string[] = [];
  for (const item of values) {
    const flat = flattenText(item);
    if (flat) parts.push(flat);
  }
  return parts.join(separator);
}

/** Flatten a string, list or object into one readable string. */
export function flattenText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) return joinFlattened(value, "; ");
  if (isRecord(value)) return joinFlattened(Object.values(value), " — ");
  return "";
}

const firstText = (source: Obj, keys: readonly string[]): unknown =>
  keys.map((key) => source[key]).find((v) => flattenText(v).trim() !== "");

function flattenFields(item: unknown, fields: readonly string[]): unknown {
  if (!isRecord(item)) return item;
  const next: Obj = { ...item };
  for (const field of fields) {
    if (field in next && typeof next[field] !== "string")
      next[field] = flattenText(next[field]);
  }
  return next;
}

const mapList = (value: unknown, map: (item: unknown) => unknown): unknown =>
  Array.isArray(value) ? value.map(map) : value;

/** Fill `id` from the first alias that carries text. */
function withId(item: unknown, aliases: readonly string[]): unknown {
  if (!isRecord(item) || flattenText(item.id).trim()) return item;
  const alias = firstText(item, aliases);
  return alias === undefined ? item : { ...item, id: flattenText(alias) };
}

function fillMissingField(
  target: Obj,
  field: string,
  aliases: readonly string[],
): void {
  if (flattenText(target[field]).trim()) return;
  const value = firstText(target, aliases);
  if (value !== undefined) target[field] = flattenText(value);
}

const FOUNDATION_TRUTH_FIELDS = [
  "perpetratorName",
  "motive",
  "means",
  "opportunity",
  "constraints",
  "keyItem",
  "keyItemLocation",
  "keyItemFate",
  "recovery",
  "methodReason",
  "disputedFact",
  "victimStatus",
  "atStart",
] as const;

function normalizeFoundationTruth(value: unknown): Obj | undefined {
  if (!isRecord(value)) return undefined;
  const truth: Obj = { ...value };
  fillMissingField(truth, "keyItem", [
    "focalElement",
    "keyElement",
    "centralSubject",
    "centralElement",
    "evidence",
  ]);
  fillMissingField(truth, "keyItemLocation", [
    "focalLocation",
    "keyLocation",
    "centralLocation",
    "evidenceLocation",
  ]);
  fillMissingField(truth, "keyItemFate", [
    "focalFate",
    "intendedFate",
    "stakes",
  ]);
  fillMissingField(truth, "recovery", [
    "resolution",
    "resolutionAndProof",
    "solution",
  ]);
  return flattenFields(truth, FOUNDATION_TRUTH_FIELDS) as Obj;
}

function normalizeFoundation(data: Obj): Obj {
  const next: Obj = { ...data };
  fillMissingField(next, "summary", ["playerSafeSummary", "premise"]);
  const truth = normalizeFoundationTruth(next.truth);
  if (truth) next.truth = truth;
  next.timeline = mapList(next.timeline, flattenText);
  next.revelations = mapList(next.revelations, (item) => {
    const rev = flattenFields(withId(item, ["revelationId", "key"]), [
      "fact",
      "kind",
    ]);
    return isRecord(rev) && typeof rev.kind === "string"
      ? { ...rev, kind: rev.kind.trim().toLowerCase() }
      : rev;
  });
  return next;
}

const SUSPECT_FIELDS = [
  "name",
  "role",
  "publicFace",
  "startLocationId",
  "motive",
  "secret",
  "alibi",
  "knows",
  "believes",
  "approach",
] as const;

function normalizeCast(data: Obj, culpritName = ""): Obj {
  const next: Obj = { ...data };
  // Places the model listed among the suspects belong in locations.
  if (Array.isArray(next.suspects)) {
    const isPlace = (item: unknown) =>
      isRecord(item) &&
      !flattenText(item.role).trim() &&
      !flattenText(item.motive).trim() &&
      !flattenText(item.alibi).trim();
    const places = next.suspects.filter(isPlace);
    if (places.length) {
      next.suspects = next.suspects.filter((item) => !isPlace(item));
      next.locations = [
        ...(Array.isArray(next.locations) ? next.locations : []),
        ...places,
      ];
    }
  }
  next.suspects = mapList(next.suspects, (item) => {
    const suspect = flattenFields(withId(item, ["personId"]), SUSPECT_FIELDS);
    // The perpetrator's name is a locked fact from the foundation stage.
    return culpritName && isRecord(suspect) && suspect.id === "person-1"
      ? { ...suspect, name: culpritName }
      : suspect;
  });
  next.locations = mapList(next.locations, (item) =>
    flattenFields(withId(item, ["locationId", "placeId"]), [
      "name",
      "activity",
      "evidence",
    ]),
  );
  // A person's starting place may be given as a location name or a differently-cased id.
  next.suspects = mapList(next.suspects, (item) =>
    isRecord(item)
      ? {
          ...item,
          startLocationId: placeId(
            item.startLocationId ?? item.locationId ?? item.location,
            next.locations,
          ),
        }
      : item,
  );
  next.keyItemLocationId = placeId(
    next.keyItemLocationId ?? next.keyItemLocation,
    next.locations,
  );
  return next;
}

/** A location id, accepting the location's name or a differently-cased id. */
function placeId(value: unknown, locations: unknown): string {
  const wanted = flattenText(value).trim().toLowerCase();
  const places = Array.isArray(locations) ? locations.filter(isRecord) : [];
  const match = places.find(
    (place) =>
      flattenText(place.id).toLowerCase() === wanted ||
      flattenText(place.name).trim().toLowerCase() === wanted,
  );
  return match ? flattenText(match.id) : flattenText(value);
}

function normalizeClues(data: Obj, revelationIds: readonly string[] = []): Obj {
  const next: Obj = { ...data };
  next.clues = mapList(next.clues, (item) => {
    const clue = withId(item, ["clueId"]);
    if (!isRecord(clue)) return clue;
    return flattenFields(
      {
        ...clue,
        sourceId: clue.sourceId ?? clue.source ?? clue.locationId,
        supports: onlyKnown(
          toIdList(clue.supports ?? clue.revelationIds),
          revelationIds,
        ),
        leadsTo: toIdList(clue.leadsTo),
      },
      ["observation", "doesNotProve", "sourceId"],
    );
  });
  next.independentPaths = mapList(next.independentPaths, (item) =>
    isRecord(item)
      ? {
          ...item,
          revelationId: flattenText(item.revelationId ?? item.revelation),
          clueIds: toIdList(item.clueIds ?? item.clues ?? item.path),
          ...withReasoning(item.reasoning ?? item.why),
        }
      : item,
  );
  next.independentPaths = withIndependentPaths(
    next.independentPaths,
    next.clues,
  );
  return next;
}
/**
 * Keep a route only when it shares no clue and no starting source with a route
 * already kept for the same revelation, so every pair left can be followed
 * independently.
 */
function independentRoutes(routes: Obj[], byId: Map<string, Obj>): Obj[] {
  const kept: Obj[] = [];
  const startOf = (route: Obj) =>
    flattenText(byId.get(flattenText(toIds(route.clueIds)[0]))?.sourceId);
  for (const route of routes) {
    const ids = toIds(route.clueIds).map(flattenText);
    const clash = kept.some(
      (other) =>
        other.revelationId === route.revelationId &&
        (startOf(other) === startOf(route) ||
          toIds(other.clueIds).some((id) => ids.includes(flattenText(id)))),
    );
    if (!clash) kept.push(route);
  }
  return kept;
}

const toIds = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

function withIndependentPaths(paths: unknown, clues: unknown): unknown {
  if (!Array.isArray(clues)) return paths;
  const clueList = clues.filter(isRecord);
  const byId = new Map(clueList.map((clue) => [flattenText(clue.id), clue]));
  return independentRoutes(
    Array.isArray(paths) ? paths.filter(isRecord) : [],
    byId,
  );
}

/** Keep only ids the locked foundation defines (skipped when none are known). */
function onlyKnown(ids: unknown, known: readonly string[]): unknown {
  return Array.isArray(ids) && known.length
    ? ids.filter((id) => known.includes(flattenText(id)))
    : ids;
}

/** A route's explanation, only when the model gave one. */
function withReasoning(value: unknown): Obj {
  const reasoning = flattenText(value).trim();
  return reasoning ? { reasoning } : {};
}

/** A list of plain strings from a list, a delimited string or a list of objects. */
function toTextList(value: unknown): string[] {
  const items =
    typeof value === "string"
      ? value.split(/\n|;/)
      : Array.isArray(value)
        ? value
        : [];
  return items
    .map((item) =>
      flattenText(item)
        .replace(/^\s*[-*\d.)]+\s*/, "")
        .trim(),
    )
    .filter(Boolean);
}

function toIdList(value: unknown): unknown {
  if (typeof value === "string")
    return value
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter(Boolean);
  return value;
}

function normalizePressure(data: Obj): Obj {
  const next: Obj = {
    ...data,
    escalation: flattenText(data.escalation),
    objective: flattenText(data.objective ?? data.goal),
    approaches: toTextList(data.approaches ?? data.possibleApproaches),
  };
  next.pressureClock = mapList(next.pressureClock, (item) =>
    flattenFields(item, ["trigger", "consequence"]),
  );
  next.npcResponses = mapList(next.npcResponses, (item) =>
    flattenFields(item, ["trigger", "response"]),
  );
  if (isRecord(next.outcomes)) {
    const outcomes: Obj = {};
    for (const [key, value] of Object.entries(next.outcomes))
      outcomes[key] = flattenFields(value, [
        "condition",
        "consequence",
        "continuation",
      ]);
    next.outcomes = outcomes;
  }
  return next;
}

/** Only "consistent" and "needs-repair" are statuses; issues decide the rest. */
function normalizeAudit(data: Obj): Obj {
  const issues: string[] = [];
  if (Array.isArray(data.issues)) {
    for (const issue of data.issues) {
      const flat = flattenText(issue);
      if (flat.trim()) issues.push(flat);
    }
  }
  const status = flattenText(data.status).trim().toLowerCase();
  const consistent =
    issues.length === 0 && /^(consistent|pass|ok)/.test(status);
  return {
    ...data,
    issues,
    status:
      consistent || (!issues.length && !status) ? "consistent" : "needs-repair",
  };
}

export const normalizeMysteryStage = {
  audit: normalizeAudit,
  foundation: normalizeFoundation,
  cast: normalizeCast,
  clues: normalizeClues,
  pressure: normalizePressure,
  repair: (
    data: Obj,
    locked: {
      culpritName: string;
      revelationIds: readonly string[];
      previous: { cast: Obj; clues: Obj; pressure: Obj };
    },
  ): Obj => {
    const part = (value: unknown, before: Obj): Obj => ({
      ...before,
      ...(isRecord(value) ? value : {}),
    });
    return {
      ...data,
      cast: normalizeCast(
        part(data.cast, locked.previous.cast),
        locked.culpritName,
      ),
      clues: normalizeClues(
        part(data.clues, locked.previous.clues),
        locked.revelationIds,
      ),
      pressure: normalizePressure(
        part(data.pressure, locked.previous.pressure),
      ),
    };
  },
} as const;
