import { entityTemplateStore } from "../entity-templates/entity-template-store.svelte";

/**
 * Adds the vault's lore template for `entityType` to revision options.
 *
 * Revision runs in the Oracle worker, which has its own module scope and never
 * sees the vault's templates, so the main thread resolves the text and passes
 * it down. A template the caller already supplied is left alone.
 */
export function withLoreTemplate<
  T extends { themeId?: string; loreTemplate?: string },
>(entityType: string | undefined, options?: T): T & { loreTemplate?: string } {
  const base = (options ?? {}) as T & { loreTemplate?: string };
  if (base.loreTemplate !== undefined || !entityType) return base;
  return {
    ...base,
    loreTemplate: entityTemplateStore.resolveSync(entityType, base.themeId),
  };
}
