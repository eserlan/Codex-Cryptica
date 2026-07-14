import type { Entity } from "schema";
import {
  type FamilyConnectionType,
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
 */
export async function addFamilyLink(
  sourceId: string,
  targetId: string,
  type: FamilyConnectionType,
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

  await deps.addConnection(sourceId, targetId, type);
  await deps.addConnection(targetId, sourceId, inverseFamilyType(type));
  return { ok: true };
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
