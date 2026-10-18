import type { Connection } from "schema";
import { firstMetadataValue } from "./entity-card-content";
import type { ConnectionStance } from "./entity-card-stance";
import { getConnectionStance } from "./entity-card-stance";
import type { LinkGroup, RelationRow } from "./entity-card-variant";

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
