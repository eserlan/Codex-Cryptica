import {
  PublicTemplatePackageSchema,
  type PublicTemplatePackage,
} from "schema";
import type { StatSheetTemplate, StatSheetTemplateField } from "schema";

export class TemplatePackageValidationError extends Error {
  readonly code = "TEMPLATE_PACKAGE_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "TemplatePackageValidationError";
  }
}

export function projectTemplatePackage(
  template: StatSheetTemplate,
  metadata: {
    description?: string;
    system?: string;
    category?: string;
    labels?: string[];
  } = {},
): PublicTemplatePackage {
  const fields: StatSheetTemplateField[] = template.fields.map((field) => {
    const { id, label, type, formula, min, max, step } = field;
    return { id, label, type, formula, min, max, step };
  });
  const candidate = {
    schemaVersion: 1,
    template: {
      name: template.name,
      description:
        metadata.description ??
        template.description ??
        "Reusable Stat Sheet layout",
      system: metadata.system,
      category: metadata.category,
      labels: metadata.labels ?? [],
      fields,
    },
  };
  const parsed = PublicTemplatePackageSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new TemplatePackageValidationError(
      parsed.error.issues[0]?.message ?? "Invalid template package",
    );
  }
  return parsed.data;
}

export function validateTemplatePackage(input: unknown): PublicTemplatePackage {
  const parsed = PublicTemplatePackageSchema.safeParse(input);
  if (!parsed.success) {
    throw new TemplatePackageValidationError(
      parsed.error.issues[0]?.message ?? "Invalid template package",
    );
  }
  return parsed.data;
}
