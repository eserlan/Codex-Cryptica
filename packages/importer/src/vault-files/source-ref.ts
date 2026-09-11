import type { EntityDraft } from "../cc/package";

/**
 * Match/dedupe identity for this source is derived from `sourcePath` alone
 * — no `sourceId` branch, no title fallback. spec.md's FR-006/FR-007 define
 * a conflict as "the path already exists," a literal deterministic check;
 * this keeps that promise exact, mirroring why CIF uses its own
 * kind-independent sourceRefBuilder instead of the generic
 * buildEntitySourceRef (see research.md).
 */
export function vaultFileSourceRefBuilder(
  system: string,
  draft: Pick<EntityDraft, "sourcePath">,
): string {
  return `${system}:path:${draft.sourcePath ?? ""}`;
}
