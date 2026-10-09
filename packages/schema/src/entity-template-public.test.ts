import { describe, it, expect } from "vitest";
import {
  ENTITY_TEMPLATE_PUBLIC_LIMITS,
  toPublicEntityPackage,
  validateEntityTemplatePublishMetadata,
} from "./entity-template-public";

const valid = {
  kind: "entity-template",
  formatVersion: 1,
  template: {
    name: "Settlement",
    entityType: "Location",
    markdown: "## Notes\n",
  },
};

describe("toPublicEntityPackage", () => {
  it("projects to exactly the four public fields", () => {
    const r = toPublicEntityPackage({
      ...valid,
      id: "local-1",
      source: "user",
      template: {
        ...valid.template,
        fields: [{ type: "number" }],
        secret: "x",
      },
    });
    expect(r).toEqual({
      ok: true,
      package: {
        kind: "entity-template",
        formatVersion: 1,
        template: {
          name: "Settlement",
          entityType: "location",
          markdown: "## Notes\n",
        },
      },
    });
  });

  it("trims and lower-cases the entity type", () => {
    const r = toPublicEntityPackage({
      ...valid,
      template: { ...valid.template, entityType: "  Faction " },
    });
    expect(r.ok && r.package.template.entityType).toBe("faction");
  });

  it("keeps the markdown byte for byte", () => {
    const markdown = "\n  ## Notes\r\n\r\n- a  \n\n";
    const r = toPublicEntityPackage({
      ...valid,
      template: { ...valid.template, markdown },
    });
    expect(r.ok && r.package.template.markdown).toBe(markdown);
  });

  it("rejects an empty body because there is nothing to share", () => {
    const r = toPublicEntityPackage({
      ...valid,
      template: { ...valid.template, markdown: "" },
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/nothing to share/i);
  });

  it.each([
    ["a blank name", { name: "   " }],
    [
      "an over-long name",
      { name: "n".repeat(ENTITY_TEMPLATE_PUBLIC_LIMITS.nameMax + 1) },
    ],
    ["a missing entity type", { entityType: " " }],
    [
      "an over-long entity type",
      {
        entityType: "t".repeat(ENTITY_TEMPLATE_PUBLIC_LIMITS.entityTypeMax + 1),
      },
    ],
    [
      "an over-long body",
      { markdown: "m".repeat(ENTITY_TEMPLATE_PUBLIC_LIMITS.bodyMax + 1) },
    ],
  ])("rejects %s with a plain-language error", (_label, patch) => {
    const r = toPublicEntityPackage({
      ...valid,
      template: { ...valid.template, ...patch },
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.length).toBeGreaterThan(0);
  });

  it("accepts a body at the limit", () => {
    const r = toPublicEntityPackage({
      ...valid,
      template: {
        ...valid.template,
        markdown: "m".repeat(ENTITY_TEMPLATE_PUBLIC_LIMITS.bodyMax),
      },
    });
    expect(r.ok).toBe(true);
  });

  it("rejects a newer format version with an update message", () => {
    const r = toPublicEntityPackage({ ...valid, formatVersion: 2 });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/newer version/i);
  });

  // A plain loop: `it.each` would treat the `[]` case as an argument list.
  const unusable: [string, unknown][] = [
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
    ["a string", "text"],
    ["an empty array", []],
    ["an empty object", {}],
    ["the wrong kind", { ...valid, kind: "other" }],
  ];
  for (const [label, input] of unusable) {
    it(`never throws on ${label}`, () => {
      expect(() => toPublicEntityPackage(input)).not.toThrow();
      expect(toPublicEntityPackage(input).ok).toBe(false);
    });
  }
});

describe("validateEntityTemplatePublishMetadata", () => {
  const ok = { description: "A small town.", labels: ["Fantasy"] };

  it("accepts valid metadata", () => {
    expect(validateEntityTemplatePublishMetadata(ok)).toEqual([]);
  });

  it("rejects a missing or over-long description", () => {
    expect(
      validateEntityTemplatePublishMetadata({ ...ok, description: "  " }),
    ).not.toEqual([]);
    expect(
      validateEntityTemplatePublishMetadata({
        ...ok,
        description: "d".repeat(
          ENTITY_TEMPLATE_PUBLIC_LIMITS.descriptionMax + 1,
        ),
      }),
    ).not.toEqual([]);
  });

  it("requires at least one label and at most eight", () => {
    expect(
      validateEntityTemplatePublishMetadata({ ...ok, labels: [] }),
    ).not.toEqual([]);
    expect(
      validateEntityTemplatePublishMetadata({
        ...ok,
        labels: Array.from({ length: 9 }, (_, i) => `l${i}`),
      }),
    ).not.toEqual([]);
    expect(
      validateEntityTemplatePublishMetadata({
        ...ok,
        labels: Array.from({ length: 8 }, (_, i) => `l${i}`),
      }),
    ).toEqual([]);
  });

  it("rejects a label over thirty characters", () => {
    expect(
      validateEntityTemplatePublishMetadata({
        ...ok,
        labels: ["l".repeat(ENTITY_TEMPLATE_PUBLIC_LIMITS.labelMax + 1)],
      }),
    ).not.toEqual([]);
  });

  it("rejects an over-long display name", () => {
    expect(
      validateEntityTemplatePublishMetadata({
        ...ok,
        ownerDisplayName: "n".repeat(81),
      }),
    ).not.toEqual([]);
  });

  it("counts case-insensitive duplicate labels once", () => {
    const eight = Array.from({ length: 8 }, (_, i) => `l${i}`);
    expect(
      validateEntityTemplatePublishMetadata({
        ...ok,
        labels: [...eight, "L0", " l1 "],
      }),
    ).toEqual([]);
  });
});
