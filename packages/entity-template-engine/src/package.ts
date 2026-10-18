import { validateTemplate } from "./validate";
import {
  TEMPLATE_FORMAT_VERSION,
  TEMPLATE_PACKAGE_KIND,
  TemplatePackageSchema,
  type DraftTemplate,
  type ImportResult,
  type TemplatePackage,
} from "./types";

/** Builds a portable package. Carries no id, source or default state. */
export function exportTemplatePackage(t: DraftTemplate): TemplatePackage {
  return {
    kind: TEMPLATE_PACKAGE_KIND,
    formatVersion: TEMPLATE_FORMAT_VERSION,
    template: { name: t.name, entityType: t.entityType, markdown: t.markdown },
  };
}

/** Validates untrusted input. Never throws. */
export function importTemplatePackage(raw: unknown): ImportResult {
  const parsed = TemplatePackageSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "This file is not a Codex Cryptica template." };
  }
  if (parsed.data.formatVersion > TEMPLATE_FORMAT_VERSION) {
    return {
      ok: false,
      error:
        "This template was made with a newer version of Codex Cryptica. Update the app to import it.",
    };
  }

  const { name, entityType, markdown } = parsed.data.template;
  const draft: DraftTemplate = { name, entityType, markdown };
  const issues = validateTemplate(draft);
  if (issues.length) {
    return {
      ok: false,
      error: `This template can't be imported. ${issues[0].message}`,
    };
  }
  return { ok: true, template: draft };
}
