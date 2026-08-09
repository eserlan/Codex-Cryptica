import type {
  StatSheet,
  StatSheetField,
  StatSheetTemplate,
  StatSheetTemplateField,
} from "schema";

/** Drops the per-entity value/UI state, leaving the field's shape. */
function toTemplateField({
  value: _value,
  collapsed: _collapsed,
  favorite: _favorite,
  barField: _barField,
  ...field
}: StatSheetField): StatSheetTemplateField {
  return field;
}

/**
 * Builds the schema a Stat Sheet's presentation layer should be resolved
 * against — the vocabulary of fields a layout may reference, and which the
 * Presentation editor offers to place.
 *
 * The entity's own fields are always part of that vocabulary. Systems like
 * Mythras, BRP, WFRP and GURPS give each character a different set of skills,
 * so a stat template is only ever the *starting* sheet: one character carries
 * "Shooting (AK47)", the next "Cow Milking". Those per-character fields are
 * appended to the bound template's fields rather than replacing them, so a
 * layout keeps working while the extras become available to place.
 *
 * `boundTemplate.id` is preserved as the schema id on purpose. It is the key
 * that matches presentation templates (`isTemplateUsable` requires
 * `schema.id === template.schemaTemplateId`), so minting an entity-local id
 * for a character that merely added a field would silently drop it back to
 * the standard renderer and lose its layout.
 *
 * Returns `null` when there is nothing to render a layout against: no fields
 * and no template, or a `templateId` pointing at a template that no longer
 * exists — the caller's fallback (FR-010) handles that.
 */
export function resolveStatSheetSchema(
  statSheet: Pick<StatSheet, "templateId" | "fields"> | null | undefined,
  boundTemplate: StatSheetTemplate | null | undefined,
  entityLocalSchemaId: string,
): StatSheetTemplate | null {
  const fields: StatSheetField[] = statSheet?.fields ?? [];

  if (statSheet?.templateId) {
    if (!boundTemplate) return null;

    const templateFieldIds = new Set(boundTemplate.fields.map((f) => f.id));
    const entityOnly = fields
      .filter((f) => !templateFieldIds.has(f.id))
      .map(toTemplateField);

    if (entityOnly.length === 0) return boundTemplate;
    return {
      ...boundTemplate,
      fields: [...boundTemplate.fields, ...entityOnly],
    };
  }

  // A manually assembled sheet has no reusable template behind it, so its
  // schema is entity-local — which also keeps generic built-in layouts, that
  // would reference fields it does not have, from being offered.
  if (fields.length === 0) return null;
  return {
    id: entityLocalSchemaId,
    name: "Custom Stat Sheet",
    isBuiltIn: false,
    fields: fields.map(toTemplateField),
  };
}
