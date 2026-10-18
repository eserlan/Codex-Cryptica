import {
  TEMPLATE_MARKDOWN_MAX,
  TEMPLATE_NAME_MAX,
  type DraftTemplate,
  type ValidationIssue,
} from "./types";

/** Returns plain-language problems; an empty list means the draft can be saved. */
export function validateTemplate(t: DraftTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const name = t.name.trim();

  if (!name) {
    issues.push({ field: "name", message: "Give the template a name." });
  } else if (/[\r\n]/.test(name)) {
    issues.push({ field: "name", message: "Keep the name on a single line." });
  } else if (name.length > TEMPLATE_NAME_MAX) {
    issues.push({
      field: "name",
      message: `Keep the name under ${TEMPLATE_NAME_MAX} characters.`,
    });
  }

  if (!t.entityType.trim()) {
    issues.push({
      field: "entityType",
      message: "Choose which type of entity this template is for.",
    });
  }

  if (t.markdown.length > TEMPLATE_MARKDOWN_MAX) {
    issues.push({
      field: "markdown",
      message: "This template is too long. Shorten it and try again.",
    });
  }

  return issues;
}
