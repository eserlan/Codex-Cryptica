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

function interval(date: DateLike, calendar: WorldCalendar) {
  if (!calendarEngine.isValid(date, calendar)) return null;
  const first = calendarEngine.getTimelineValue(date, calendar);
  const yearEnd = (date.year + 1) * calendarEngine.getDaysInYear(calendar) - 1;
  if ("precision" in date) {
    if (date.precision === "day") return { first, last: first };
    if (date.precision === "unit") {
      const unit = calendarEngine
        .getMonths(calendar)
        .find((month) => month.id === date.unitId);
      return { first, last: first + (unit?.days ?? 1) - 1 };
    }
    if (date.precision === "anchor") {
      // An intercalary anchor's placement is calendar-defined, but may
      // only identify a year; do not overstate day-level certainty.
      return {
        first: date.year * calendarEngine.getDaysInYear(calendar),
        last: yearEnd,
      };
    }
    return { first, last: yearEnd };
  }
  if (date.month === undefined) return { first, last: yearEnd };
  if (date.day !== undefined) return { first, last: first };
  const month = calendarEngine.getMonths(calendar)[date.month - 1];
  return { first, last: first + (month?.days ?? 1) - 1 };
}

function classify(
  entity: Entity,
  at: ReturnType<typeof interval>,
  calendar: WorldCalendar,
): TemporalApplicability {
  if (!at) return "uncertain";
  const start = entity.start_date ?? entity.date;
  const end = entity.end_date ?? entity.date;
  if (!start && !end) return "uncertain";
  const startInterval = start ? interval(start, calendar) : null;
  const endInterval = end ? interval(end, calendar) : null;
  if ((start && !startInterval) || (end && !endInterval))
    return "contradictory";
  if (startInterval && endInterval && startInterval.first > endInterval.last) {
    return "contradictory";
  }
  if (startInterval && at.last < startInterval.first) return "future";
  if (endInterval && at.first > endInterval.last) return "historical";
  if (entity.type === "event") {
    // Happening *in* a partly specified year is not the same as having
    // already happened; keep it temporally uncertain at that boundary.
    return "uncertain";
  }
  if (
    startInterval &&
    endInterval &&
    at.first >= startInterval.last &&
    at.last <= endInterval.first
  ) {
    return "established";
  }
  if (startInterval && !endInterval && at.first > startInterval.last) {
    return "established";
  }
  return "uncertain";
}

function connected(entity: Entity, other: Entity): boolean {
  return (
    entity.parent === other.id ||
    other.parent === entity.id ||
    entity.connections.some((connection) => connection.target === other.id) ||
    other.connections.some((connection) => connection.target === entity.id)
  );
}

/**
 * Prioritise explicitly selected entities, followed by their direct graph
 * neighbors and a bounded set of second-hop records. Never scan free text
 * for a relationship and never assume disconnected records are local.
 */
export function resolveTemporalWorldContext(
  query: TemporalWorldQuery,
): TemporalWorldContext {
  const maxRecords = Math.max(2, Math.min(query.maxRecords ?? 14, 30));
  const maxExcerptChars = Math.max(
    40,
    Math.min(query.maxExcerptChars ?? 1_200, 4_000),
  );
  const byId = new Map(query.entities.map((entity) => [entity.id, entity]));
  const character = byId.get(query.characterId);
  const location = byId.get(query.locationId);
  if (!character || character.type !== "character") {
    throw new Error("temporal-world-character-not-found");
  }
  if (!location || location.type !== "location") {
    throw new Error("temporal-world-location-not-found");
  }
  if (!calendarEngine.isValid(query.at, query.calendar)) {
    throw new Error("temporal-world-invalid-date");
  }

  const ranked = new Map<string, { entity: Entity; distance: number }>();
  ranked.set(character.id, { entity: character, distance: 0 });
  ranked.set(location.id, { entity: location, distance: 0 });
  for (const candidate of query.entities) {
    if (ranked.has(candidate.id)) continue;
    if (connected(candidate, location) || connected(candidate, character)) {
      ranked.set(candidate.id, { entity: candidate, distance: 1 });
    }
  }
  const direct = [...ranked.values()]
    .filter((record) => record.distance === 1)
    .map((record) => record.entity);
  for (const candidate of query.entities) {
    if (ranked.has(candidate.id)) continue;
    if (direct.some((neighbor) => connected(candidate, neighbor))) {
      ranked.set(candidate.id, { entity: candidate, distance: 2 });
    }
  }
  const contextDate = interval(query.at, query.calendar);
  const rankedRows = [...ranked.values()].sort(
    (a, b) => a.distance - b.distance || a.entity.id.localeCompare(b.entity.id),
  );
  const selected = rankedRows.slice(0, maxRecords);
  const playerSafe: TemporalWorldRecord[] = [];
  const gmOnly: GMTemporalWorldRecord[] = [];
  const unresolved: TemporalWorldRecord[] = [];

  for (const { entity, distance } of selected) {
    const applicability = classify(entity, contextDate, query.calendar);
    const sourceDate = entity.start_date ?? entity.date ?? entity.end_date;
    const record: TemporalWorldRecord = {
      id: entity.id,
      title: entity.title,
      type: entity.type,
      content: entity.content.slice(0, maxExcerptChars),
      applicability,
      linkedBy:
        distance === 0
          ? "selected"
          : connected(entity, character)
            ? "character"
            : connected(entity, location)
              ? "location"
              : "neighbor",
      ...(sourceDate && calendarEngine.isValid(sourceDate, query.calendar)
        ? { dateLabel: calendarEngine.format(sourceDate, query.calendar) }
        : {}),
    };
    gmOnly.push({
      ...record,
      ...(entity.lore ? { lore: entity.lore.slice(0, maxExcerptChars) } : {}),
    });
    // A source's visibility and its temporal applicability are distinct
    // guards. Unknown/future records must not become player assertions.
    if (
      entity.visibility !== "hidden" &&
      (applicability === "established" || applicability === "historical")
    ) {
      playerSafe.push(record);
    } else if (
      entity.visibility !== "hidden" &&
      (applicability === "uncertain" ||
        applicability === "contradictory")
    ) {
      unresolved.push(record);
    }
  }
  return {
    characterId: character.id,
    locationId: location.id,
    at: structuredClone(query.at),
    playerSafe,
    gmOnly,
    unresolved,
    omitted: Math.max(0, rankedRows.length - selected.length),
  };
}
