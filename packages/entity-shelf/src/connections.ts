import type { VaultEntitySummary } from "./ports";
import { normaliseTitle } from "./titles";
import type { UnresolvedReason } from "./types";

/**
 * Reattaching connections and parents in the destination vault.
 *
 * Identifiers are vault-local, so a reference can only be matched by name.
 * Comparison uses the same `normaliseTitle` as collision detection: were the
 * two to diverge, import could create a pair of entities that resolution can
 * never tell apart (research R5).
 */

export interface BatchMember {
  entryId: string;
  /** Identifier this entity had in the vault it was shelved from. */
  sourceEntityId: string;
  /** Identifier minted for it in the destination vault. */
  mintedId: string;
}

export interface ResolveReferenceInput {
  /** Source-vault identifier held by the connection or `parent` field. */
  ref: string;
  /** Titles captured at shelving time, keyed by source-vault identifier. */
  referencedTitles: Record<string, { title: string; aliases: string[] }>;
  batch: BatchMember[];
  existing: VaultEntitySummary[];
}

export interface ReferenceResolution {
  resolvedId: string | null;
  reason?: UnresolvedReason;
}

function namesOf(entity: { title: string; aliases: string[] }): Set<string> {
  const names = new Set<string>([normaliseTitle(entity.title)]);
  for (const alias of entity.aliases) names.add(normaliseTitle(alias));
  return names;
}

/**
 * Resolves one reference: the imported batch first, then the destination vault
 * by title and alias.
 *
 * Batch-first matters — importing a faction alongside its members should wire
 * them to each other, not to whatever happens to share a name in the
 * destination.
 *
 * Where more than one candidate matches, this returns `ambiguous` and resolves
 * nothing. A dropped connection is recoverable and is reported to the author; a
 * wrongly attached one is not, because they have no reason to go looking for
 * it.
 */
export function resolveReference(
  input: ResolveReferenceInput,
): ReferenceResolution {
  const inBatch = input.batch.find(
    (member) => member.sourceEntityId === input.ref,
  );
  if (inBatch) return { resolvedId: inBatch.mintedId };

  const snapshot = input.referencedTitles[input.ref];
  // No snapshot means the target was already absent from the source vault, so
  // there has never been a name to match on.
  if (!snapshot) return { resolvedId: null, reason: "not-found" };

  const wanted = namesOf(snapshot);
  const candidates = input.existing.filter((entity) => {
    for (const name of namesOf(entity)) {
      if (wanted.has(name)) return true;
    }
    return false;
  });

  if (candidates.length === 0) return { resolvedId: null, reason: "not-found" };
  if (candidates.length > 1) return { resolvedId: null, reason: "ambiguous" };
  return { resolvedId: candidates[0].id };
}
