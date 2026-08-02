import {
  PresentationTemplatePackageSchema,
  type PresentationTemplate,
  type PresentationTemplatePackage,
} from "schema";
import { sanitizeSource } from "./parse";

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

export interface ImportSuccess {
  ok: true;
  package: PresentationTemplatePackage;
  /** Fragments stripped from `source` during sanitization (empty if none). */
  removedFragments: string[];
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
 */
export function importPresentationTemplatePackage(
  input: unknown,
  availableSchemaTemplateIds: readonly string[],
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
