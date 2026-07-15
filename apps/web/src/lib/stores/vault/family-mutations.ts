import type { Entity } from "schema";
import {
  type FamilyConnectionType,
  buildFamilyTree,
  inverseFamilyType,
  wouldCreateCycle,
} from "@codex/family-engine";
import { vault } from "../vault.svelte";

const CHARACTER_TYPE = "character";

/** Minimal vault surface the family mutations depend on (enables DI in tests). */
export interface FamilyMutationVault {
  readonly entities: Record<string, Entity>;
  addConnection(
    sId: string,
    tId: string,
    type: string,
    label?: string,
  ): Promise<boolean> | boolean;
  removeConnection(sId: string, tId: string, type: string): unknown;
}

export interface FamilyMutationResult {
  ok: boolean;
  error?: string;
}

const CYCLE_ERROR = "That would make a character their own ancestor.";

/**
 * Add a family link, writing BOTH sides (the link and its inverse on the other
 * entity) so relationship data is consistent from either side. Rejects
 * self-links, non-character targets (FR-014), and circular ancestry (FR-013)
 * before writing anything.
 *
 * `targetLabel` (e.g. "Brother", "Sister", "Mother") describes the TARGET and
 * is written on the target's inverse connection so it surfaces on the target's
 * card when viewing the source's tree.
 */
export async function addFamilyLink(
  sourceId: string,
  targetId: string,
  type: FamilyConnectionType,
  targetLabel?: string,
  deps: FamilyMutationVault = vault,
): Promise<FamilyMutationResult> {
  if (sourceId === targetId) {
    return { ok: false, error: "A character cannot be linked to themselves." };
  }

  const { entities } = deps;
  const source = entities[sourceId];
  const target = entities[targetId];
  if (!source || !target) {
    return { ok: false, error: "Both characters must exist." };
  }
  if (source.type !== CHARACTER_TYPE || target.type !== CHARACTER_TYPE) {
    return {
      ok: false,
      error: "Family links are only allowed between characters.",
    };
  }

  // Cycle guard for parent/child links. parent_of source→target means source is
  // parent of target (child = target); child_of means source is child of target
  // (child = source).
  if (type === "parent_of" && wouldCreateCycle(entities, targetId, sourceId)) {
    return { ok: false, error: CYCLE_ERROR };
  }
  if (type === "child_of" && wouldCreateCycle(entities, sourceId, targetId)) {
    return { ok: false, error: CYCLE_ERROR };
  }

  const inverse = inverseFamilyType(type);

  // Idempotent: only write the side(s) that are missing, so repeated calls
  // don't create duplicate connections.
  let wroteForward = false;
  if (!hasConnection(source, targetId, type)) {
    const ok = await deps.addConnection(sourceId, targetId, type);
    if (ok === false) {
      return { ok: false, error: "Could not add family link." };
    }
    wroteForward = true;
  }
  if (!hasConnection(target, sourceId, inverse)) {
    const ok = await deps.addConnection(
      targetId,
      sourceId,
      inverse,
      targetLabel,
    );
    if (ok === false) {
      // Roll back the forward write so we never leave a one-sided link (FR-011).
      if (wroteForward) {
        await deps.removeConnection(sourceId, targetId, type);
      }
      return { ok: false, error: "Could not add family link." };
    }
  }

  // Unlike a parent's spouse (which does NOT imply co-parentage — remarriage,
  // step-parents etc.), sharing a parent unambiguously makes two characters
  // siblings. Persist that as a real sibling_of connection so it appears
  // everywhere (graph, connections list), not just inferred in the Family
  // Tree view. Best-effort: failures here don't fail the link that triggered it.
  if (type === "parent_of" || type === "child_of") {
    const parentId = type === "parent_of" ? sourceId : targetId;
    const childId = type === "parent_of" ? targetId : sourceId;
    // Best-effort: swallow errors so a failure here can never reject
    // addFamilyLink after the primary parent/child link already succeeded.
    try {
      await syncSiblingLinks(deps, parentId, childId);
    } catch {
      // Ignored — see comment above.
    }
  }

  return { ok: true };
}

async function syncSiblingLinks(
  deps: FamilyMutationVault,
  parentId: string,
  childId: string,
): Promise<void> {
  const otherChildIds = buildFamilyTree(parentId, deps.entities)
    .children.map((c) => c.entityId)
    .filter((id) => id !== childId);

  for (const otherChildId of otherChildIds) {
    // Best-effort per sibling too: one failing write shouldn't stop the rest
    // from being attempted.
    try {
      const child = deps.entities[childId];
      const otherChild = deps.entities[otherChildId];
      if (!child || !otherChild) continue;
      if (!hasConnection(child, otherChildId, "sibling_of")) {
        await deps.addConnection(childId, otherChildId, "sibling_of");
      }
      if (!hasConnection(otherChild, childId, "sibling_of")) {
        await deps.addConnection(otherChildId, childId, "sibling_of");
      }
    } catch {
      // Ignored — see comment on the call site above.
    }
  }
}

function hasConnection(
  entity: Entity | undefined,
  targetId: string,
  type: string,
): boolean {
  return !!entity?.connections?.some(
    (c) => c.target === targetId && c.type === type,
  );
}

/** Remove a family link from both entities. */
export async function removeFamilyLink(
  sourceId: string,
  targetId: string,
  type: FamilyConnectionType,
  deps: FamilyMutationVault = vault,
): Promise<FamilyMutationResult> {
  await deps.removeConnection(sourceId, targetId, type);
  await deps.removeConnection(targetId, sourceId, inverseFamilyType(type));
  return { ok: true };
}
