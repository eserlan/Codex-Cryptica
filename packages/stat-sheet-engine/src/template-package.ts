import {
  PublicTemplatePackageSchema,
  type PublicTemplatePackage,
  type StatSheetEntityCategory,
} from "schema";
import type { StatSheetTemplate, StatSheetTemplateField } from "schema";
import type { ZodIssue } from "zod";

export class TemplatePackageValidationError extends Error {
  readonly code = "TEMPLATE_PACKAGE_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "TemplatePackageValidationError";
  }
}

export function formatTemplatePackageIssues(issues: ZodIssue[]): string {
  if (!issues || issues.length === 0) return "Invalid template package";

  const formatted = issues.map((issue) => {
    const path = issue.path.filter((p) => p !== "template");

    if (path.length === 0) {
      return issue.message || "Invalid template package";
    }

    let prefix = "";
    let fieldName = "";

    for (let i = 0; i < path.length; i++) {
      const seg = path[i];
      if (seg === "fields") {
        const next = path[i + 1];
        if (typeof next === "number") {
          prefix = `Field ${next + 1}`;
          i++;
        } else {
          prefix = "Template fields";
        }
      } else if (seg === "columns") {
        const next = path[i + 1];
        if (typeof next === "number") {
          prefix = prefix
            ? `${prefix}, column ${next + 1}`
            : `Column ${next + 1}`;
          i++;
        } else {
          prefix = prefix ? `${prefix} columns` : "Columns";
        }
      } else if (seg === "labels") {
        const next = path[i + 1];
        if (typeof next === "number") {
          prefix = `Label ${next + 1}`;
          i++;
        } else {
          prefix = "Template labels";
        }
      } else if (typeof seg === "string") {
        fieldName = seg;
      }
    }

    let reason = issue.message;
    const lowerMessage = (issue.message || "").toLowerCase();
    if (
      issue.code === "too_small" ||
      lowerMessage.includes("too small") ||
      lowerMessage.includes("at least 1")
    ) {
      if (
        (issue as any).type === "string" ||
        lowerMessage.includes("character") ||
        lowerMessage.includes("string")
      ) {
        reason = "cannot be empty";
      } else if (
        (issue as any).type === "array" ||
        lowerMessage.includes("element") ||
        lowerMessage.includes("item") ||
        lowerMessage.includes("array")
      ) {
        reason = "must contain at least 1 item";
      }
    } else if (
      issue.code === "too_big" ||
      lowerMessage.includes("too big") ||
      lowerMessage.includes("maximum")
    ) {
      const max = (issue as any).maximum;
      if (
        (issue as any).type === "string" ||
        lowerMessage.includes("character")
      ) {
        reason = max
          ? `exceeds maximum length of ${max} characters`
          : "is too long";
      } else if (
        (issue as any).type === "array" ||
        lowerMessage.includes("element") ||
        lowerMessage.includes("item")
      ) {
        reason = max
          ? `cannot contain more than ${max} items`
          : "has too many items";
      }
    } else if (issue.code === "invalid_enum_value") {
      const options = (issue as any).options;
      reason =
        options && Array.isArray(options)
          ? `invalid value (must be one of: ${options.join(", ")})`
          : "invalid value";
    } else if (
      (issue.code === "invalid_type" &&
        lowerMessage.includes("invalid input")) ||
      lowerMessage === "invalid input"
    ) {
      reason = "invalid value";
    }

    if (issue.code === "custom") {
      return prefix ? `${prefix}: ${reason}` : reason;
    }

    if (prefix && fieldName) {
      return `${prefix} (${fieldName}): ${reason}`;
    } else if (prefix) {
      if (reason.toLowerCase().startsWith(prefix.toLowerCase())) {
        return reason;
      }
      return `${prefix}: ${reason}`;
    } else if (fieldName) {
      return `Template ${fieldName}: ${reason}`;
    }

    return reason;
  });

  return formatted.join("; ");
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
  const fields: StatSheetTemplateField[] = (template.fields ?? []).map(
    (field) => {
      const {
        id,
        label,
        type,
        formula,
        min,
        max,
        step,
        columns,
        linkVaultItems,
        modifierSource,
      } = field;
      return {
        id,
        label,
        type,
        ...(formula !== undefined && formula !== "" ? { formula } : {}),
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
        ...(step !== undefined ? { step } : {}),
        ...(columns && columns.length > 0
          ? {
              columns: columns.map((col) => ({
                id: col.id,
                label: col.label,
                type: col.type,
              })),
            }
          : {}),
        ...(linkVaultItems !== undefined ? { linkVaultItems } : {}),
        ...(modifierSource !== undefined && modifierSource !== ""
          ? { modifierSource }
          : {}),
      };
    },
  );

  const description =
    (metadata.description && metadata.description.trim()) ||
    (template.description && template.description.trim()) ||
    "Reusable Stat Sheet layout";

  const system = metadata.system?.trim() || undefined;
  const category = (metadata.category?.trim() || undefined) as
    StatSheetEntityCategory | undefined;

  const candidate = {
    schemaVersion: 1,
    template: {
      name: template.name,
      description,
      system,
      category,
      labels: metadata.labels ?? [],
      fields,
    },
  };

  const parsed = PublicTemplatePackageSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new TemplatePackageValidationError(
      formatTemplatePackageIssues(parsed.error.issues),
    );
  }
  return parsed.data;
}

export function validateTemplatePackage(input: unknown): PublicTemplatePackage {
  const parsed = PublicTemplatePackageSchema.safeParse(input);
  if (!parsed.success) {
    throw new TemplatePackageValidationError(
      formatTemplatePackageIssues(parsed.error.issues),
    );
  }
  return parsed.data;
}
