import type { Entity } from "schema";
import type { DateSelection, TemporalMetadata, WorldCalendar } from "chronology-engine";
import {
  resolveTemporalWorldContext,
  type TemporalApplicability,
} from "./temporal-world-context";

export interface WorldEntryPreviewRecord {
  id: string;
  title: string;
  type: string;
  applicability: TemporalApplicability;
  dateLabel?: string;
  linkedBy: "selected" | "character" | "location" | "neighbor";
}

export interface WorldEntryContextPreview {
  records: WorldEntryPreviewRecord[];
  omitted: number;
  warnings: string[];
  counts: { people: number; locations: number; events: number };
  dated: boolean;
}

export interface WorldEntryPreviewQuery {
  entities: readonly Entity[];
  calendar: WorldCalendar;
  characterId?: string;
  locationId?: string;
  at?: DateSelection | TemporalMetadata;
  maxRecords?: number;
}

/** No content or lore is copied into the preview; these are source references. */
function projected(records: readonly WorldEntryPreviewRecord[], omitted: number,
  warnings: string[], dated: boolean): WorldEntryContextPreview {
  return {
    records,
    omitted,
    warnings,
    dated,
    counts: {
      people: records.filter((record) => record.type === "character").length,
      locations: records.filter((record) => record.type === "location").length,
      events: records.filter((record) => record.type === "event").length,
    },
  };
}

function safeConnection(a: Entity, b: Entity): boolean {
  if (a.visibility === "hidden" || b.visibility === "hidden") return false;
  return a.parent === b.id || b.parent === a.id ||
    a.connections.some((link) => link.target === b.id && !link.hidden) ||
    b.connections.some((link) => link.target === a.id && !link.hidden);
}

/**
 * Conservative fallback for unspecified dates or provisional starts.
 * Never assert an undated actor was alive, or display an unverified future
 * Event as if it were already known to the character.
 */
function undatedPreview(query: WorldEntryPreviewQuery): WorldEntryContextPreview {
  const visible = query.entities.filter((entity) => entity.visibility !== "hidden");
  const byId = new Map(visible.map((entity) => [entity.id, entity]));
  const roots = [query.characterId, query.locationId]
    .filter((id): id is string => Boolean(id))
    .map((id) => byId.get(id))
    .filter((entity): entity is Entity => Boolean(entity));
  const max = Math.max(2, Math.min(query.maxRecords ?? 14, 30));
  const records = visible
    .filter((entity) =>
      // Dated events can contain future spoilers: no event without a chosen date.
      entity.type !== "event" &&
      (roots.some((root) => root.id === entity.id) ||
        roots.some((root) => safeConnection(root, entity))))
    .sort((a, b) =>
      Number(!roots.some((root) => root.id === a.id)) -
        Number(!roots.some((root) => root.id === b.id)) ||
      a.title.localeCompare(b.title))
    .map((entity) => ({
      id: entity.id,
      title: entity.title,
      type: entity.type,
      applicability: "uncertain" as const,
      linkedBy: roots.some((root) => root.id === entity.id)
        ? "selected" as const : "neighbor" as const,
    }));
  const warnings = [
    "Dates or canonical selections are incomplete; connected records are tentative, not confirmed for this period.",
  ];
  if (!roots.length) {
    warnings.push("No Vault character or location selected; a provisional start will have limited canonical grounding.");
  }
  return projected(records.slice(0, max), Math.max(0, records.length - max), warnings, false);
}

/** Pure, bounded, player-safe preview. Only explicit source IDs survive. */
export function resolveWorldEntryPreview(
  query: WorldEntryPreviewQuery,
): WorldEntryContextPreview {
  const byId = new Map(query.entities.map((entity) => [entity.id, entity]));
  if (!query.at || !query.characterId || !query.locationId ||
    byId.get(query.characterId)?.type !== "character" ||
    byId.get(query.locationId)?.type !== "location") {
    return undatedPreview(query);
  }

  const snapshot = resolveTemporalWorldContext({
    entities: query.entities,
    calendar: query.calendar,
    characterId: query.characterId,
    locationId: query.locationId,
    at: query.at,
    maxRecords: query.maxRecords,
    maxExcerptChars: 80,
  });

  // The canonical owner knows the future, but the character-facing preview
  // must not present future events or hidden records as present.
  const visible = snapshot.playerSafe
    .filter((record) => record.applicability !== "future")
    .map(({ id, title, type, applicability, dateLabel, linkedBy }) => ({
      id, title, type, applicability, dateLabel, linkedBy,
    }));
  const warnings: string[] = [];
  if (snapshot.unresolved.length) {
    warnings.push(
      snapshot.unresolved.length + " connected record(s) have uncertain or contradictory chronology.",
    );
  }
  if (snapshot.omitted) warnings.push("Only the most relevant linked Vault records are shown.");
  return projected(visible, snapshot.omitted, warnings, true);
}
