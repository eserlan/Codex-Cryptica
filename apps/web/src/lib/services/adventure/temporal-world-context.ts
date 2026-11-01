import { calendarEngine } from "chronology-engine";
import type {
  DateSelection,
  TemporalMetadata,
  WorldCalendar,
} from "chronology-engine";
import type { Entity } from "schema";

/**
 * A bounded, source-linked, read-only view of the Vault at an in-world date.
 * This module never persists results or mutates Vault entities. It is equally
 * useful for ordinary world entry and future historical Adventure entry.
 */
export type TemporalApplicability =
  "established" | "historical" | "future" | "uncertain" | "contradictory";

export interface TemporalWorldRecord {
  id: string;
  title: string;
  type: string;
  /** Content is source-authored, not AI-inferred. */
  content: string;
  applicability: TemporalApplicability;
  linkedBy: "character" | "location" | "neighbor" | "selected";
  dateLabel?: string;
}

export interface GMTemporalWorldRecord extends TemporalWorldRecord {
  lore?: string;
}

export interface TemporalWorldContext {
  characterId: string;
  locationId: string;
  at: TemporalMetadata | DateSelection;
  /** Source-authored facts safe to include in the visible-context layer. */
  playerSafe: TemporalWorldRecord[];
  /** Includes undisclosed lore and relevant future events for Oracle only. */
  gmOnly: GMTemporalWorldRecord[];
  /** Do not assert these records were present/active in this period. */
  unresolved: TemporalWorldRecord[];
  omitted: number;
}

export interface TemporalWorldQuery {
  entities: readonly Entity[];
  calendar: WorldCalendar;
  characterId: string;
  locationId: string;
  at: TemporalMetadata | DateSelection;
  maxRecords?: number;
  maxExcerptChars?: number;
}

type DateLike = TemporalMetadata | DateSelection;
type DayInterval = { first: number; last: number };

function yearEnd(year: number, calendar: WorldCalendar): number {
  return (year + 1) * calendarEngine.getDaysInYear(calendar) - 1;
}

function metadataInterval(
  date: TemporalMetadata,
  calendar: WorldCalendar,
): DayInterval {
  const first = calendarEngine.getTimelineValue(date, calendar);
  switch (date.precision) {
    case "day":
      return { first, last: first };
    case "unit": {
      const month = calendarEngine
        .getMonths(calendar)
        .find((item) => item.id === date.unitId);
      return { first, last: first + (month?.days ?? 1) - 1 };
    }
    case "anchor":
      return {
        first: date.year * calendarEngine.getDaysInYear(calendar),
        last: yearEnd(date.year, calendar),
      };
    default:
      return { first, last: yearEnd(date.year, calendar) };
  }
}

function selectionInterval(
  date: DateSelection,
  calendar: WorldCalendar,
): DayInterval {
  const first = calendarEngine.getTimelineValue(date, calendar);
  if (date.month === undefined) {
    return { first, last: yearEnd(date.year, calendar) };
  }
  if (date.day !== undefined) return { first, last: first };
  const month = calendarEngine.getMonths(calendar)[date.month - 1];
  return { first, last: first + (month?.days ?? 1) - 1 };
}

/** Retains the configured calendar's time scale and the source's precision. */
function interval(date: DateLike, calendar: WorldCalendar): DayInterval | null {
  if (!calendarEngine.isValid(date, calendar)) return null;
  return "precision" in date
    ? metadataInterval(date, calendar)
    : selectionInterval(date, calendar);
}

function temporalBounds(entity: Entity): {
  start?: DateLike;
  end?: DateLike;
} {
  // Events have an occurrence date. Other entities have only an explicit
  // lifecycle interval; a generic date cannot establish birth or death.
  if (entity.type === "event") {
    return {
      start: entity.start_date ?? entity.date,
      end: entity.end_date ?? entity.date,
    };
  }
  return { start: entity.start_date, end: entity.end_date };
}

function temporalRelation(
  at: DayInterval,
  start: DayInterval | null,
  end: DayInterval | null,
): "future" | "historical" | null {
  if (start && at.last < start.first) return "future";
  if (end && at.first > end.last) return "historical";
  return null;
}

function validBounds(
  start: DateLike | undefined,
  end: DateLike | undefined,
  first: DayInterval | null,
  last: DayInterval | null,
): boolean {
  if (start && !first) return false;
  if (end && !last) return false;
  return !(first && last && first.first > last.last);
}

function lifecycleApplicability(
  at: DayInterval,
  start: DayInterval | null,
  end: DayInterval | null,
): TemporalApplicability {
  if (start && end && at.first >= start.last && at.last <= end.first) {
    return "established";
  }
  if (start && !end && at.first > start.last) return "established";
  return "uncertain";
}

function classify(
  entity: Entity,
  at: DayInterval,
  calendar: WorldCalendar,
): TemporalApplicability {
  const bounds = temporalBounds(entity);
  if (!bounds.start && !bounds.end) return "uncertain";
  const start = bounds.start ? interval(bounds.start, calendar) : null;
  const end = bounds.end ? interval(bounds.end, calendar) : null;
  if (!validBounds(bounds.start, bounds.end, start, end)) {
    return "contradictory";
  }
  const relation = temporalRelation(at, start, end);
  if (relation) return relation;
  return entity.type === "event"
    ? "uncertain"
    : lifecycleApplicability(at, start, end);
}

function connected(
  entity: Entity,
  other: Entity,
  includeHidden = true,
): boolean {
  if (
    !includeHidden &&
    (entity.visibility === "hidden" || other.visibility === "hidden")
  ) {
    return false;
  }
  return (
    entity.parent === other.id ||
    other.parent === entity.id ||
    entity.connections.some(
      (connection) =>
        connection.target === other.id &&
        (includeHidden || connection.hidden !== true),
    ) ||
    other.connections.some(
      (connection) =>
        connection.target === entity.id &&
        (includeHidden || connection.hidden !== true),
    )
  );
}

interface RankedEntity {
  entity: Entity;
  distance: number;
}

function contextSeeds(
  query: TemporalWorldQuery,
  byId: Map<string, Entity>,
): [Entity, Entity] {
  const character = byId.get(query.characterId);
  const location = byId.get(query.locationId);
  if (!character || character.type !== "character") {
    throw new Error("temporal-world-character-not-found");
  }
  if (!location || location.type !== "location") {
    throw new Error("temporal-world-location-not-found");
  }
  return [character, location];
}

/** Two graph hops, with optional hidden-link traversal for GM-only context. */
function rankNearby(
  entities: readonly Entity[],
  character: Entity,
  location: Entity,
  includeHidden: boolean,
): Map<string, RankedEntity> {
  const ranked = new Map<string, RankedEntity>([
    [character.id, { entity: character, distance: 0 }],
    [location.id, { entity: location, distance: 0 }],
  ]);
  const direct = entities.filter(
    (candidate) =>
      !ranked.has(candidate.id) &&
      (connected(candidate, character, includeHidden) ||
        connected(candidate, location, includeHidden)),
  );
  for (const entity of direct) {
    ranked.set(entity.id, { entity, distance: 1 });
  }
  for (const entity of entities) {
    if (ranked.has(entity.id)) continue;
    if (direct.some((neighbor) => connected(entity, neighbor, includeHidden))) {
      ranked.set(entity.id, { entity, distance: 2 });
    }
  }
  return ranked;
}

function makeRecord(
  entity: Entity,
  distance: number,
  character: Entity,
  location: Entity,
  at: DayInterval,
  calendar: WorldCalendar,
  maxExcerptChars: number,
): TemporalWorldRecord {
  const sourceDate = entity.start_date ?? entity.date ?? entity.end_date;
  return {
    id: entity.id,
    title: entity.title,
    type: entity.type,
    content: entity.content.slice(0, maxExcerptChars),
    applicability: classify(entity, at, calendar),
    linkedBy:
      distance === 0
        ? "selected"
        : connected(entity, character)
          ? "character"
          : connected(entity, location)
            ? "location"
            : "neighbor",
    ...(sourceDate && calendarEngine.isValid(sourceDate, calendar)
      ? { dateLabel: calendarEngine.format(sourceDate, calendar) }
      : {}),
  };
}

function isEstablishedRecord(
  record: TemporalWorldRecord,
  distance: number,
): boolean {
  return (
    distance === 0 ||
    record.applicability === "established" ||
    record.applicability === "historical"
  );
}

function isUnresolvedRecord(record: TemporalWorldRecord): boolean {
  return (
    record.applicability === "uncertain" ||
    record.applicability === "contradictory"
  );
}

function projectRecords(
  selected: readonly RankedEntity[],
  playerReachable: ReadonlySet<string>,
  character: Entity,
  location: Entity,
  at: DayInterval,
  calendar: WorldCalendar,
  maxExcerptChars: number,
): Pick<TemporalWorldContext, "playerSafe" | "gmOnly" | "unresolved"> {
  const playerSafe: TemporalWorldRecord[] = [];
  const gmOnly: GMTemporalWorldRecord[] = [];
  const unresolved: TemporalWorldRecord[] = [];
  for (const { entity, distance } of selected) {
    const record = makeRecord(
      entity,
      distance,
      character,
      location,
      at,
      calendar,
      maxExcerptChars,
    );
    gmOnly.push({
      ...record,
      ...(entity.lore ? { lore: entity.lore.slice(0, maxExcerptChars) } : {}),
    });
    if (entity.visibility === "hidden" || !playerReachable.has(entity.id)) {
      continue;
    }
    if (isEstablishedRecord(record, distance)) {
      playerSafe.push(record);
    } else if (isUnresolvedRecord(record)) {
      unresolved.push(record);
    }
  }
  return { playerSafe, gmOnly, unresolved };
}

/** Resolve a bounded two-hop snapshot without mutating or writing Vault canon. */
export function resolveTemporalWorldContext(
  query: TemporalWorldQuery,
): TemporalWorldContext {
  const byId = new Map(query.entities.map((entity) => [entity.id, entity]));
  const [character, location] = contextSeeds(query, byId);
  const at = interval(query.at, query.calendar);
  if (!at) throw new Error("temporal-world-invalid-date");

  const ranked = rankNearby(query.entities, character, location, true);
  const playerReachable = new Set(
    rankNearby(query.entities, character, location, false).keys(),
  );
  const rankedRows = [...ranked.values()].sort(
    (a, b) => a.distance - b.distance || a.entity.id.localeCompare(b.entity.id),
  );
  const maxRecords = Math.max(2, Math.min(query.maxRecords ?? 14, 30));
  const maxExcerptChars = Math.max(
    40,
    Math.min(query.maxExcerptChars ?? 1_200, 4_000),
  );
  const selected = rankedRows.slice(0, maxRecords);
  return {
    characterId: character.id,
    locationId: location.id,
    at: structuredClone(query.at),
    ...projectRecords(
      selected,
      playerReachable,
      character,
      location,
      at,
      query.calendar,
      maxExcerptChars,
    ),
    omitted: Math.max(0, rankedRows.length - selected.length),
  };
}
