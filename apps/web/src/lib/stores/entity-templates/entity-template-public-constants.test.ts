import { describe, expect, it } from "vitest";
import {
  TEMPLATE_FORMAT_VERSION,
  TEMPLATE_MARKDOWN_MAX,
  TEMPLATE_NAME_MAX,
  TEMPLATE_PACKAGE_KIND,
  exportTemplatePackage,
  importTemplatePackage,
} from "entity-template-engine";
import {
  ENTITY_TEMPLATE_FORMAT_VERSION,
  ENTITY_TEMPLATE_PACKAGE_KIND,
  ENTITY_TEMPLATE_PUBLIC_LIMITS,
  toPublicEntityPackage,
} from "schema";

/**
 * The public package lives in `schema` (workers may only import `schema`) but
 * its format is defined by `entity-template-engine`. These must never drift.
 */
describe("public entity template package matches the local package format", () => {
  it("uses the same kind, version and limits", () => {
    expect(ENTITY_TEMPLATE_PACKAGE_KIND).toBe(TEMPLATE_PACKAGE_KIND);
    expect(ENTITY_TEMPLATE_FORMAT_VERSION).toBe(TEMPLATE_FORMAT_VERSION);
    expect(ENTITY_TEMPLATE_PUBLIC_LIMITS.nameMax).toBe(TEMPLATE_NAME_MAX);
    expect(ENTITY_TEMPLATE_PUBLIC_LIMITS.bodyMax).toBe(TEMPLATE_MARKDOWN_MAX);
  });

  it("projects an exported package and imports back to the same draft", () => {
    const draft = {
      name: "Guild Hall",
      entityType: "location",
      markdown: "\n## Rooms\r\n\r\nBig.  \n",
    };
    const projected = toPublicEntityPackage(exportTemplatePackage(draft));
    expect(projected.ok).toBe(true);
    const back = importTemplatePackage(projected.ok ? projected.package : null);
    expect(back).toEqual({ ok: true, template: draft });
  });
});
