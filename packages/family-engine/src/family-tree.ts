import type { Entity, TemporalMetadata } from "schema";
import { type FamilyConnectionType, inverseFamilyType } from "./family-types";

export type FamilyRelation =
  "focus" | "parent" | "child" | "partner" | "sibling";

export interface FamilyMember {
  entityId: string;
  name: string;
  role?: string;
  portraitUrl?: string;
  lifespan?: string;
  deceased: boolean;
  relation: FamilyRelation;
  generation: number;
}

export interface FamilyTree {
  focusId: string;
  focus: FamilyMember;
  parents: FamilyMember[];
  partners: FamilyMember[];
  children: FamilyMember[];
  siblings: FamilyMember[];
}

const CHARACTER_TYPE = "character";

function isCharacter(entity: Entity | undefined): entity is Entity {
  return !!entity && entity.type === CHARACTER_TYPE;
}

function temporalYear(t: TemporalMetadata | undefined): number | undefined {
  // Both temporal shapes (DateSelection and legacy) carry a numeric `year`.
  return t ? (t as { year: number }).year : undefined;
}

function formatLifespan(entity: Entity): string | undefined {
  const start = temporalYear(entity.start_date);
  const end = temporalYear(entity.end_date);
  if (start !== undefined && end !== undefined) return `${start}–${end}`;
  if (start !== undefined) return `b. ${start}`;
  if (end !== undefined) return `d. ${end}`;
  return undefined;
}

/**
 * Entities linked to `id` by the given family type, reading BOTH directions:
 * a direct connection of `type` on `id`, or a connection of the inverse type
 * on another entity pointing at `id`. Only existing character entities are
 * returned (dangling/non-character targets are skipped).
 */
function relatedIds(
  entities: Record<string, Entity>,
  id: string,
  type: FamilyConnectionType,
): string[] {
  const found = new Set<string>();
  const inverse = inverseFamilyType(type);

  const self = entities[id];
  if (self) {
    for (const c of self.connections ?? []) {
      if (c.type === type && isCharacter(entities[c.target])) {
        found.add(c.target);
      }
    }
  }

  for (const [otherId, other] of Object.entries(entities)) {
    if (otherId === id || !isCharacter(other)) continue;
    for (const c of other.connections ?? []) {
      if (c.type === inverse && c.target === id) {
        found.add(otherId);
        break;
      }
    }
  }

  found.delete(id);
  return [...found];
}

function toMember(
  entity: Entity,
  relation: FamilyRelation,
  generation: number,
): FamilyMember {
  return {
    entityId: entity.id,
    name: entity.title,
    role: entity.labels?.[0],
    portraitUrl: entity.image ?? entity.thumbnail,
    lifespan: formatLifespan(entity),
    deceased: !!entity.end_date,
    relation,
    generation,
  };
}

function membersFor(
  entities: Record<string, Entity>,
  ids: Iterable<string>,
  relation: FamilyRelation,
  generation: number,
): FamilyMember[] {
  const members: FamilyMember[] = [];
  for (const id of ids) {
    const entity = entities[id];
    if (isCharacter(entity)) {
      members.push(toMember(entity, relation, generation));
    }
  }
  return members;
}

/**
 * Build the derived family tree centred on `focusId` from an entity map.
 * Pure: does not mutate `entities`. Siblings are inferred from shared parents.
 */
export function buildFamilyTree(
  focusId: string,
  entities: Record<string, Entity>,
): FamilyTree {
  const focusEntity = entities[focusId];
  const focus: FamilyMember = focusEntity
    ? toMember(focusEntity, "focus", 0)
    : {
        entityId: focusId,
        name: focusId,
        deceased: false,
        relation: "focus",
        generation: 0,
      };

  const parentIds = relatedIds(entities, focusId, "child_of");
  const childIds = relatedIds(entities, focusId, "parent_of");
  const partnerIds = relatedIds(entities, focusId, "spouse_of");

  // Siblings: entities (≠ focus) sharing at least one parent with the focus.
  const siblingIds = new Set<string>();
  for (const parentId of parentIds) {
    for (const childId of relatedIds(entities, parentId, "parent_of")) {
      if (childId !== focusId) siblingIds.add(childId);
    }
  }
  // A sibling must not also be a parent/child/partner of the focus.
  for (const id of [...parentIds, ...childIds, ...partnerIds]) {
    siblingIds.delete(id);
  }

  return {
    focusId,
    focus,
    parents: membersFor(entities, parentIds, "parent", -1),
    partners: membersFor(entities, partnerIds, "partner", 0),
    children: membersFor(entities, childIds, "child", 1),
    siblings: membersFor(entities, siblingIds, "sibling", 0),
  };
}
