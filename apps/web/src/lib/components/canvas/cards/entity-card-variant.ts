import type { Connection } from "schema";

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

export interface FactionMember {
  id: string;
  title: string;
  /** The member's relation to the faction, for stance-coloured display. */
  stance: ConnectionStance;
}

export const LEADER_KEYWORDS = [
  "leader",
  "lead",
  "leads",
  "leadership",
  "founder",
  "founded",
  "commander",
  "captain",
  "chief",
  "chieftain",
  "ruler",
  "rules",
  "head",
  "boss",
  "director",
  "officer",
  "elder",
  "master",
  "general",
  "king",
  "queen",
  "lord",
  "lady",
  "high priest",
  "high priestess",
  "president",
  "marshal",
  "overseer",
  "champion",
  "leder",
  "ledelse",
  "grunnlegger",
  "høvding",
  "hersker",
  "mester",
];

export function isLeaderRelation(
  label?: string | null,
  type?: string | null,
): boolean {
  const combined = `${label ?? ""} ${type ?? ""}`.toLowerCase();
  return LEADER_KEYWORDS.some((kw) => combined.includes(kw));
}

export const MEMBER_KEYWORDS = [
  "member",
  "members",
  "membership",
  "part_of",
  "part of",
  "belongs_to",
  "belongs to",
  "belongs",
  "agent",
  "agents",
  "initiate",
  "initiates",
  "recruit",
  "recruits",
  "soldier",
  "soldiers",
  "infantry",
  "footman",
  "footmen",
  "sergeant",
  "lieutenant",
  "corporal",
  "private",
  "warrior",
  "warriors",
  "operative",
  "operatives",
  "fellow",
  "fellows",
  "crew",
  "affiliate",
  "affiliated",
  "cadet",
  "cadets",
  "guard",
  "guards",
  "fighter",
  "fighters",
  "scout",
  "scouts",
  "apprentice",
  "servant",
  "follower",
  "followers",
  "minion",
  "minions",
  "subordinate",
  "enforcer",
  "enforcers",
  "veteran",
  "specialist",
  "henchman",
  "henchmen",
  "associate",
  "associates",
  "medlem",
  "tilhører",
  "soldat",
];

export function isMemberRelation(
  label?: string | null,
  type?: string | null,
): boolean {
  const combined = `${label ?? ""} ${type ?? ""}`.toLowerCase();
  return MEMBER_KEYWORDS.some((kw) => combined.includes(kw));
}

/**
 * Faction relationships: extracts Leaders and Members strictly,
 * intentionally filtering out unrelated notes, session logs,
 * items, and locations so faction cards stay focused, usable, and clean.
 */
export interface FactionRosterMember extends RelationRow {
  isLeader: boolean;
}

export type FactionConnectionLike = {
  target: string;
  type?: string | null;
  label?: string | null;
  [key: string]: unknown;
};

function tryAddFactionRelation(
  targetId: string,
  targetEntity:
    | { title?: string | null; metadata?: Record<string, unknown> | null }
    | undefined,
  conn: { label?: string | null; type?: string | null },
  factionTitle: string,
  seen: Set<string>,
  leaders: RelationRow[],
  members: RelationRow[],
): boolean {
  if (seen.has(targetId)) return false;

  const isLeader = isLeaderRelation(conn.label, conn.type);
  const isMember = isMemberRelation(conn.label, conn.type);

  const metaAffiliation = String(
    targetEntity?.metadata?.affiliation ||
      targetEntity?.metadata?.faction ||
      targetEntity?.metadata?.tilknytning ||
      "",
  ).toLowerCase();

  const isAffiliatedMember = Boolean(
    factionTitle &&
    factionTitle.length > 2 &&
    metaAffiliation.includes(factionTitle),
  );

  const isExplicitGhostMember =
    !targetEntity &&
    Boolean(
      conn.type && ["part_of", "member", "leads", "leader"].includes(conn.type),
    );

  if (!isLeader && !isMember && !isAffiliatedMember && !isExplicitGhostMember) {
    return false;
  }

  seen.add(targetId);
  const title = targetEntity?.title || "Unknown";
  const stance = getConnectionStance(conn.type);

  if (isLeader) {
    leaders.push({
      target: targetId,
      title,
      text: conn.label?.trim() || "Leader",
      stance: stance === "neutral" ? "ally" : stance,
    });
  } else {
    members.push({
      target: targetId,
      title,
      text: conn.label?.trim() || "Member",
      stance,
    });
  }
  return true;
}

export function getFactionRelations(
  factionEntity:
    | { id?: string; connections?: FactionConnectionLike[]; title?: string }
    | undefined
    | null,
  allEntities:
    | Record<
        string,
        | {
            id?: string;
            title?: string;
            type?: string;
            connections?: FactionConnectionLike[];
          }
        | undefined
      >
    | undefined
    | null,
): {
  groups: LinkGroup[];
  members: FactionMember[];
  memberCount: number;
  leaders: RelationRow[];
  allRosterMembers: FactionRosterMember[];
} {
  const connections = Array.isArray(factionEntity?.connections)
    ? factionEntity.connections
    : [];
  const entities = allEntities ?? {};
  const factionId = factionEntity?.id;

  const leaderRows: RelationRow[] = [];
  const memberRows: RelationRow[] = [];
  const seenEntities = new Set<string>();
  const factionTitle = (factionEntity?.title || "").toLowerCase();

  // 1. Process outgoing connections from the faction
  for (const conn of connections) {
    const target = entities[conn.target];
    const targetType = (target?.type ?? "").toLowerCase();

    const isExplicitNonPerson =
      targetType === "location" ||
      targetType === "place" ||
      targetType === "item" ||
      targetType === "gjenstand" ||
      targetType === "loot" ||
      targetType === "note" ||
      targetType === "session" ||
      targetType === "log" ||
      targetType === "quest" ||
      targetType === "lore" ||
      targetType === "event" ||
      targetType === "hendelse";

    if (isExplicitNonPerson) {
      continue;
    }

    tryAddFactionRelation(
      conn.target,
      target,
      conn,
      factionTitle,
      seenEntities,
      leaderRows,
      memberRows,
    );
  }

  // 2. Process incoming connections from characters in the vault pointing to this faction
  if (factionId) {
    for (const [id, e] of Object.entries(entities)) {
      if (!e) continue;
      const eType = (e.type ?? "").toLowerCase();
      if (
        eType !== "character" &&
        eType !== "creature" &&
        eType !== "person" &&
        eType !== "npc" &&
        eType !== "pc" &&
        eType !== "spiller" &&
        eType !== "player"
      ) {
        continue;
      }
      if (seenEntities.has(id)) continue;

      if (Array.isArray(e.connections)) {
        for (const conn of e.connections) {
          if (conn.target === factionId) {
            if (
              tryAddFactionRelation(
                id,
                e,
                conn,
                factionTitle,
                seenEntities,
                leaderRows,
                memberRows,
              )
            ) {
              break;
            }
          }
        }
      }
    }
  }

  const groups: LinkGroup[] = [];
  if (leaderRows.length > 0) {
    groups.push({
      key: "character",
      label: "Leaders",
      rows: leaderRows,
    });
  }
  if (memberRows.length > 0) {
    groups.push({
      key: "character",
      label: "Members",
      rows: memberRows,
    });
  }

  const allPeople = [...leaderRows, ...memberRows];
  const members: FactionMember[] = allPeople.slice(0, 5).map((p) => ({
    id: p.target,
    title: p.title,
    stance: p.stance,
  }));

  return {
    groups,
    members,
    memberCount: allPeople.length,
    leaders: leaderRows,
    allRosterMembers: [
      ...leaderRows.map((r) => ({ ...r, isLeader: true })),
      ...memberRows.map((r) => ({ ...r, isLeader: false })),
    ],
  };
}

export function getFactionMembers(
  connections: Connection[] | undefined | null,
  resolveTitle: (targetId: string) => string | undefined,
  limit = 5,
): { members: FactionMember[]; memberCount: number } {
  const list = Array.isArray(connections) ? connections : [];
  const members: FactionMember[] = list.slice(0, limit).map((c) => ({
    id: c.target,
    title: resolveTitle(c.target) ?? "Unknown",
    stance: getConnectionStance(c.type),
  }));
  return {
    members,
    memberCount: list.length,
  };
}

/**
 * Relationship stance buckets for coloured display, derived from the
 * connection type. Unknown and custom types stay neutral.
 */
export type ConnectionStance = "ally" | "friend" | "enemy" | "neutral";

export function getConnectionStance(
  type: string | null | undefined,
): ConnectionStance {
  const norm = (type ?? "").trim().toLowerCase();
  switch (norm) {
    case "enemy":
    case "fiende":
    case "fiendskap":
    case "hostile":
      return "enemy";
    case "friendly":
    case "ally":
    case "alliert":
    case "allianse":
      return "ally";
    case "knows":
    case "friend":
    case "venn":
    case "vennskap":
      return "friend";
    default:
      return "neutral";
  }
}

export type EntityStanceCategory =
  "ally" | "friend" | "enemy" | "faction" | "neutral";

export interface PrimaryStanceInfo {
  stance: EntityStanceCategory;
  badgeText: string;
}

const ALLY_STANCE_KEYWORDS = ["alliert", "ally", "allianse"];
const ENEMY_STANCE_KEYWORDS = ["fiende", "enemy", "motstander"];
const FRIEND_STANCE_KEYWORDS = ["venn", "friend"];
const PARTY_STANCE_KEYWORDS = ["party", "partyet"];

function resolveStanceCategory(raw: string): PrimaryStanceInfo | null {
  if (ALLY_STANCE_KEYWORDS.some((k) => raw.includes(k))) {
    return { stance: "ally", badgeText: "Ally" };
  }
  if (ENEMY_STANCE_KEYWORDS.some((k) => raw.includes(k))) {
    return { stance: "enemy", badgeText: "Enemy" };
  }
  if (PARTY_STANCE_KEYWORDS.some((k) => raw.includes(k))) {
    return { stance: "friend", badgeText: "Party" };
  }
  if (FRIEND_STANCE_KEYWORDS.some((k) => raw.includes(k))) {
    return { stance: "friend", badgeText: "Friend" };
  }
  return null;
}

export function getEntityPrimaryStance(
  entity?: {
    type?: string | null;
    labels?: string[] | null;
    metadata?: Record<string, unknown> | null;
  } | null,
): PrimaryStanceInfo {
  if (!entity) return { stance: "neutral", badgeText: "" };

  const isFaction = (entity.type ?? "").toLowerCase() === "faction";
  if (isFaction) {
    return { stance: "faction", badgeText: "Faction" };
  }

  const allStanceStrings = [
    ...(entity.labels || []),
    String(entity.metadata?.stance || ""),
    String(entity.metadata?.tilknytning || ""),
    String(entity.metadata?.status || ""),
  ];

  for (const raw of allStanceStrings) {
    const match = resolveStanceCategory(raw.toLowerCase());
    if (match) return match;
  }

  return {
    stance: "neutral",
    badgeText: entity.type
      ? entity.type.charAt(0).toUpperCase() + entity.type.slice(1)
      : "",
  };
}

function cleanQuoteString(str: string): string {
  return str
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/^["“'«]+|["”'»]+$/g, "")
    .trim();
}

function truncateQuote(str: string, maxLength: number): string {
  return str.length > maxLength
    ? `${str.slice(0, maxLength - 1).trimEnd()}…`
    : str;
}

/**
 * An author-written quote: markdown blockquote (`> …`), explicit quoted line, or metadata quote.
 */
export function extractQuote(
  content: string | undefined | null,
  metadata?: Record<string, unknown> | null,
  maxLength = 140,
): string | undefined {
  if (metadata) {
    const metaQuote =
      metadata.quote || metadata.tagline || metadata.motto || metadata.sitat;
    if (typeof metaQuote === "string" && metaQuote.trim()) {
      const cleaned = cleanQuoteString(metaQuote.trim());
      if (cleaned) return truncateQuote(cleaned, maxLength);
    }
  }

  if (!content) return undefined;

  const lines = content.split("\n");

  // 1. Contiguous markdown blockquotes (> ...)
  const blockquoteLines: string[] = [];
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith(">")) {
      blockquoteLines.push(trimmed.replace(/^>+\s?/, ""));
    } else if (blockquoteLines.length > 0) {
      break;
    }
  }
  if (blockquoteLines.length > 0) {
    const combined = blockquoteLines.join(" ");
    const cleaned = cleanQuoteString(combined);
    if (cleaned) return truncateQuote(cleaned, maxLength);
  }

  // 2. Multi-line or single-line quote wrapped in matching quotes: "...", “...”, «...»
  const quoteMatch = content.match(/["“«]([^"”»\n]+(?:\n[^"”»\n]+)?)["”»]/);
  if (quoteMatch) {
    const candidate = quoteMatch[1].replace(/\s+/g, " ").trim();
    if (candidate.length >= 3 && !candidate.startsWith("#")) {
      const cleaned = cleanQuoteString(candidate);
      if (cleaned) return truncateQuote(cleaned, maxLength);
    }
  }

  // 3. Fallback: single line with quotes or starting with quote
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^[*_]*["“'«].+["”'»][*_]*$/.test(line)) {
      const cleaned = cleanQuoteString(line);
      if (cleaned) return truncateQuote(cleaned, maxLength);
    }
  }

  return undefined;
}

export function formatCoordinates(
  metadata:
    { coordinates?: { x: number; y: number } | undefined } | undefined | null,
): string | undefined {
  const coordinates = metadata?.coordinates;
  if (
    !coordinates ||
    !Number.isFinite(coordinates.x) ||
    !Number.isFinite(coordinates.y)
  ) {
    return undefined;
  }
  return `${coordinates.x}, ${coordinates.y}`;
}

/**
 * Subtitle line for character and entity cards (e.g. "Menneske · Kriger" or "Halvalv · Magiker").
 */
export function extractEntitySubtitle(
  entity:
    | {
        type?: string | null;
        kind?: string | null;
        labels?: string[] | null;
        content?: string | null;
        metadata?: Record<string, unknown> | null;
      }
    | undefined
    | null,
): string {
  if (!entity) return "";

  const meta = entity.metadata as
    Record<string, string | undefined> | undefined;
  const ancestry =
    meta?.ancestry || meta?.race || meta?.rase || meta?.species || "";
  const role =
    meta?.class ||
    meta?.klasse ||
    meta?.role ||
    meta?.yrke ||
    meta?.profession ||
    meta?.occupation ||
    "";
  if (ancestry && role) return `${ancestry} · ${role}`;
  if (ancestry) return ancestry;
  if (role) return role;

  if (entity.content) {
    const lines = entity.content.split("\n");
    let foundRace = "";
    let foundClass = "";
    for (const line of lines) {
      const trimmed = line.trim();
      const m = trimmed.match(
        /^(?:[-*•]\s*)?\*{0,2}([^*:]+)\*{0,2}[:-]\s*(.+)$/,
      );
      if (!m) continue;
      const key = m[1].replace(/[*_`]/g, "").trim().toLowerCase();
      const val = m[2].replace(/[*_`]/g, "").trim();

      if (!foundRace && ["race", "ancestry", "rase", "species"].includes(key)) {
        foundRace = val;
      }
      if (
        !foundClass &&
        [
          "class",
          "klasse",
          "role",
          "yrke/rolle",
          "yrke",
          "profession",
          "occupation",
        ].includes(key)
      ) {
        foundClass = val;
      }
    }
    if (foundRace && foundClass) return `${foundRace} · ${foundClass}`;
    if (foundRace) return foundRace;
    if (foundClass) return foundClass;
  }

  if (entity.labels && entity.labels.length > 0) {
    const COMMON_ANCESTRIES = [
      "human",
      "menneske",
      "elf",
      "alv",
      "halvalv",
      "half-elf",
      "dwarf",
      "dverg",
      "halfling",
      "tiefling",
      "orc",
      "ork",
      "gnome",
    ];
    let raceFromLabel = "";
    let roleFromLabel = "";
    for (const label of entity.labels) {
      const lower = label.toLowerCase();
      if (!raceFromLabel && COMMON_ANCESTRIES.some((a) => lower.includes(a))) {
        raceFromLabel = label;
      } else if (
        !roleFromLabel &&
        ![
          "female",
          "male",
          "kvinne",
          "mann",
          "ally",
          "alliert",
          "enemy",
          "fiende",
          "party",
          "partyet",
          "neutral",
          "nøytral",
          "character",
        ].includes(lower)
      ) {
        roleFromLabel = label;
      }
    }
    if (raceFromLabel && roleFromLabel)
      return `${raceFromLabel} · ${roleFromLabel}`;
    if (roleFromLabel) return roleFromLabel;
    if (raceFromLabel) return raceFromLabel;
  }

  if (entity.kind) return entity.kind;

  return entity.type
    ? entity.type.charAt(0).toUpperCase() + entity.type.slice(1)
    : "";
}

export interface DossierAttribute {
  label: string;
  value: string;
  icon?: string;
}

const DOSSIER_KEYS = [
  "alder",
  "age",
  "opprinnelse",
  "origin",
  "homeland",
  "nåværende lokasjon",
  "naværende lokasjon",
  "lokasjon",
  "location",
  "current location",
  "tilknytning",
  "tilhørighet",
  "affiliation",
  "faction",
  "faksjon",
  "yrke/rolle",
  "yrke",
  "rolle",
  "role",
  "class",
  "klasse",
  "occupation",
  "status",
  "spesielle trekk",
  "trekk",
  "traits",
  "special traits",
  "rase",
  "race",
  "ancestry",
];

function toEnglishAttributeLabel(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower === "alder" || lower === "age") return "Age";
  if (lower === "opprinnelse" || lower === "origin" || lower === "homeland")
    return "Origin";
  if (lower.includes("lokasjon") || lower.includes("location"))
    return "Location";
  if (
    lower.includes("tilknyt") ||
    lower.includes("tilhør") ||
    lower.includes("affil") ||
    lower.includes("faksjon") ||
    lower === "faction"
  ) {
    return "Affiliation";
  }
  if (
    lower.includes("yrke") ||
    lower.includes("rolle") ||
    lower === "role" ||
    lower === "class" ||
    lower === "occupation"
  ) {
    return "Role";
  }
  if (lower.includes("trekk") || lower.includes("trait")) return "Traits";
  if (lower === "status") return "Status";
  if (lower === "rase" || lower === "race" || lower === "ancestry")
    return "Race";
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
}

export function extractDossierAttributes(
  content: string | undefined | null,
  metadata?: Record<string, unknown> | null,
  entity?: {
    type?: string | null;
    kind?: string | null;
    labels?: string[] | null;
    content?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null,
): DossierAttribute[] {
  const attributes: DossierAttribute[] = [];
  const seen = new Set<string>();

  const add = (label: string, value: string, icon?: string) => {
    const englishLabel = toEnglishAttributeLabel(label);
    const norm = englishLabel.toLowerCase();
    if (!seen.has(norm) && value.trim()) {
      seen.add(norm);
      attributes.push({ label: englishLabel, value: value.trim(), icon });
    }
  };

  if (content) {
    const lines = content.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const match = line.match(
        /^(?:[-*•]\s*)?\*{0,2}([-A-Za-zæøåÆØÅ\s/_]{2,25})\*{0,2}[:-]\s*(.+)$/,
      );
      if (match) {
        const key = match[1].trim();
        if (key.startsWith("#")) continue;
        const val = match[2]
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/[*_`~]/g, "")
          .trim();
        if (val && !val.startsWith("http")) {
          const lowerKey = key.toLowerCase();
          if (
            DOSSIER_KEYS.some((k) => lowerKey === k || lowerKey.startsWith(k))
          ) {
            let icon: string | undefined;
            if (
              lowerKey.includes("lokasjon") ||
              lowerKey.includes("location")
            ) {
              icon = "icon-[lucide--map-pin]";
            } else if (
              lowerKey.includes("tilknyt") ||
              lowerKey.includes("tilhør") ||
              lowerKey.includes("affil")
            ) {
              icon = "icon-[lucide--shield]";
            } else if (
              lowerKey.includes("yrke") ||
              lowerKey.includes("role") ||
              lowerKey.includes("class")
            ) {
              icon = "icon-[lucide--swords]";
            } else if (lowerKey.includes("status")) {
              icon = "icon-[lucide--badge-check]";
            } else if (
              lowerKey.includes("trekk") ||
              lowerKey.includes("trait")
            ) {
              icon = "icon-[lucide--sparkles]";
            }
            add(key, val, icon);
          }
        }
      }
    }
  }

  if (metadata) {
    if (metadata.age && !seen.has("age")) {
      add("Age", String(metadata.age));
    }
    const originVal =
      metadata.origin || metadata.opprinnelse || metadata.homeland;
    if (originVal && !seen.has("origin")) {
      add("Origin", String(originVal));
    }
    const locVal =
      metadata.location ||
      metadata.lokasjon ||
      metadata.currentLocation ||
      metadata.current_location;
    if (locVal && !seen.has("location")) {
      add("Location", String(locVal), "icon-[lucide--map-pin]");
    }
    const affilVal =
      metadata.affiliation ||
      metadata.tilknytning ||
      metadata.tilhørighet ||
      metadata.faction;
    if (affilVal && !seen.has("affiliation")) {
      add("Affiliation", String(affilVal), "icon-[lucide--shield]");
    }
    const roleVal =
      metadata.role ||
      metadata.yrke ||
      metadata.class ||
      metadata.klasse ||
      metadata.occupation;
    if (roleVal && !seen.has("role")) {
      add("Role", String(roleVal), "icon-[lucide--swords]");
    }
    if (metadata.status && !seen.has("status")) {
      add("Status", String(metadata.status), "icon-[lucide--badge-check]");
    }
    const traitsVal =
      metadata.traits ||
      metadata.trekk ||
      metadata.specialTraits ||
      metadata.spesielle_trekk;
    if (traitsVal && !seen.has("traits")) {
      add("Traits", String(traitsVal), "icon-[lucide--sparkles]");
    }
  }

  // Fallback stats derived from entity if sparse, ensuring no awkward empty space
  if (attributes.length < 3 && entity) {
    if (!seen.has("role")) {
      const role = extractEntitySubtitle(entity);
      if (
        role &&
        role !== "Character" &&
        role !== "Unknown" &&
        role !== "Note"
      ) {
        add("Role", role, "icon-[lucide--swords]");
      }
    }
    if (!seen.has("status")) {
      const stance = getEntityPrimaryStance(entity);
      if (
        stance.badgeText &&
        stance.badgeText !== "Character" &&
        stance.badgeText !== "Unknown"
      ) {
        add("Status", stance.badgeText, "icon-[lucide--badge-check]");
      }
    }
    if (!seen.has("race") && entity.labels) {
      const COMMON_ANCESTRIES = [
        "human",
        "menneske",
        "elf",
        "alv",
        "halvalv",
        "half-elf",
        "dwarf",
        "dverg",
        "halfling",
        "tiefling",
        "orc",
        "ork",
        "gnome",
      ];
      const raceLabel = entity.labels.find((l: string) =>
        COMMON_ANCESTRIES.some((a) => l.toLowerCase().includes(a)),
      );
      if (raceLabel) add("Race", raceLabel);
    }
    if (!seen.has("traits") && entity.labels && entity.labels.length > 0) {
      const nonTraits = [
        "ally",
        "alliert",
        "enemy",
        "fiende",
        "party",
        "partyet",
        "neutral",
        "nøytral",
        "character",
        "female",
        "male",
        "kvinne",
        "mann",
        "human",
        "menneske",
        "elf",
        "alv",
        "dwarf",
        "dverg",
        "halfling",
        "tiefling",
        "orc",
        "ork",
        "gnome",
        "rogue",
        "fighter",
        "wizard",
        "cleric",
      ];
      const traitLabels = entity.labels.filter(
        (l: string) => !nonTraits.some((nt) => l.toLowerCase().includes(nt)),
      );
      if (traitLabels.length > 0) {
        add("Traits", traitLabels.join(", "), "icon-[lucide--sparkles]");
      }
    }
  }

  return attributes;
}

export interface DossierSections {
  background?: string;
  goals: string[];
}

export function extractDossierSections(
  content: string | undefined | null,
): DossierSections {
  if (!content) return { goals: [] };

  const sections: DossierSections = { goals: [] };
  const lines = content.split("\n");

  let currentSection: "none" | "background" | "goals" = "none";
  const bgLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headerMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headerMatch) {
      const heading = headerMatch[1].trim().toLowerCase();
      if (
        heading.includes("bakgrunn") ||
        heading.includes("background") ||
        heading.includes("overview") ||
        heading.includes("lore") ||
        heading.includes("beskrivelse") ||
        heading.includes("description")
      ) {
        currentSection = "background";
        continue;
      } else if (
        heading.includes("mål") ||
        heading.includes("mal") ||
        heading.includes("goal") ||
        heading.includes("motivation") ||
        heading.includes("agenda")
      ) {
        currentSection = "goals";
        continue;
      } else {
        currentSection = "none";
        continue;
      }
    }

    if (currentSection === "goals") {
      const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        const goal = bulletMatch[1].replace(/[*_`~]/g, "").trim();
        if (goal) sections.goals.push(goal);
      }
    } else if (currentSection === "background") {
      if (
        !line.match(
          /^(?:[-*•]\s*)?\*{0,2}[-A-Za-zæøåÆØÅ\s/_]{2,25}\*{0,2}[:-]/,
        ) &&
        !line.startsWith(">")
      ) {
        if (line) bgLines.push(line);
      }
    }
  }

  if (bgLines.length > 0) {
    sections.background = bgLines.join(" ");
  }

  return sections;
}

export interface FactionTag {
  label: string;
  icon: string;
  variant: "ally" | "enemy" | "neutral" | "default";
}

export function getFactionTags(
  labels?: string[] | null,
  _content?: string | null,
): FactionTag[] {
  const tags: FactionTag[] = [];
  const list = Array.isArray(labels) ? labels : [];

  for (const label of list) {
    const lower = label.trim().toLowerCase();
    if (
      lower.includes("alliert") ||
      lower.includes("allianse") ||
      lower.includes("ally")
    ) {
      tags.push({
        label:
          lower.includes("alliert") || lower.includes("allianse")
            ? "Ally"
            : label,
        icon: "icon-[lucide--shield]",
        variant: "ally",
      });
    } else if (
      lower.includes("fiende") ||
      lower.includes("hostile") ||
      lower.includes("enemy")
    ) {
      tags.push({
        label: lower.includes("fiende") ? "Enemy" : label,
        icon: "icon-[lucide--skull]",
        variant: "enemy",
      });
    } else if (lower.includes("nøytral") || lower.includes("neutral")) {
      tags.push({
        label: lower.includes("nøytral") ? "Neutral" : label,
        icon: "icon-[lucide--scale]",
        variant: "neutral",
      });
    } else if (
      lower.includes("makt") ||
      lower.includes("militær") ||
      lower.includes("power")
    ) {
      tags.push({
        label: lower.includes("politisk makt") ? "Political Power" : label,
        icon: "icon-[lucide--swords]",
        variant: "default",
      });
    } else if (
      lower.includes("handel") ||
      lower.includes("trade") ||
      lower.includes("coins")
    ) {
      tags.push({
        label: lower.includes("handel") ? "Trade" : label,
        icon: "icon-[lucide--coins]",
        variant: "default",
      });
    } else if (
      lower.includes("info") ||
      lower.includes("spion") ||
      lower.includes("secret")
    ) {
      tags.push({
        label: lower.includes("informasjon") ? "Intelligence" : label,
        icon: "icon-[lucide--scroll]",
        variant: "default",
      });
    } else if (
      lower.includes("kult") ||
      lower.includes("cult") ||
      lower.includes("magi") ||
      lower.includes("magic")
    ) {
      tags.push({
        label: lower.includes("kult")
          ? "Cult"
          : lower.includes("magi")
            ? "Magic"
            : label,
        icon: "icon-[lucide--sparkles]",
        variant: "default",
      });
    } else if (
      lower.includes("underverden") ||
      lower.includes("underworld") ||
      lower.includes("thief") ||
      lower.includes("shadow")
    ) {
      tags.push({
        label: lower.includes("underverden") ? "Underworld" : label,
        icon: "icon-[lucide--dagger]",
        variant: "default",
      });
    } else if (
      lower.includes("by") ||
      lower.includes("city") ||
      lower.includes("borg")
    ) {
      tags.push({
        label: lower === "by" ? "City" : lower === "borg" ? "Citadel" : label,
        icon: "icon-[lucide--castle]",
        variant: "default",
      });
    } else if (
      lower.includes("valdren") ||
      lower.includes("lokasjon") ||
      lower.includes("location")
    ) {
      tags.push({
        label: lower.includes("lokasjon") ? "Location" : label,
        icon: "icon-[lucide--map-pin]",
        variant: "default",
      });
    } else {
      tags.push({ label, icon: "icon-[lucide--tag]", variant: "default" });
    }
  }

  return tags;
}
