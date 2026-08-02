import type { PresentationTemplate, StatSheet } from "schema";

/**
 * Resolves which `PresentationTemplate` (if any) applies to an entity's
 * Stat Sheet: the per-entity override (`statSheet.presentationTemplateId`)
 * takes precedence; absent that, `schemaDefaultId` (the schema's configured
 * default, however the caller stores it); absent that, `null` (standard
 * renderer).
 *
 * A dangling id (points at a template that no longer exists in
 * `availableTemplates`) resolves to `null` rather than throwing — the
 * caller's `isTemplateUsable`/fallback check (FR-010) handles that case.
 */
export function resolvePresentationTemplate(
  statSheet: Pick<StatSheet, "presentationTemplateId"> | undefined,
  schemaDefaultId: string | null | undefined,
  availableTemplates: PresentationTemplate[],
): PresentationTemplate | null {
  const id = statSheet?.presentationTemplateId ?? schemaDefaultId;
  if (!id) return null;
  return availableTemplates.find((t) => t.id === id) ?? null;
}
