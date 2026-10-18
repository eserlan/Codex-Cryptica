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
 * The entity's current fields are the source of truth for that vocabulary.
 * When the entity adds, renames, or deletes fields in its stat sheet, the
 * schema reflects those changes directly rather than appending onto a stale
 * copy of the template's starting fields.
 *
 * `boundTemplate.id` is preserved as the schema id on purpose when a template
 * is bound. It is the key that matches presentation templates (`isTemplateUsable`
 * requires `schema.id === template.schemaTemplateId`), so the layout continues
 * to resolve.
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

    // If the entity has defined fields, those are its active vocabulary (including
    // renames, additions, and deletions). If the entity has no fields yet, fall back
    // to the starting fields from the bound template.
    const resolvedFields: StatSheetTemplateField[] =
      fields.length > 0
        ? fields.map(toTemplateField)
        : boundTemplate.fields.map(toTemplateField);

    if (resolvedFields.length === 0) return null;

    return {
      ...boundTemplate,
      fields: resolvedFields,
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
