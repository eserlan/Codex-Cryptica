import type { Connection } from "schema";
import type { ConnectionStance } from "./entity-card-stance";
import { getConnectionStance } from "./entity-card-stance";

/**
 * Canvas card variants for vault entities. These are views over the same
 * entity data — the persisted `CanvasNode` stays `type: "entity"` and the
 * variant is resolved at render time from the linked entity's type, so no
 * migration is needed and the selectors stay reusable for future report
 * or handout views.
 */
export type EntityCardVariant =
  | "character"
  | "faction"
  | "roster"
  | "location"
  | "compact"
  | "image_only"
  | "default";

const CHARACTER_TYPES = new Set(["character", "creature"]);
const FACTION_TYPES = new Set(["faction"]);
const LOCATION_TYPES = new Set(["location"]);

export function resolveEntityCardVariant(
  entityType: string | null | undefined,
  preference: EntityCardViewPreference | string | null | undefined = "auto",
): EntityCardVariant {
  const normalized = normalizeEntityCardViewPreference(preference);
  if (normalized !== "auto") return normalized;
  const byType = (entityType ?? "").trim().toLowerCase();
  if (CHARACTER_TYPES.has(byType)) return "character";
  if (FACTION_TYPES.has(byType)) return "faction";
  if (LOCATION_TYPES.has(byType)) return "location";
  return "default";
}

export const ENTITY_CARD_VIEW_PREFERENCE_VALUES = [
  "auto",
  "default",
  "character",
  "faction",
  "roster",
  "location",
  "compact",
  "image_only",
] as const;

export type EntityCardViewPreference =
  (typeof ENTITY_CARD_VIEW_PREFERENCE_VALUES)[number];

export const DEFAULT_ENTITY_CARD_VIEW_PREFERENCE: EntityCardViewPreference =
  "auto";

export const ENTITY_CARD_VIEW_OPTIONS: {
  value: EntityCardViewPreference;
  label: string;
}[] = [
  { value: "auto", label: "Auto" },
  { value: "default", label: "Standard" },
  { value: "character", label: "Character" },
  { value: "faction", label: "Faction" },
  { value: "roster", label: "Faction Roster (Members)" },
  { value: "location", label: "Location" },
  { value: "compact", label: "Compact / Avatar" },
  { value: "image_only", label: "Image only" },
];

export function normalizeEntityCardViewPreference(
  value: unknown,
): EntityCardViewPreference {
  return (ENTITY_CARD_VIEW_PREFERENCE_VALUES as readonly unknown[]).includes(
    value,
  )
    ? (value as EntityCardViewPreference)
    : DEFAULT_ENTITY_CARD_VIEW_PREFERENCE;
}

export interface RelationRow {
  target: string;
  /** Resolved display name of the related entity. */
  title: string;
  /** Human label: the connection's custom label, falling back to its type. */
  text: string;
  stance: ConnectionStance;
}

export interface RelatedEntityInfo {
  title: string;
  type: string;
}

export interface LinkGroup {
  key: "character" | "faction" | "location" | "other";
  label: string;
  rows: RelationRow[];
}

const LINK_GROUP_ORDER: LinkGroup["key"][] = [
  "character",
  "faction",
  "location",
  "other",
];

const LINK_GROUP_LABELS: Record<LinkGroup["key"], string> = {
  character: "Characters",
  faction: "Factions",
  location: "Locations",
  other: "Other",
};

function linkGroupFor(entityType: string | null | undefined): LinkGroup["key"] {
  switch ((entityType ?? "").trim().toLowerCase()) {
    case "character":
    case "creature":
      return "character";
    case "faction":
      return "faction";
    case "location":
      return "location";
    default:
      return "other";
  }
}

/**
 * Large-card link section: every connection grouped by the related
 * entity's kind so characters, factions and locations read as visible
 * groups instead of one flat list. Empty groups are omitted; unknown
 * entities land in Other.
 */
export function getGroupedRelations(
  connections: Connection[] | undefined | null,
  resolveRelated: (id: string) => RelatedEntityInfo | undefined,
): LinkGroup[] {
  const list = Array.isArray(connections) ? connections : [];
  const buckets: Record<LinkGroup["key"], RelationRow[]> = {
    character: [],
    faction: [],
    location: [],
    other: [],
  };
  const seenInBucket: Record<LinkGroup["key"], Set<string>> = {
    character: new Set(),
    faction: new Set(),
    location: new Set(),
    other: new Set(),
  };
  for (const connection of list) {
    const info = resolveRelated(connection.target);
    const groupKey = linkGroupFor(info?.type);
    const text = connection.label?.trim() || connection.type || "related";
    const dedupeKey = `${connection.target}::${text}`;
    if (seenInBucket[groupKey].has(dedupeKey)) continue;
    seenInBucket[groupKey].add(dedupeKey);
    buckets[groupKey].push({
      target: connection.target,
      title: info?.title ?? "Unknown",
      text,
      stance: getConnectionStance(connection.type),
    });
  }
  return LINK_GROUP_ORDER.filter((key) => buckets[key].length > 0).map(
    (key) => ({
      key,
      label: LINK_GROUP_LABELS[key],
      rows: buckets[key],
    }),
  );
}
