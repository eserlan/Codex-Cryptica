import { GENERIC_TEMPLATES } from "schema";
import {
  TEMPLATE_FORMAT_VERSION,
  type EntityTemplate,
} from "entity-template-engine";
import { resolveTemplateSync } from "../../services/EntityTemplateConstants";
import { EXTRA_BUILTIN_TEMPLATES } from "./extra-builtin-templates";

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Read-only built-ins: first the theme-aware "Standard <Type>" for every entity
 * type (falling back to the generic template), then any extra built-ins such as
 * the Table Card. The standard ones come first so they remain each type's
 * default. Never written to disk.
 */
export function buildBuiltinTemplates(themeId?: string): EntityTemplate[] {
  const standard = Object.keys(GENERIC_TEMPLATES).map((type) => ({
    id: `builtin:${type}`,
    name: `Standard ${titleCase(type)}`,
    entityType: type,
    markdown: resolveTemplateSync(type, themeId),
    source: "builtin" as const,
    version: TEMPLATE_FORMAT_VERSION,
  }));
  const extras = EXTRA_BUILTIN_TEMPLATES.map((t) => ({
    id: `builtin:${t.entityType}:${t.slug}`,
    name: t.name,
    entityType: t.entityType,
    markdown: t.markdown,
    source: "builtin" as const,
    version: TEMPLATE_FORMAT_VERSION,
  }));
  return [...standard, ...extras];
}
