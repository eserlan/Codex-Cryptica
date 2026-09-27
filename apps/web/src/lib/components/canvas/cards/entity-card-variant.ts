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

export function getFactionMemberIcon(
  subtitle: string,
  isLeader: boolean,
): string {
  if (isLeader) return "icon-[lucide--crown]";
  const role = subtitle.toLowerCase();
  const iconRules: [string[], string][] = [
    [
      ["krig", "warrior", "fighter", "barbarian", "ridder", "knight"],
      "icon-[lucide--swords]",
    ],
    [
      ["mag", "wizard", "sorcerer", "warlock", "heks"],
      "icon-[lucide--sparkles]",
    ],
    [
      ["klerik", "cleric", "paladin", "priest", "prest"],
      "icon-[lucide--shield]",
    ],
    [["skurk", "rogue", "thief", "tyv", "assassin"], "icon-[lucide--dagger]"],
    [["speider", "ranger", "hunter", "jeger"], "icon-[lucide--compass]"],
    [["bard", "skald"], "icon-[lucide--music]"],
  ];
  return (
    iconRules.find(([terms]) =>
      terms.some((term) => role.includes(term)),
    )?.[1] ?? "icon-[lucide--user]"
  );
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
  const isLeader = isLeaderRelation(conn.label, conn.type);
  if (
    seen.has(targetId) ||
    !isFactionRelation(conn, targetEntity, factionTitle, isLeader)
  )
    return false;
  seen.add(targetId);
  appendFactionRelation(
    targetId,
    targetEntity,
    conn,
    isLeader,
    leaders,
    members,
  );
  return true;
}

function appendFactionRelation(
  targetId: string,
  entity: { title?: string | null } | undefined,
  conn: { label?: string | null; type?: string | null },
  isLeader: boolean,
  leaders: RelationRow[],
  members: RelationRow[],
): void {
  const stance = getConnectionStance(conn.type);
  const row: RelationRow = {
    target: targetId,
    title: entity?.title || "Unknown",
    text: conn.label?.trim() || (isLeader ? "Leader" : "Member"),
    stance: isLeader && stance === "neutral" ? "ally" : stance,
  };
  (isLeader ? leaders : members).push(row);
}

function isFactionRelation(
  conn: { label?: string | null; type?: string | null },
  entity: { metadata?: Record<string, unknown> | null } | undefined,
  factionTitle: string,
  isLeader: boolean,
): boolean {
  return (
    isLeader ||
    isMemberRelation(conn.label, conn.type) ||
    hasFactionAffiliation(entity, factionTitle) ||
    isExplicitGhostMember(entity, conn.type)
  );
}

function hasFactionAffiliation(
  entity: { metadata?: Record<string, unknown> | null } | undefined,
  factionTitle: string,
): boolean {
  if (factionTitle.length <= 2) return false;
  const affiliation = firstMetadataValue(entity?.metadata ?? {}, [
    "affiliation",
    "faction",
    "tilknytning",
  ]);
  return String(affiliation ?? "")
    .toLowerCase()
    .includes(factionTitle);
}

function isExplicitGhostMember(
  entity: unknown,
  connectionType: string | null | undefined,
): boolean {
  return (
    !entity &&
    ["part_of", "member", "leads", "leader"].includes(connectionType ?? "")
  );
}

const NON_PERSON_TYPES = new Set([
  "location",
  "place",
  "item",
  "gjenstand",
  "loot",
  "note",
  "session",
  "log",
  "quest",
  "lore",
  "event",
  "hendelse",
]);
const PERSON_TYPES = new Set([
  "character",
  "creature",
  "person",
  "npc",
  "pc",
  "spiller",
  "player",
]);

function processFactionOutgoing(
  connections: FactionConnectionLike[],
  entities: Record<
    string,
    | {
        title?: string;
        type?: string;
        metadata?: Record<string, unknown> | null;
      }
    | undefined
  >,
  factionTitle: string,
  seen: Set<string>,
  leaders: RelationRow[],
  members: RelationRow[],
): void {
  for (const connection of connections) {
    const target = entities[connection.target];
    if (NON_PERSON_TYPES.has((target?.type ?? "").toLowerCase())) continue;
    tryAddFactionRelation(
      connection.target,
      target,
      connection,
      factionTitle,
      seen,
      leaders,
      members,
    );
  }
}

function processFactionIncoming(
  factionId: string | undefined,
  entities: Record<
    string,
    | {
        title?: string;
        type?: string;
        connections?: FactionConnectionLike[];
        metadata?: Record<string, unknown> | null;
      }
    | undefined
  >,
  factionTitle: string,
  seen: Set<string>,
  leaders: RelationRow[],
  members: RelationRow[],
): void {
  if (!factionId) return;
  for (const [id, entity] of Object.entries(entities)) {
    addIncomingFactionRelation(
      id,
      entity,
      factionId,
      factionTitle,
      seen,
      leaders,
      members,
    );
  }
}

function addIncomingFactionRelation(
  id: string,
  entity:
    | {
        title?: string;
        type?: string;
        connections?: FactionConnectionLike[];
        metadata?: Record<string, unknown> | null;
      }
    | undefined,
  factionId: string,
  factionTitle: string,
  seen: Set<string>,
  leaders: RelationRow[],
  members: RelationRow[],
): void {
  if (
    !entity ||
    !PERSON_TYPES.has((entity.type ?? "").toLowerCase()) ||
    seen.has(id)
  )
    return;
  for (const connection of entity.connections ?? []) {
    if (connection.target !== factionId) continue;
    const added = tryAddFactionRelation(
      id,
      entity,
      connection,
      factionTitle,
      seen,
      leaders,
      members,
    );
    if (added) break;
  }
}

function makeFactionRelationResult(
  leaders: RelationRow[],
  members: RelationRow[],
) {
  const groups: LinkGroup[] = [];
  if (leaders.length)
    groups.push({ key: "character", label: "Leaders", rows: leaders });
  if (members.length)
    groups.push({ key: "character", label: "Members", rows: members });
  const roster = [...leaders, ...members];
  return {
    groups,
    members: roster
      .slice(0, 5)
      .map((row) => ({ id: row.target, title: row.title, stance: row.stance })),
    memberCount: roster.length,
    leaders,
    allRosterMembers: [
      ...leaders.map((row) => ({ ...row, isLeader: true })),
      ...members.map((row) => ({ ...row, isLeader: false })),
    ],
  };
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

  processFactionOutgoing(
    connections,
    entities,
    factionTitle,
    seenEntities,
    leaderRows,
    memberRows,
  );
  processFactionIncoming(
    factionId,
    entities,
    factionTitle,
    seenEntities,
    leaderRows,
    memberRows,
  );
  return makeFactionRelationResult(leaderRows, memberRows);
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

function quoteFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  maxLength: number,
): string | undefined {
  const value = firstMetadataValue(metadata ?? {}, [
    "quote",
    "tagline",
    "motto",
    "sitat",
  ]);
  if (typeof value !== "string" || !value.trim()) return undefined;
  const cleaned = cleanQuoteString(value.trim());
  return cleaned ? truncateQuote(cleaned, maxLength) : undefined;
}

function quoteFromBlockquote(
  lines: string[],
  maxLength: number,
): string | undefined {
  const quoteLines: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith(">")) {
      if (quoteLines.length > 0) break;
      continue;
    }
    quoteLines.push(line.replace(/^>+\s?/, ""));
  }
  const cleaned = cleanQuoteString(quoteLines.join(" "));
  return cleaned ? truncateQuote(cleaned, maxLength) : undefined;
}

function quoteFromWrappedText(
  content: string,
  maxLength: number,
): string | undefined {
  const match = content.match(/["“«]([^"”»\n]+(?:\n[^"”»\n]+)?)["”»]/);
  const candidate = match?.[1].replace(/\s+/g, " ").trim();
  if (!candidate || candidate.length < 3 || candidate.startsWith("#"))
    return undefined;
  const cleaned = cleanQuoteString(candidate);
  return cleaned ? truncateQuote(cleaned, maxLength) : undefined;
}

function quoteFromQuotedLine(
  lines: string[],
  maxLength: number,
): string | undefined {
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (
      !line ||
      line.startsWith("#") ||
      !/^[*_]*["“'«].+["”'»][*_]*$/.test(line)
    )
      continue;
    const cleaned = cleanQuoteString(line);
    if (cleaned) return truncateQuote(cleaned, maxLength);
  }
  return undefined;
}

/**
 * An author-written quote: markdown blockquote (`> …`), explicit quoted line, or metadata quote.
 */
export function extractQuote(
  content: string | undefined | null,
  metadata?: Record<string, unknown> | null,
  maxLength = 140,
): string | undefined {
  const metadataQuote = quoteFromMetadata(metadata, maxLength);
  if (metadataQuote) return metadataQuote;
  if (!content) return undefined;
  const lines = content.split("\n");
  return (
    quoteFromBlockquote(lines, maxLength) ??
    quoteFromWrappedText(content, maxLength) ??
    quoteFromQuotedLine(lines, maxLength)
  );
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
  const metadataSubtitle = combineSubtitle(
    firstValue(meta, ["ancestry", "race", "rase", "species"]),
    firstValue(meta, [
      "class",
      "klasse",
      "role",
      "yrke",
      "profession",
      "occupation",
    ]),
  );
  if (metadataSubtitle) return metadataSubtitle;
  const contentSubtitle = subtitleFromContent(entity.content);
  if (contentSubtitle) return contentSubtitle;
  const labelSubtitle = subtitleFromLabels(entity.labels);
  if (labelSubtitle) return labelSubtitle;
  if (entity.kind) return entity.kind;
  return entity.type
    ? entity.type.charAt(0).toUpperCase() + entity.type.slice(1)
    : "";
}

function firstValue(
  record: Record<string, string | undefined> | undefined,
  keys: string[],
): string {
  return keys.map((key) => record?.[key]).find(Boolean) ?? "";
}

function combineSubtitle(ancestry: string, role: string): string {
  if (ancestry && role) return `${ancestry} · ${role}`;
  return ancestry || role;
}

const ANCESTRY_KEYS = ["race", "ancestry", "rase", "species"];
const ROLE_KEYS = [
  "class",
  "klasse",
  "role",
  "yrke/rolle",
  "yrke",
  "profession",
  "occupation",
];
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
const NON_ROLE_LABELS = new Set([
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
]);

function subtitleFromContent(content: string | null | undefined): string {
  if (!content) return "";
  let ancestry = "";
  let role = "";
  for (const line of content.split("\n")) {
    const match = line
      .trim()
      .match(/^(?:[-*•]\s*)?\*{0,2}([^*:]+)\*{0,2}[:-]\s*(.+)$/);
    if (!match) continue;
    const key = match[1].replace(/[*_`]/g, "").trim().toLowerCase();
    const value = match[2].replace(/[*_`]/g, "").trim();
    if (!ancestry && ANCESTRY_KEYS.includes(key)) ancestry = value;
    if (!role && ROLE_KEYS.includes(key)) role = value;
  }
  return combineSubtitle(ancestry, role);
}

function subtitleFromLabels(labels: string[] | null | undefined): string {
  let ancestry = "";
  let role = "";
  for (const label of labels ?? []) {
    const lower = label.toLowerCase();
    if (!ancestry && COMMON_ANCESTRIES.some((item) => lower.includes(item)))
      ancestry = label;
    else if (!role && !NON_ROLE_LABELS.has(lower)) role = label;
  }
  return combineSubtitle(ancestry, role);
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
  const exactLabels: Record<string, string> = {
    alder: "Age",
    age: "Age",
    opprinnelse: "Origin",
    origin: "Origin",
    homeland: "Origin",
    faction: "Affiliation",
    role: "Role",
    class: "Role",
    occupation: "Role",
    status: "Status",
    rase: "Race",
    race: "Race",
    ancestry: "Race",
  };
  if (exactLabels[lower]) return exactLabels[lower];
  const includesLabels: [string[], string][] = [
    [["lokasjon", "location"], "Location"],
    [["tilknyt", "tilhør", "affil", "faksjon"], "Affiliation"],
    [["yrke", "rolle"], "Role"],
    [["trekk", "trait"], "Traits"],
  ];
  const match = includesLabels.find(([needles]) =>
    needles.some((needle) => lower.includes(needle)),
  );
  return match?.[1] ?? raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
}

type DossierAttributeAdder = (
  label: string,
  value: string,
  icon?: string,
) => void;

type DossierEntity = {
  type?: string | null;
  kind?: string | null;
  labels?: string[] | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function extractDossierAttributes(
  content: string | undefined | null,
  metadata?: Record<string, unknown> | null,
  entity?: DossierEntity | null,
): DossierAttribute[] {
  const attributes: DossierAttribute[] = [];
  const seen = new Set<string>();
  const add: DossierAttributeAdder = (label, value, icon) => {
    const englishLabel = toEnglishAttributeLabel(label);
    const normalized = englishLabel.toLowerCase();
    if (seen.has(normalized) || !value.trim()) return;
    seen.add(normalized);
    attributes.push({ label: englishLabel, value: value.trim(), icon });
  };

  addContentAttributes(content, add);
  addMetadataAttributes(metadata, add);
  addFallbackAttributes(attributes, seen, entity, add);
  return attributes;
}

function addContentAttributes(
  content: string | null | undefined,
  add: DossierAttributeAdder,
): void {
  for (const rawLine of content?.split("\n") ?? []) {
    const match = rawLine
      .trim()
      .match(
        /^(?:[-*•]\s*)?\*{0,2}([-A-Za-zæøåÆØÅ\s/_]{2,25})\*{0,2}[:-]\s*(.+)$/,
      );
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .trim();
    if (key.startsWith("#") || !value || value.startsWith("http")) continue;
    const lowerKey = key.toLowerCase();
    if (
      DOSSIER_KEYS.some(
        (candidate) => lowerKey === candidate || lowerKey.startsWith(candidate),
      )
    ) {
      add(key, value, iconForAttribute(lowerKey));
    }
  }
}

function iconForAttribute(key: string): string | undefined {
  const rules: [string[], string][] = [
    [["lokasjon", "location"], "icon-[lucide--map-pin]"],
    [["tilknyt", "tilhør", "affil"], "icon-[lucide--shield]"],
    [["yrke", "role", "class"], "icon-[lucide--swords]"],
    [["status"], "icon-[lucide--badge-check]"],
    [["trekk", "trait"], "icon-[lucide--sparkles]"],
  ];
  return rules.find(([terms]) => terms.some((term) => key.includes(term)))?.[1];
}

function firstMetadataValue(
  metadata: Record<string, unknown>,
  keys: string[],
): unknown {
  return keys.map((key) => metadata[key]).find(Boolean);
}

function addMetadataAttributes(
  metadata: Record<string, unknown> | null | undefined,
  add: DossierAttributeAdder,
): void {
  if (!metadata) return;
  const fields: [string, string[], string?][] = [
    ["Age", ["age"]],
    ["Origin", ["origin", "opprinnelse", "homeland"]],
    [
      "Location",
      ["location", "lokasjon", "currentLocation", "current_location"],
      "icon-[lucide--map-pin]",
    ],
    [
      "Affiliation",
      ["affiliation", "tilknytning", "tilhørighet", "faction"],
      "icon-[lucide--shield]",
    ],
    [
      "Role",
      ["role", "yrke", "class", "klasse", "occupation"],
      "icon-[lucide--swords]",
    ],
    ["Status", ["status"], "icon-[lucide--badge-check]"],
    [
      "Traits",
      ["traits", "trekk", "specialTraits", "spesielle_trekk"],
      "icon-[lucide--sparkles]",
    ],
  ];
  for (const [label, keys, icon] of fields) {
    const value = firstMetadataValue(metadata, keys);
    if (value) add(label, String(value), icon);
  }
}

const NON_TRAIT_LABELS = [
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

function addFallbackAttributes(
  attributes: DossierAttribute[],
  seen: Set<string>,
  entity: DossierEntity | null | undefined,
  add: DossierAttributeAdder,
): void {
  if (!entity || attributes.length >= 3) return;
  addRoleAndStatusFallbacks(seen, entity, add);
  addLabelFallbacks(seen, entity.labels ?? [], add);
}

function addRoleAndStatusFallbacks(
  seen: Set<string>,
  entity: DossierEntity,
  add: DossierAttributeAdder,
): void {
  if (!seen.has("role")) {
    const role = extractEntitySubtitle(entity);
    if (role && !["Character", "Unknown", "Note"].includes(role)) {
      add("Role", role, "icon-[lucide--swords]");
    }
  }
  if (!seen.has("status")) {
    const status = getEntityPrimaryStance(entity).badgeText;
    if (status && !["Character", "Unknown"].includes(status)) {
      add("Status", status, "icon-[lucide--badge-check]");
    }
  }
}

function addLabelFallbacks(
  seen: Set<string>,
  labels: string[],
  add: DossierAttributeAdder,
): void {
  if (!seen.has("race")) {
    const race = labels.find((label) =>
      COMMON_ANCESTRIES.some((term) => label.toLowerCase().includes(term)),
    );
    if (race) add("Race", race);
  }
  if (!seen.has("traits")) {
    const traits = labels.filter(
      (label) =>
        !NON_TRAIT_LABELS.some((term) => label.toLowerCase().includes(term)),
    );
    if (traits.length)
      add("Traits", traits.join(", "), "icon-[lucide--sparkles]");
  }
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
      currentSection = classifyDossierSection(headerMatch[1]);
      continue;
    }

    if (currentSection === "goals") appendGoal(line, sections.goals);
    if (currentSection === "background" && isBackgroundText(line))
      bgLines.push(line);
  }

  if (bgLines.length > 0) {
    sections.background = bgLines.join(" ");
  }

  return sections;
}

type DossierSectionName = "none" | "background" | "goals";

function classifyDossierSection(rawHeading: string): DossierSectionName {
  const heading = rawHeading.trim().toLowerCase();
  const backgroundTerms = [
    "bakgrunn",
    "background",
    "overview",
    "lore",
    "beskrivelse",
    "description",
  ];
  const goalTerms = ["mål", "mal", "goal", "motivation", "agenda"];
  if (backgroundTerms.some((term) => heading.includes(term)))
    return "background";
  if (goalTerms.some((term) => heading.includes(term))) return "goals";
  return "none";
}

function appendGoal(line: string, goals: string[]): void {
  const match = line.match(/^[-*•]\s+(.+)$/);
  const goal = match?.[1].replace(/[*_`~]/g, "").trim();
  if (goal) goals.push(goal);
}

function isBackgroundText(line: string): boolean {
  const isAttribute =
    /^(?:[-*•]\s*)?\*{0,2}[-A-Za-zæøåÆØÅ\s/_]{2,25}\*{0,2}[:-]/.test(line);
  return Boolean(line) && !isAttribute && !line.startsWith(">");
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
  return (Array.isArray(labels) ? labels : []).map(makeFactionTag);
}

const FACTION_TAG_RULES: {
  terms: string[];
  icon: string;
  variant: FactionTag["variant"];
  label?: (raw: string, lower: string) => string;
}[] = [
  {
    terms: ["alliert", "allianse", "ally"],
    icon: "icon-[lucide--shield]",
    variant: "ally",
    label: (raw, lower) =>
      lower.includes("alliert") || lower.includes("allianse") ? "Ally" : raw,
  },
  {
    terms: ["fiende", "hostile", "enemy"],
    icon: "icon-[lucide--skull]",
    variant: "enemy",
    label: (raw, lower) => (lower.includes("fiende") ? "Enemy" : raw),
  },
  {
    terms: ["nøytral", "neutral"],
    icon: "icon-[lucide--scale]",
    variant: "neutral",
    label: (raw, lower) => (lower.includes("nøytral") ? "Neutral" : raw),
  },
  {
    terms: ["makt", "militær", "power"],
    icon: "icon-[lucide--swords]",
    variant: "default",
    label: (raw, lower) =>
      lower.includes("politisk makt") ? "Political Power" : raw,
  },
  {
    terms: ["handel", "trade", "coins"],
    icon: "icon-[lucide--coins]",
    variant: "default",
    label: (raw, lower) => (lower.includes("handel") ? "Trade" : raw),
  },
  {
    terms: ["info", "spion", "secret"],
    icon: "icon-[lucide--scroll]",
    variant: "default",
    label: (raw, lower) =>
      lower.includes("informasjon") ? "Intelligence" : raw,
  },
  {
    terms: ["kult", "cult", "magi", "magic"],
    icon: "icon-[lucide--sparkles]",
    variant: "default",
    label: (raw, lower) =>
      lower.includes("kult") ? "Cult" : lower.includes("magi") ? "Magic" : raw,
  },
  {
    terms: ["underverden", "underworld", "thief", "shadow"],
    icon: "icon-[lucide--dagger]",
    variant: "default",
    label: (raw, lower) => (lower.includes("underverden") ? "Underworld" : raw),
  },
  {
    terms: ["by", "city", "borg"],
    icon: "icon-[lucide--castle]",
    variant: "default",
    label: (raw, lower) =>
      lower === "by" ? "City" : lower === "borg" ? "Citadel" : raw,
  },
  {
    terms: ["valdren", "lokasjon", "location"],
    icon: "icon-[lucide--map-pin]",
    variant: "default",
    label: (raw, lower) => (lower.includes("lokasjon") ? "Location" : raw),
  },
];

function makeFactionTag(label: string): FactionTag {
  const lower = label.trim().toLowerCase();
  const rule = FACTION_TAG_RULES.find((candidate) =>
    candidate.terms.some((term) => lower.includes(term)),
  );
  return rule
    ? {
        label: rule.label?.(label, lower) ?? label,
        icon: rule.icon,
        variant: rule.variant,
      }
    : { label, icon: "icon-[lucide--tag]", variant: "default" };
}
