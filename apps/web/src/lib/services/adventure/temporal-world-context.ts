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
  /**
   * Source-authored, not AI-inferred. In `playerSafe`, a non-event record's
   * content is a structured summary: a lifecycle date range establishes that
   * the entity exists, not that its undated biography is safe for the period.
   */
  content: string;
  applicability: TemporalApplicability;
  linkedBy: "character" | "location" | "neighbor" | "selected";
  dateLabel?: string;
}

export interface GMTemporalWorldRecord extends TemporalWorldRecord {
  lore?: string;
}

export interface TemporalWorldContext {
  characterId?: string;
  locationId?: string;
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
  /** At least one canonical root is required; a provisional side is omitted. */
  characterId?: string;
  locationId?: string;
  at: TemporalMetadata | DateSelection;
  maxRecords?: number;
  maxExcerptChars?: number;
  /** Committed fictional time since world entry, never device/wall-clock time. */
  elapsedMinutes?: number;
}

type DateLike = TemporalMetadata | DateSelection;
type DayInterval = { first: number; last: number };

function yearEnd(year: number, calendar: WorldCalendar): number {
  return (year + 1) * calendarEngine.getDaysInYear(calendar) - 1;
}

function metadataInterval(
  date: DateSelection,
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
    case "anchor": {
      // A placed anchor (after a month/day) is a known point; only an
      // unplaced anchor is widened to its whole year.
      const anchor = (calendar.anchors ?? []).find(
        (item) => item.id === date.anchorId,
      );
      if (anchor?.afterMonthId) return { first, last: first };
      return {
        first: date.year * calendarEngine.getDaysInYear(calendar),
        last: yearEnd(date.year, calendar),
      };
    }
    default:
      return { first, last: yearEnd(date.year, calendar) };
  }
}

function selectionInterval(
  date: TemporalMetadata,
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
/**
 * A DateSelection saved under an older calendar revision may mean a different
 * day under the current month layout. It needs explicit repair first.
 */
function needsCalendarRepair(date: DateLike, calendar: WorldCalendar): boolean {
  return (
    "precision" in date &&
    date.calendarRevision !== undefined &&
    date.calendarRevision !== (calendar.revision || 1)
  );
}

function interval(date: DateLike, calendar: WorldCalendar): DayInterval | null {
  if (needsCalendarRepair(date, calendar)) return null;
  if (!calendarEngine.isValid(date, calendar)) return null;
  return "precision" in date
    ? metadataInterval(date, calendar)
    : selectionInterval(date, calendar);
}

/**
 * Project the *starting* date to the committed fictional clock without
 * inventing precision. A year-only start stays a year-wide interval; for a
 * day-precise start, fractional days may fall on either adjacent calendar day
 * because Adventure does not persist the initial hour.
 */
function effectiveTargetInterval(
  date: DateLike,
  calendar: WorldCalendar,
  elapsedMinutes = 0,
): DayInterval | null {
  if (
    !Number.isSafeInteger(elapsedMinutes) ||
    elapsedMinutes < 0 ||
    elapsedMinutes > 52_560_000
  ) {
    return null;
  }
  const start = interval(date, calendar);
  if (!start) return null;
  const wholeDays = Math.floor(elapsedMinutes / 1_440);
  const partialDay = elapsedMinutes % 1_440 === 0 ? 0 : 1;
  return {
    first: start.first + wholeDays,
    last: start.last + wholeDays + partialDay,
  };
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

/** Undirected links, built once per resolution instead of per lookup. */
interface Adjacency {
  /** Every link, including hidden links and hidden records (GM view). */
  all: Map<string, Set<string>>;
  /** Only visible links between non-hidden records (player view). */
  visible: Map<string, Set<string>>;
}

function link(map: Map<string, Set<string>>, a: string, b: string): void {
  if (a === b) return;
  if (!map.has(a)) map.set(a, new Set());
  if (!map.has(b)) map.set(b, new Set());
  map.get(a)!.add(b);
  map.get(b)!.add(a);
}

function buildAdjacency(byId: ReadonlyMap<string, Entity>): Adjacency {
  const all = new Map<string, Set<string>>();
  const visible = new Map<string, Set<string>>();
  for (const entity of byId.values()) {
    const links: Array<{ target: string; hidden: boolean }> = [
      ...(entity.parent ? [{ target: entity.parent, hidden: false }] : []),
      ...entity.connections.map((connection) => ({
        target: connection.target,
        hidden: connection.hidden === true,
      })),
    ];
    for (const { target, hidden } of links) {
      const other = byId.get(target);
      if (!other) continue;
      link(all, entity.id, other.id);
      if (
        !hidden &&
        entity.visibility !== "hidden" &&
        other.visibility !== "hidden"
      ) {
        link(visible, entity.id, other.id);
      }
    }
  }
  return { all, visible };
}

interface RankedEntity {
  entity: Entity;
  distance: number;
}

function contextSeeds(
  query: TemporalWorldQuery,
  byId: Map<string, Entity>,
): Entity[] {
  const roots: Entity[] = [];
  if (query.characterId) {
    const character = byId.get(query.characterId);
    if (!character || character.type !== "character") {
      throw new Error("temporal-world-character-not-found");
    }
    roots.push(character);
  }
  if (query.locationId) {
    const location = byId.get(query.locationId);
    if (!location || location.type !== "location") {
      throw new Error("temporal-world-location-not-found");
    }
    roots.push(location);
  }
  if (!roots.length) throw new Error("temporal-world-no-canonical-root");
  return roots;
}

/**
 * Two graph hops from the roots. `canExpand` limits which first-hop records
 * may lead further: the player view must not reach a record solely through
 * one it withholds (a future or undated intermediary).
 */
function rankNearby(
  roots: readonly Entity[],
  byId: ReadonlyMap<string, Entity>,
  adjacency: Map<string, Set<string>>,
  canExpand: (entity: Entity) => boolean,
): Map<string, RankedEntity> {
  const ranked = new Map<string, RankedEntity>(
    roots.map((root) => [root.id, { entity: root, distance: 0 }]),
  );
  // Adds unseen neighbours of `from` at `distance`; returns those added.
  const hop = (from: readonly Entity[], distance: number): Entity[] =>
    from.flatMap((source) =>
      [...(adjacency.get(source.id) ?? [])].flatMap((id) => {
        const entity = byId.get(id);
        if (!entity || ranked.has(id)) return [];
        ranked.set(id, { entity, distance });
        return [entity];
      }),
    );
  hop(hop(roots, 1).filter(canExpand), 2);
  return ranked;
}

function linkedBy(
  entity: Entity,
  distance: number,
  roots: readonly Entity[],
  adjacency: Adjacency,
): TemporalWorldRecord["linkedBy"] {
  if (distance === 0) return "selected";
  const neighbors = adjacency.all.get(entity.id);
  const root = roots.find((candidate) => neighbors?.has(candidate.id));
  if (!root) return "neighbor";
  return root.type === "character" ? "character" : "location";
}

function summary(entity: Entity, dateLabel?: string): string {
  return (
    entity.title +
    " (" +
    entity.type +
    (dateLabel ? ", " + dateLabel : "") +
    "). Biography details are not period-checked."
  );
}

function makeRecord(
  entity: Entity,
  distance: number,
  roots: readonly Entity[],
  adjacency: Adjacency,
  applicability: TemporalApplicability,
  calendar: WorldCalendar,
  maxExcerptChars: number,
): TemporalWorldRecord {
  const sourceDate = entity.start_date ?? entity.date ?? entity.end_date;
  return {
    id: entity.id,
    title: entity.title,
    type: entity.type,
    content: entity.content.slice(0, maxExcerptChars),
    applicability,
    linkedBy: linkedBy(entity, distance, roots, adjacency),
    ...(sourceDate &&
    !needsCalendarRepair(sourceDate, calendar) &&
    calendarEngine.isValid(sourceDate, calendar)
      ? { dateLabel: calendarEngine.format(sourceDate, calendar) }
      : {}),
  };
}

function isEstablishedRecord(
  record: TemporalWorldRecord,
  distance: number,
): boolean {
  if (
    record.applicability === "established" ||
    record.applicability === "historical"
  ) {
    return true;
  }
  // The player chose this record, so an undated one may be used tentatively.
  // A selected future record stays GM-only and a contradictory one unresolved.
  return distance === 0 && record.applicability === "uncertain";
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
  roots: readonly Entity[],
  adjacency: Adjacency,
  applicabilityOf: (entity: Entity) => TemporalApplicability,
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
      roots,
      adjacency,
      applicabilityOf(entity),
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
      // Events are dated facts. Other records keep only a structured summary
      // here; their undated prose stays in the GM-only projection.
      playerSafe.push(
        entity.type === "event"
          ? record
          : { ...record, content: summary(entity, record.dateLabel) },
      );
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
  const roots = contextSeeds(query, byId);
  const at = effectiveTargetInterval(
    query.at,
    query.calendar,
    query.elapsedMinutes,
  );
  if (!at) throw new Error("temporal-world-invalid-date");

  const applicability = new Map<string, TemporalApplicability>();
  const applicabilityOf = (entity: Entity): TemporalApplicability => {
    let value = applicability.get(entity.id);
    if (!value) {
      value = classify(entity, at, query.calendar);
      applicability.set(entity.id, value);
    }
    return value;
  };
  const adjacency = buildAdjacency(byId);
  const ranked = rankNearby(roots, byId, adjacency.all, () => true);
  const playerReachable = new Set(
    rankNearby(roots, byId, adjacency.visible, (entity) => {
      const value = applicabilityOf(entity);
      return value === "established" || value === "historical";
    }).keys(),
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
    ...(query.characterId ? { characterId: query.characterId } : {}),
    ...(query.locationId ? { locationId: query.locationId } : {}),
    at: structuredClone(query.at),
    ...projectRecords(
      selected,
      playerReachable,
      roots,
      adjacency,
      applicabilityOf,
      query.calendar,
      maxExcerptChars,
    ),
    omitted: Math.max(0, rankedRows.length - selected.length),
  };
}

/**
 * Classify one record at a date, outside the two-hop snapshot (anchors and
 * search results). Returns null when the target date itself is unusable.
 */
export function classifyEntityAt(
  entity: Entity,
  at: TemporalMetadata | DateSelection,
  calendar: WorldCalendar,
  elapsedMinutes = 0,
): TemporalApplicability | null {
  const target = effectiveTargetInterval(at, calendar, elapsedMinutes);
  return target ? classify(entity, target, calendar) : null;
}

/**
 * Oracle excerpt for a dated session. Dated events that have happened are
 * canonical content. Any other record contributes only a labelled summary as
 * content; its undated prose goes to GM-only lore so Oracle may use it for
 * consistency but never states it as current fact.
 */
export function periodExcerpt(input: {
  title: string;
  type: string;
  text: string;
  lore?: string;
  applicability: TemporalApplicability;
}): { content: string; lore?: string } {
  const label = "[Period applicability: " + input.applicability + "] ";
  if (
    input.type === "event" &&
    (input.applicability === "established" ||
      input.applicability === "historical")
  ) {
    return {
      content: label + input.text,
      ...(input.lore ? { lore: input.lore } : {}),
    };
  }
  const gmNote =
    input.applicability === "future"
      ? "Not yet true in this period; never state it as current."
      : "Not period-checked; do not state period-specific details as current.";
  const lore = [
    input.text.trim() ? gmNote + " " + input.text : "",
    input.lore ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    content: label + input.title + " (" + input.type + ").",
    ...(lore ? { lore } : {}),
  };
}
