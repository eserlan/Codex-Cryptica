import type { Entity } from "schema";
import {
  FAMILY_CONNECTION_TYPES,
  inverseFamilyType,
  isFamilyType,
  type FamilyConnectionType,
} from "./family-types";
import {
  isCharacter,
  toMember,
  type FamilyMember,
  type FamilyRelation,
} from "./family-tree";

export type LineageMemberKind =
  "focus" | "ancestor" | "descendant" | "partner" | "sibling-branch";

export interface LineageMember extends FamilyMember {
  kind: LineageMemberKind;
  /** Set when this member belongs to a collapsible sibling branch. */
  branchRootId?: string;
}

export type LineageEdgeType = "parent-child" | "partner";

export interface LineageEdge {
  type: LineageEdgeType;
  from: string;
  to: string;
  /** True when `to` was already materialised via another path (FR-011). */
  secondary: boolean;
}

export interface SiblingBranch {
  hiddenCount: number;
  memberIds: string[];
}

export interface Truncation {
  atGeneration: number;
  hiddenGenerations: number;
}

export interface Lineage {
  focusId: string;
  members: Map<string, LineageMember>;
  edges: LineageEdge[];
  generations: Map<number, string[]>;
  siblingBranches: Map<string, SiblingBranch>;
  truncatedUp: Truncation | null;
  truncatedDown: Truncation | null;
}

export interface BuildLineageOptions {
  maxUp?: number;
  maxDown?: number;
  expandedBranches?: Set<string> | "all";
}

interface Related {
  id: string;
  label?: string;
}

/**
 * Precomputed adjacency over `entities`, built in one pass. Replaces per-node
 * calls to a scanning helper (which would be O(n) each) with O(1) lookups, so
 * traversing many nodes stays O(entities + connections) overall (research
 * Decision 2).
 */
interface FamilyIndex {
  related(id: string, type: FamilyConnectionType): Related[];
}

function buildFamilyIndex(entities: Record<string, Entity>): FamilyIndex {
  const direct = new Map<FamilyConnectionType, Map<string, Set<string>>>();
  const inverse = new Map<
    FamilyConnectionType,
    Map<string, Map<string, string | undefined>>
  >();
  for (const type of FAMILY_CONNECTION_TYPES) {
    direct.set(type, new Map());
    inverse.set(type, new Map());
  }

  for (const [id, entity] of Object.entries(entities)) {
    for (const c of entity.connections ?? []) {
      if (!isFamilyType(c.type) || c.target === id) continue;
      const type = c.type;

      if (isCharacter(entities[c.target])) {
        const m = direct.get(type)!;
        if (!m.has(id)) m.set(id, new Set());
        m.get(id)!.add(c.target);
      }

      if (isCharacter(entity)) {
        const invType = inverseFamilyType(type);
        const m = inverse.get(invType)!;
        if (!m.has(c.target)) m.set(c.target, new Map());
        const inner = m.get(c.target)!;
        if (c.label) inner.set(id, c.label);
        else if (!inner.has(id)) inner.set(id, undefined);
      }
    }
  }

  return {
    related(id, type) {
      const labels = new Map<string, string | undefined>();
      for (const to of direct.get(type)?.get(id) ?? []) {
        if (!labels.has(to)) labels.set(to, undefined);
      }
      for (const [other, label] of inverse.get(type)?.get(id) ?? []) {
        if (label) labels.set(other, label);
        else if (!labels.has(other)) labels.set(other, undefined);
      }
      return [...labels].map(([relatedId, label]) => ({
        id: relatedId,
        label,
      }));
    },
  };
}

function isExpanded(
  branchRootId: string,
  expandedBranches: Set<string> | "all" | undefined,
): boolean {
  if (expandedBranches === "all") return true;
  return !!expandedBranches?.has(branchRootId);
}

/**
 * Size-only walk over a branch's descendants: never materialises members,
 * only counts them, and is bounded by a visited set (the ids already shown
 * elsewhere) so it terminates on cyclic data and never re-counts someone
 * already visible (contract buildLineage guarantee 5).
 */
function countHidden(
  rootId: string,
  index: FamilyIndex,
  entities: Record<string, Entity>,
  alreadyShown: ReadonlySet<string>,
): number {
  const seen = new Set<string>(alreadyShown);
  seen.add(rootId);
  let count = 0;
  let frontier = [rootId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const { id: childId } of index.related(id, "parent_of")) {
        if (seen.has(childId)) continue;
        const entity = entities[childId];
        if (!isCharacter(entity)) continue;
        seen.add(childId);
        count++;
        next.push(childId);
      }
    }
    frontier = next;
  }
  return count;
}

/**
 * Build the derived lineage (full recorded ancestry + descent, plus sibling
 * branches) centred on `focusId`. Pure: does not mutate `entities`.
 */
export function buildLineage(
  focusId: string,
  entities: Record<string, Entity>,
  options: BuildLineageOptions = {},
): Lineage {
  const index = buildFamilyIndex(entities);
  const members = new Map<string, LineageMember>();
  const edges: LineageEdge[] = [];
  const generationOrder = new Map<number, string[]>();
  const siblingBranches = new Map<string, SiblingBranch>();
  const { maxUp, maxDown, expandedBranches } = options;
  // Sibling-branch roots may be discovered before their real parent is
  // materialised (traversal proceeds level-by-level); the parent->root edge
  // is only known to be drawable once traversal finishes.
  const pendingParentEdges: Array<{ parent: string; child: string }> = [];

  function place(id: string, generation: number) {
    if (!generationOrder.has(generation)) generationOrder.set(generation, []);
    generationOrder.get(generation)!.push(id);
  }

  function addMember(
    id: string,
    kind: LineageMemberKind,
    relation: FamilyRelation,
    generation: number,
    label: string | undefined,
    branchRootId?: string,
  ): LineageMember | null {
    if (members.has(id)) return members.get(id)!;
    const entity = entities[id];
    if (!isCharacter(entity)) return null;
    const member: LineageMember = {
      ...toMember(entity, relation, generation, label),
      kind,
      branchRootId,
    };
    members.set(id, member);
    place(id, generation);
    return member;
  }

  function addPartners(
    ofId: string,
    generation: number,
    branchRootId?: string,
  ) {
    for (const { id, label } of index.related(ofId, "spouse_of")) {
      if (members.has(id)) continue;
      const added = addMember(
        id,
        "partner",
        "partner",
        generation,
        label,
        branchRootId,
      );
      if (added)
        edges.push({ type: "partner", from: ofId, to: id, secondary: false });
    }
  }

  function collectBranchMembers(rootId: string): string[] {
    const ids: string[] = [];
    for (const [id, member] of members) {
      if (member.branchRootId === rootId && id !== rootId) ids.push(id);
    }
    return ids;
  }

  function expandBranch(rootId: string, rootGeneration: number) {
    let frontier = [rootId];
    let depth = 0;
    while (frontier.length > 0) {
      depth++;
      const generation = rootGeneration + depth;
      const next: string[] = [];
      for (const id of frontier) {
        for (const { id: childId, label } of index.related(id, "parent_of")) {
          if (members.has(childId)) {
            edges.push({
              type: "parent-child",
              from: id,
              to: childId,
              secondary: true,
            });
            continue;
          }
          const added = addMember(
            childId,
            "sibling-branch",
            "child",
            generation,
            label,
            rootId,
          );
          if (!added) continue;
          edges.push({
            type: "parent-child",
            from: id,
            to: childId,
            secondary: false,
          });
          addPartners(childId, generation, rootId);
          next.push(childId);
        }
      }
      frontier = next;
    }
  }

  /** Other recorded children of `memberId`'s parents (and, for the focus,
   * explicit `sibling_of` links) become sibling-branch roots at `generation`. */
  function addSiblingBranches(
    memberId: string,
    generation: number,
    includeExplicit: boolean,
  ) {
    const rootParent = new Map<string, string>();
    const rootLabel = new Map<string, string | undefined>();

    for (const parent of index.related(memberId, "child_of")) {
      for (const child of index.related(parent.id, "parent_of")) {
        if (child.id === memberId) continue;
        if (!rootParent.has(child.id)) rootParent.set(child.id, parent.id);
        if (!rootLabel.has(child.id) || child.label)
          rootLabel.set(child.id, child.label);
      }
    }
    if (includeExplicit) {
      for (const { id, label } of index.related(memberId, "sibling_of")) {
        if (!rootLabel.has(id) || label) rootLabel.set(id, label);
      }
    }

    const rootIds = new Set([...rootParent.keys(), ...rootLabel.keys()]);
    for (const rootId of rootIds) {
      if (members.has(rootId)) continue;
      const root = addMember(
        rootId,
        "sibling-branch",
        "sibling",
        generation,
        rootLabel.get(rootId),
        rootId,
      );
      if (!root) continue;

      const parentId = rootParent.get(rootId);
      if (parentId)
        pendingParentEdges.push({ parent: parentId, child: rootId });

      const hiddenCount = countHidden(
        rootId,
        index,
        entities,
        new Set(members.keys()),
      );
      const expanded = isExpanded(rootId, expandedBranches);
      if (expanded) {
        addPartners(rootId, generation, rootId);
        expandBranch(rootId, generation);
      }
      siblingBranches.set(rootId, {
        hiddenCount,
        memberIds: expanded ? collectBranchMembers(rootId) : [],
      });
    }
  }

  // Focus.
  const focusEntity = entities[focusId];
  const focusMember: LineageMember =
    focusEntity && isCharacter(focusEntity)
      ? { ...toMember(focusEntity, "focus", 0), kind: "focus" }
      : {
          entityId: focusId,
          name: focusId,
          deceased: false,
          relation: "focus",
          generation: 0,
          kind: "focus",
        };
  members.set(focusId, focusMember);
  place(focusId, 0);
  if (focusEntity && isCharacter(focusEntity)) {
    addPartners(focusId, 0);
    addSiblingBranches(focusId, 0, true);
  }

  function traverseDirection(
    step: "up" | "down",
    cap: number | undefined,
  ): Truncation | null {
    const relType: FamilyConnectionType =
      step === "up" ? "child_of" : "parent_of";
    const relation: FamilyRelation = step === "up" ? "parent" : "child";
    const kind: LineageMemberKind = step === "up" ? "ancestor" : "descendant";

    let frontier = [focusId];
    let depth = 0;
    while (frontier.length > 0) {
      if (cap !== undefined && depth >= cap) {
        const hasMore = frontier.some(
          (id) => index.related(id, relType).length > 0,
        );
        if (!hasMore) return null;
        let hiddenGenerations = 0;
        let probeFrontier = frontier;
        while (probeFrontier.length > 0) {
          const nextProbe: string[] = [];
          for (const id of probeFrontier) {
            for (const { id: nextId } of index.related(id, relType)) {
              if (isCharacter(entities[nextId])) nextProbe.push(nextId);
            }
          }
          if (nextProbe.length === 0) break;
          hiddenGenerations++;
          probeFrontier = nextProbe;
        }
        return {
          atGeneration: step === "up" ? -(depth + 1) : depth + 1,
          hiddenGenerations,
        };
      }

      depth++;
      const generation = step === "up" ? -depth : depth;
      const next: string[] = [];
      for (const id of frontier) {
        for (const { id: relId, label } of index.related(id, relType)) {
          if (members.has(relId)) {
            const [from, to] = step === "up" ? [relId, id] : [id, relId];
            edges.push({ type: "parent-child", from, to, secondary: true });
            continue;
          }
          const added = addMember(relId, kind, relation, generation, label);
          if (!added) continue;
          const [from, to] = step === "up" ? [relId, id] : [id, relId];
          edges.push({ type: "parent-child", from, to, secondary: false });
          addPartners(relId, generation);
          addSiblingBranches(relId, generation, false);
          next.push(relId);
        }
      }
      frontier = next;
    }
    return null;
  }

  const truncatedUp = traverseDirection("up", maxUp);
  const truncatedDown = traverseDirection("down", maxDown);

  for (const { parent, child } of pendingParentEdges) {
    if (members.has(parent) && members.has(child)) {
      edges.push({
        type: "parent-child",
        from: parent,
        to: child,
        secondary: false,
      });
    }
  }

  return {
    focusId,
    members,
    edges,
    generations: generationOrder,
    siblingBranches,
    truncatedUp,
    truncatedDown,
  };
}
