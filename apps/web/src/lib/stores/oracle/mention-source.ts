import { isEntityVisible } from "schema";
import type { EntityLike, MentionSource } from "entity-mention-engine";

/** The slice of the active Vault that mention resolution needs. */
export interface MentionVault {
  entities: Record<string, any>;
  allEntities?: any[];
  isGuest: boolean;
  defaultVisibility: "visible" | "hidden";
}

/**
 * Adapts the active Vault to the framework-free mention engine. Visibility
 * follows the rule Oracle context already uses: guests see only what Fog of
 * War reveals, and draft entities are never offered.
 */
export function createVaultMentionSource(vault: MentionVault): MentionSource {
  const isVisible = (entity: any): boolean => {
    if (!entity || entity.status === "draft") return false;
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: true,
      defaultVisibility: vault.defaultVisibility,
    });
  };

  return {
    getEntity: (id) => {
      const entity = vault.entities?.[id];
      return entity && isVisible(entity) ? entity : undefined;
    },
    isVisible,
    listCandidates: () =>
      (vault.allEntities ?? Object.values(vault.entities ?? {})).filter(
        isVisible,
      ),
  };
}

/**
 * The entities an assistant reply was grounded in (`sources`), limited to the
 * ones this user may see. Only these titles are linked in the reply, so an
 * unrelated name in the prose is never turned into a link.
 */
export function sourceEntitiesFor(
  sourceIds: string[],
  source: MentionSource,
): EntityLike[] {
  return sourceIds
    .map((id) => source.getEntity(id))
    .filter((e): e is EntityLike => !!e && source.isVisible(e));
}
