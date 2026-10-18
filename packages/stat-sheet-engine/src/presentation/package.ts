import {
  PresentationTemplatePackageSchema,
  type PresentationTemplate,
  type PresentationTemplatePackage,
  type StatSheetTemplate,
  type StatSheetTemplateField,
} from "schema";
import { parseTemplate, sanitizeSource } from "./parse";
import { validateAst } from "./validate";
import { walkPresentationNodes } from "./ast";

export class PresentationTemplatePackageValidationError extends Error {
  readonly code = "PRESENTATION_TEMPLATE_PACKAGE_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "PresentationTemplatePackageValidationError";
  }
}

/**
 * Projects a `PresentationTemplate` into its value-free export envelope
 * (FR-015/SC-006, data-model.md): only `formatVersion`, `name`,
 * `description`, `schemaTemplateId`, `source` — no entity values, vault id,
 * or asset references.
 */
export function exportPresentationTemplate(
  template: PresentationTemplate,
): PresentationTemplatePackage {
  const candidate = {
    formatVersion: template.formatVersion,
    name: template.name,
    description: template.description ?? null,
    schemaTemplateId: template.schemaTemplateId,
    source: template.source,
  };
  const parsed = PresentationTemplatePackageSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new PresentationTemplatePackageValidationError(
      parsed.error.issues[0]?.message ??
        "Invalid presentation template package",
    );
  }
  return parsed.data;
}

export interface CompatibilityAnalysis {
  compatible: boolean;
  referencedFields: string[];
  matchedFields: string[];
  unmappedFields: string[];
}

/**
 * Compares a presentation's field references against a destination schema's fields,
 * identifying which fields are matched vs missing/unmapped.
 */
export function analyzePresentationCompatibility(
  source: string,
  formatVersion: number,
  schema: StatSheetTemplate | { id: string; fields?: StatSheetTemplateField[] },
): CompatibilityAnalysis {
  const parsed = parseTemplate(source, formatVersion);
  if (!parsed.ok) {
    return {
      compatible: false,
      referencedFields: [],
      matchedFields: [],
      unmappedFields: [],
    };
  }

  const dummySchema: StatSheetTemplate = {
    id: schema.id,
    name: "Target Schema",
    isBuiltIn: false,
    fields: schema.fields ?? [],
  };

  const validatedAst = validateAst(parsed.ast, dummySchema);
  const referencedFieldsSet = new Set<string>();
  const unmappedFieldsSet = new Set<string>();
  const matchedFieldsSet = new Set<string>();
  const schemaFieldIds = new Set((schema.fields ?? []).map((f) => f.id));

  walkPresentationNodes(validatedAst, (node) => {
    if (node.type === "missing-field") {
      const fieldId = (node as any).fieldId;
      if (typeof fieldId === "string") {
        referencedFieldsSet.add(fieldId);
        unmappedFieldsSet.add(fieldId);
      }
    } else if (node.type === "field-reference") {
      const fieldId = (node as any).fieldId;
      if (typeof fieldId === "string") {
        referencedFieldsSet.add(fieldId);
        if (schemaFieldIds.has(fieldId)) {
          matchedFieldsSet.add(fieldId);
        } else {
          unmappedFieldsSet.add(fieldId);
        }
      }
    }
  });

  const referencedFields = Array.from(referencedFieldsSet);
  const matchedFields = Array.from(matchedFieldsSet);
  const unmappedFields = Array.from(unmappedFieldsSet);

  return {
    compatible: unmappedFields.length === 0,
    referencedFields,
    matchedFields,
    unmappedFields,
  };
}

export interface ImportSuccess {
  ok: true;
  package: PresentationTemplatePackage;
  /** Fragments stripped from `source` during sanitization (empty if none). */
  removedFragments: string[];
  /** Field IDs referenced in the layout that are not present in target schema (if target schema was provided) */
  unmappedFields?: string[];
}

export interface ImportIncompatible {
  ok: false;
  reason: "invalid-package" | "schema-not-found";
  message: string;
}

export type ImportOutcome = ImportSuccess | ImportIncompatible;

/**
 * Validates and sanitizes an imported `PresentationTemplatePackage`
 * (FR-016). Never throws — an incompatible or malformed package returns a
 * typed result the caller renders as feedback, rather than raising or
 * silently attaching to the wrong schema (data-model.md Validation Rules).
 *
 * If `targetSchema` is provided, the imported package is retargeted to that schema
 * and field compatibility analysis is performed so unmapped fields are reported.
 */
export function importPresentationTemplatePackage(
  input: unknown,
  availableSchemaTemplateIds: readonly string[],
  targetSchema?:
    StatSheetTemplate | { id: string; fields?: StatSheetTemplateField[] },
): ImportOutcome {
  const parsed = PresentationTemplatePackageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid-package",
      message:
        parsed.error.issues[0]?.message ??
        "Invalid presentation template package",
    };
  }

  if (targetSchema) {
    const { source, removed } = sanitizeSource(parsed.data.source);
    const analysis = analyzePresentationCompatibility(
      source,
      parsed.data.formatVersion,
      targetSchema,
    );

    return {
      ok: true,
      package: {
        ...parsed.data,
        schemaTemplateId: targetSchema.id,
        source,
      },
      removedFragments: removed,
      unmappedFields: analysis.unmappedFields,
    };
  }

  if (!availableSchemaTemplateIds.includes(parsed.data.schemaTemplateId)) {
    return {
      ok: false,
      reason: "schema-not-found",
      message:
        "This template was made for a Stat Sheet schema that doesn't exist in this vault.",
    };
  }
  const { source, removed } = sanitizeSource(parsed.data.source);
  return {
    ok: true,
    package: { ...parsed.data, source },
    removedFragments: removed,
  };
}
