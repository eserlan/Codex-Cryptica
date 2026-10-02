import { isVaultReadyForGenerators } from "$lib/stores/vault/readiness";

/**
 * Whether the generator workflow can really open right now: a vault that is
 * ready, and not a guest vault. This is the workflow's own rule (the modal
 * store refuses to open it in guest mode), so a "generators" flag derived from
 * anything weaker would offer a guide that silently does nothing.
 */
export function generatorsAvailable(
  vault: Parameters<typeof isVaultReadyForGenerators>[0],
  session: { isGuestMode: boolean },
): boolean {
  return !session.isGuestMode && isVaultReadyForGenerators(vault);
}
