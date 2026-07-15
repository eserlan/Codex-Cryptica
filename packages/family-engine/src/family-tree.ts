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
  /**
   * Optional human relationship term describing THIS member relative to the
   * focus (e.g. "Mother", "Brother", "Sister"), taken from the connection
   * label. Undefined when no label was recorded (e.g. inferred siblings).
   */
  relationLabel?: string;
  /** Derived from a "Male"/"Female" entity Label, if present. Undefined when unknown. */
  gender?: "male" | "female";
}

export interface FamilyTree {
  focusId: string;
  focus: FamilyMember;
  parents: FamilyMember[];
  partners: FamilyMember[];
  children: FamilyMember[];
  siblings: FamilyMember[];
}

interface Related {
  id: string;
  label?: string;
}

const CHARACTER_TYPE = "character";

// Auto-applied system labels that describe the entity's state rather than its
// role (e.g. "past" is added automatically when a finite end_date exists).
// These must never surface as a character's role/title on a family card.
const AUTO_LABELS = new Set(["past"]);

// Gender is read from the same Labels mechanism used elsewhere in the app
// (Constitution XII: Labels over Tags) rather than a dedicated schema field,
// so tagging a character "Male"/"Female" is all that's needed. Excluded from
// `role` so it never doubles as a title.
const GENDER_LABELS = new Map<string, "male" | "female">([
  ["male", "male"],
  ["female", "female"],
]);

function isCharacter(entity: Entity | undefined): entity is Entity {
  return !!entity && entity.type === CHARACTER_TYPE;
}

function pickGender(entity: Entity): "male" | "female" | undefined {
  for (const label of entity.labels ?? []) {
    const gender = GENDER_LABELS.get(label.trim().toLowerCase());
    if (gender) return gender;
  }
  return undefined;
}

function temporalYear(t: TemporalMetadata | undefined): number | undefined {
  // Both temporal shapes (DateSelection and legacy) carry a numeric `year`.
  // Only treat a finite year as present (mirrors the app's end_date checks).
  const year = t ? (t as { year: number }).year : undefined;
  return typeof year === "number" && Number.isFinite(year) ? year : undefined;
}

function pickRole(entity: Entity): string | undefined {
  return (entity.labels ?? []).find(
    (label) =>
      !AUTO_LABELS.has(label) && !GENDER_LABELS.has(label.trim().toLowerCase()),
  );
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
 *
 * The captured `label` describes the OTHER person relative to `id` and is read
 * from that other entity's connection back to `id` (e.g. the parent's
 * `parent_of` link labelled "Father", or a sibling's `sibling_of` link
 * labelled "Brother"). A label on `id`'s own outbound link describes `id`, so
 * it is not used for the other member's term.
 */
function relatedMembers(
  entities: Record<string, Entity>,
  id: string,
  type: FamilyConnectionType,
): Related[] {
  const labels = new Map<string, string | undefined>();
  const inverse = inverseFamilyType(type);

  const self = entities[id];
  if (self) {
    for (const c of self.connections ?? []) {
      if (
        c.type === type &&
        c.target !== id &&
        isCharacter(entities[c.target])
      ) {
        if (!labels.has(c.target)) labels.set(c.target, undefined);
      }
    }
  }

  for (const [otherId, other] of Object.entries(entities)) {
    if (otherId === id || !isCharacter(other)) continue;
    for (const c of other.connections ?? []) {
      if (c.type === inverse && c.target === id) {
        // The other entity's own link describes the other entity.
        if (c.label) labels.set(otherId, c.label);
        else if (!labels.has(otherId)) labels.set(otherId, undefined);
        break;
      }
    }
  }

  return [...labels].map(([relatedId, label]) => ({ id: relatedId, label }));
}

function toMember(
  entity: Entity,
  relation: FamilyRelation,
  generation: number,
  relationLabel?: string,
): FamilyMember {
  return {
    entityId: entity.id,
    name: entity.title,
    role: pickRole(entity),
    portraitUrl: entity.image ?? entity.thumbnail,
    lifespan: formatLifespan(entity),
    deceased: temporalYear(entity.end_date) !== undefined,
    relation,
    generation,
    relationLabel,
    gender: pickGender(entity),
  };
}

function membersFor(
  entities: Record<string, Entity>,
  related: Related[],
  relation: FamilyRelation,
  generation: number,
): FamilyMember[] {
  const members: FamilyMember[] = [];
  for (const { id, label } of related) {
    const entity = entities[id];
    if (isCharacter(entity)) {
      members.push(toMember(entity, relation, generation, label));
    }
  }
  return members;
}

/**
 * Build the derived family tree centred on `focusId` from an entity map.
 * Pure: does not mutate `entities`. Siblings combine explicit `sibling_of`
 * links (which can carry a "Brother"/"Sister" label and work even when parents
 * are unknown) with siblings inferred from shared parents.
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

  const parents = relatedMembers(entities, focusId, "child_of");
  const children = relatedMembers(entities, focusId, "parent_of");
  const partners = relatedMembers(entities, focusId, "spouse_of");

  // Siblings: explicit sibling_of links (with any Brother/Sister label) merged
  // with those inferred from a shared parent. Explicit labels win.
  const siblings = new Map<string, string | undefined>();
  for (const { id, label } of relatedMembers(entities, focusId, "sibling_of")) {
    siblings.set(id, label);
  }
  for (const parent of parents) {
    for (const child of relatedMembers(entities, parent.id, "parent_of")) {
      if (child.id !== focusId && !siblings.has(child.id)) {
        siblings.set(child.id, child.label);
      }
    }
  }
  // A sibling must not also be a parent/child/partner of the focus.
  for (const { id } of [...parents, ...children, ...partners]) {
    siblings.delete(id);
  }

  return {
    focusId,
    focus,
    parents: membersFor(entities, parents, "parent", -1),
    partners: membersFor(entities, partners, "partner", 0),
    children: membersFor(entities, children, "child", 1),
    siblings: membersFor(
      entities,
      [...siblings].map(([id, label]) => ({ id, label })),
      "sibling",
      0,
    ),
  };
}
