import {
  MAX_SECTIONS,
  SECTION_TITLE_MAX,
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
    issues.push({
      field: "name",
      message: "Keep the name on a single line.",
    });
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

  if (t.sections.length === 0) {
    issues.push({ field: "sections", message: "Add at least one section." });
  }

  if (t.sections.length > MAX_SECTIONS) {
    issues.push({
      field: "sections",
      message: `Use ${MAX_SECTIONS} sections or fewer.`,
    });
  }

  for (const section of t.sections) {
    const title = section.title.trim();
    if (!title) {
      issues.push({
        field: "section",
        sectionId: section.id,
        message: "Every section needs a title.",
      });
    } else if (/[\r\n]/.test(title)) {
      issues.push({
        field: "section",
        sectionId: section.id,
        message: "Keep each section title on a single line.",
      });
    } else if (title.length > SECTION_TITLE_MAX) {
      issues.push({
        field: "section",
        sectionId: section.id,
        message: `Keep section titles under ${SECTION_TITLE_MAX} characters.`,
      });
    }
  }

  return issues;
}
