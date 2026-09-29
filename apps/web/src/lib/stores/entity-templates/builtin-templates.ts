import { GENERIC_TEMPLATES } from "schema";
import {
  parseMarkdownToSections,
  TEMPLATE_FORMAT_VERSION,
  type EntityTemplate,
} from "entity-template-engine";
import { resolveTemplateSync } from "../../services/EntityTemplateConstants";

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One read-only built-in per entity type: the theme-aware default for the given
 * theme, falling back to the generic template. Never written to disk.
 */
export function buildBuiltinTemplates(themeId?: string): EntityTemplate[] {
  return Object.keys(GENERIC_TEMPLATES).map((type) => {
    const markdown = resolveTemplateSync(type, themeId);
    const parsed = parseMarkdownToSections(markdown);
    return {
      id: `builtin:${type}`,
      name: `Standard ${titleCase(type)}`,
      entityType: type,
      ...parsed,
      source: "builtin" as const,
      markdown,
      version: TEMPLATE_FORMAT_VERSION,
    };
  });
}
