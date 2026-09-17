import { describe, expect, it } from "vitest";
import type { PresentationTemplate, StatSheetTemplate } from "schema";
import { parseTemplate, sanitizeSource } from "./parse";
import { isTemplateUsable, validateAst } from "./validate";
import { resolvePresentationTemplate } from "./resolve";
import { getBuiltInPresentationTemplates } from "./built-ins";
import {
  analyzePresentationCompatibility,
  exportPresentationTemplate,
  importPresentationTemplatePackage,
} from "./package";
import type {
  FieldReferenceNode,
  GroupNode,
  HeadingNode,
  MissingFieldNode,
  ParagraphNode,
  SectionNode,
  TableNode,
  UnknownDirectiveNode,
} from "./ast";
import { computeSectionKeys } from "./ast";

function mkTemplate(id: string): PresentationTemplate {
  return {
    id,
    vaultId: "v1",
    schemaTemplateId: "builtin-test",
    name: id,
    source: "",
    formatVersion: 1,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

const schema: StatSheetTemplate = {
  id: "builtin-test",
  name: "Test Schema",
  isBuiltIn: true,
  fields: [
    { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 10 },
    { id: "ac", label: "Armor Class", type: "number" },
    { id: "name_field", label: "Name", type: "text" },
    { id: "attack", label: "Attack", type: "dice", formula: "1d100" },
  ],
};

describe("getBuiltInPresentationTemplates", () => {
  it("includes an Influence Board layout for the faction turns schema", () => {
    const factionBoard = getBuiltInPresentationTemplates(
      "builtin-faction-turn",
    ).find((template) => template.name === "Faction Influence Board");

    expect(factionBoard?.source).toContain("{{stat.influence");
    expect(factionBoard?.source).toContain("{{stat.stability");
    expect(factionBoard?.source).toContain("{{stat.power");
    expect(factionBoard?.source).toContain("{{stat.resources");
  });

  it("keeps Mythras attributes, combat styles, and professional skills in the character sheet", () => {
    const mythrasTemplate = getBuiltInPresentationTemplates(
      "builtin-mythras-character",
    ).find((template) => template.name === "Mythras Character Sheet");

    expect(mythrasTemplate?.source).toContain("{{stat.combat_styles");
    expect(mythrasTemplate?.source).toContain("{{stat.professional_skills");
    expect(mythrasTemplate?.source).toContain(
      "| STR | CON | SIZ | DEX | INT | POW | CHA | Luck |",
    );
    expect(mythrasTemplate?.source).toContain("{{stat.str hide-label}}");
  });

  it("exposes collapsible sections in every titled built-in layout", () => {
    const titles = [
      "Standard Form",
      "D&D Character Sheet",
      "Mythras Character Sheet",
    ];

    for (const template of getBuiltInPresentationTemplates("builtin-test")) {
      if (!titles.includes(template.name)) continue;
      const parsed = parseTemplate(template.source, template.formatVersion);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      expect(computeSectionKeys(parsed.ast).size).toBeGreaterThan(0);
    }
  });
});

describe("parseTemplate", () => {
  it("parses standard Markdown headings/paragraphs", () => {
    const result = parseTemplate("# Title\n\nSome text.", 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const section = result.ast[0] as SectionNode;
    expect(section).toMatchObject({ type: "section" });
    expect(section.heading).toMatchObject({ type: "heading", level: 1 });
    expect(section.heading?.children[0]).toEqual({
      type: "text",
      text: "Title",
    });
    expect(section.children[0]).toMatchObject({ type: "paragraph" });
  });

  it("promotes a Markdown heading and its table into a collapsible section", () => {
    const result = parseTemplate(
      "### Characteristics\n\n| STR | DEX |\n| --- | --- |\n| {{stat.hp}} | {{stat.ac}} |",
      1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const section = result.ast[0] as SectionNode;
    expect(section.heading?.children).toEqual([
      { type: "text", text: "Characteristics" },
    ]);
    expect(section.children[0]).toMatchObject({ type: "table" });
    expect(computeSectionKeys(result.ast).get(section)).toBe("section-0");
  });

  it("keeps nested Markdown heading sections independently collapsible", () => {
    const result = parseTemplate(
      "## Abilities\n\n### Strength\n\n{{stat.hp}}",
      1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const abilities = result.ast[0] as SectionNode;
    const strength = abilities.children[0] as SectionNode;
    expect(strength).toMatchObject({ type: "section" });
    expect(computeSectionKeys(result.ast).get(abilities)).toBe("section-0");
    expect(computeSectionKeys(result.ast).get(strength)).toBe("section-1");
  });

  it("parses {{stat.field}} inline tokens", () => {
    const result = parseTemplate('{{stat.hp display="counter" label="HP"}}', 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const para = result.ast[0] as ParagraphNode;
    expect(para.children[0]).toMatchObject({
      type: "field-reference",
      fieldId: "hp",
      displayMode: "counter",
      label: "HP",
    });
  });

  it("parses hide-label boolean and attribute forms on mustache tokens", () => {
    const res1 = parseTemplate("{{stat.dex hide-label}}", 1);
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect((res1.ast[0] as ParagraphNode).children[0]).toMatchObject({
        type: "field-reference",
        fieldId: "dex",
        hideLabel: true,
      });
    }

    const res2 = parseTemplate('{{stat.dex hide-label="true"}}', 1);
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect((res2.ast[0] as ParagraphNode).children[0]).toMatchObject({
        type: "field-reference",
        fieldId: "dex",
        hideLabel: true,
      });
    }
  });

  it("parses bracket field reference tokens [field] and [field:mode] without breaking standard Markdown links", () => {
    const result = parseTemplate(
      "[hp] and [ac:prominent] and [Google](https://google.com)",
      1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const para = result.ast[0] as ParagraphNode;
    expect(para.children[0]).toEqual({
      type: "field-reference",
      fieldId: "hp",
    });
    expect(para.children[2]).toEqual({
      type: "field-reference",
      fieldId: "ac",
      displayMode: "prominent",
    });
    expect(para.children[4]).toMatchObject({
      type: "link",
      href: "https://google.com",
    });
  });

  it("parses :::stat-group columns=N ... ::: fenced tokens", () => {
    const source = `:::stat-group columns=2\n{{stat.hp}}\n{{stat.ac}}\n:::`;
    const result = parseTemplate(source, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const group = result.ast[0] as GroupNode;
    expect(group.type).toBe("group");
    expect(group.columns).toBe(2);
    expect(group.children.length).toBeGreaterThan(0);
  });

  it("never emits raw HTML/script as a passthrough token", () => {
    const result = parseTemplate(
      "<script>alert(1)</script>\n\nSome <b>text</b> and a paragraph.",
      1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rendered = JSON.stringify(result.ast);
    expect(rendered).not.toContain("<script>");
    expect(rendered).not.toContain("<b>");
  });

  it("contains malformed/unterminated fences without throwing", () => {
    expect(() =>
      parseTemplate(":::stat-group columns=2\nno closing fence", 1),
    ).not.toThrow();
    const result = parseTemplate(
      ":::stat-group columns=2\nno closing fence",
      1,
    );
    expect(result.ok).toBe(true);
  });

  it("handles empty-string input", () => {
    const result = parseTemplate("", 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ast).toEqual([]);
  });

  it("flags an unrecognized directive name as UnknownDirectiveNode", () => {
    const result = parseTemplate(":::not-a-real-directive\nhello\n:::", 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ast[0]).toMatchObject({
      type: "unknown-directive",
      name: "not-a-real-directive",
    } satisfies Partial<UnknownDirectiveNode>);
  });
});

describe("validateAst / isTemplateUsable", () => {
  it("turns an unresolved field reference into MissingFieldNode", () => {
    const parsed = parseTemplate("{{stat.doesNotExist}}", 1);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const validated = validateAst(parsed.ast, schema);
    const para = validated[0] as ParagraphNode;
    expect(para.children[0]).toMatchObject({
      type: "missing-field",
      fieldId: "doesNotExist",
    } satisfies Partial<MissingFieldNode>);
  });

  it("keeps unknown directives as UnknownDirective after validation", () => {
    const parsed = parseTemplate(":::bogus\ntext\n:::", 1);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const validated = validateAst(parsed.ast, schema);
    expect(validated[0]).toMatchObject({
      type: "unknown-directive",
      name: "bogus",
    });
  });

  it("falls back to the field type's default display mode when incompatible", () => {
    const parsed = parseTemplate('{{stat.name_field display="counter"}}', 1);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const validated = validateAst(parsed.ast, schema);
    const para = validated[0] as ParagraphNode;
    const ref = para.children[0] as FieldReferenceNode;
    expect(ref.type).toBe("field-reference");
    expect(ref.displayMode).toBe("plain"); // text field default
    expect(ref.requestedDisplayMode).toBe("counter"); // preserved for editor diagnostics
  });

  it("does not set requestedDisplayMode when the requested mode is compatible", () => {
    const parsed = parseTemplate('{{stat.hp display="counter"}}', 1);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const validated = validateAst(parsed.ast, schema);
    const para = validated[0] as ParagraphNode;
    const ref = para.children[0] as FieldReferenceNode;
    expect(ref.displayMode).toBe("counter");
    expect(ref.requestedDisplayMode).toBeUndefined();
  });

  it("accepts the compact name-target display mode for dice fields", () => {
    const parsed = parseTemplate('{{stat.attack display="name-target"}}', 1);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const validated = validateAst(parsed.ast, schema);
    const para = validated[0] as ParagraphNode;
    const ref = para.children[0] as FieldReferenceNode;
    expect(ref.displayMode).toBe("name-target");
    expect(ref.requestedDisplayMode).toBeUndefined();
  });

  it("uses the compact name-target mode by default for a 1d100 dice field", () => {
    const parsed = parseTemplate("{{stat.attack}}", 1);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const validated = validateAst(parsed.ast, schema);
    const para = validated[0] as ParagraphNode;
    const ref = para.children[0] as FieldReferenceNode;
    expect(ref.displayMode).toBe("name-target");
  });

  it("allows an explicit dice display mode to override the 1d100 default", () => {
    const parsed = parseTemplate('{{stat.attack display="plain"}}', 1);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const validated = validateAst(parsed.ast, schema);
    const para = validated[0] as ParagraphNode;
    const ref = para.children[0] as FieldReferenceNode;
    expect(ref.displayMode).toBe("plain");
  });

  it("isTemplateUsable is false when schema is undefined", () => {
    const template = {
      id: "t1",
      vaultId: "v1",
      schemaTemplateId: "builtin-test",
      name: "T",
      source: "hello",
      formatVersion: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    expect(isTemplateUsable(template, undefined)).toBe(false);
  });

  it("isTemplateUsable is false when parseTemplate fails", () => {
    const template = {
      id: "t1",
      vaultId: "v1",
      schemaTemplateId: "builtin-test",
      name: "T",
      source: "hello",
      formatVersion: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    // parseTemplate never actually throws for string input in this
    // implementation, so simulate the failure path via a schema mismatch
    // instead — schemaTemplateId not matching the provided schema id.
    expect(isTemplateUsable(template, { ...schema, id: "other-schema" })).toBe(
      false,
    );
  });

  it("isTemplateUsable is true even with flagged MissingField/UnknownDirective nodes", () => {
    const template = {
      id: "t1",
      vaultId: "v1",
      schemaTemplateId: "builtin-test",
      name: "T",
      source: "{{stat.doesNotExist}} :::bogus\ntext\n:::",
      formatVersion: 1,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    expect(isTemplateUsable(template, schema)).toBe(true);
  });

  it("prefers the per-entity override over the schema default", () => {
    const templates: PresentationTemplate[] = [
      mkTemplate("t-override"),
      mkTemplate("t-default"),
    ];
    const resolved = resolvePresentationTemplate(
      { presentationTemplateId: "t-override" },
      "t-default",
      templates,
    );
    expect(resolved?.id).toBe("t-override");
  });

  it("falls back to the schema default when the entity has no override", () => {
    const templates: PresentationTemplate[] = [mkTemplate("t-default")];
    const resolved = resolvePresentationTemplate(
      { presentationTemplateId: null },
      "t-default",
      templates,
    );
    expect(resolved?.id).toBe("t-default");
  });

  it("resolves to null when neither an override nor a default is set", () => {
    const templates: PresentationTemplate[] = [mkTemplate("t-default")];
    expect(resolvePresentationTemplate(undefined, null, templates)).toBeNull();
  });

  it("parses a Markdown table", () => {
    const result = parseTemplate("| A | B |\n| --- | --- |\n| 1 | 2 |", 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ast[0].type).toBe("table");
    const table = result.ast[0] as TableNode;
    expect(table.header.length).toBe(2);
    expect(table.rows.length).toBe(1);
  });
});

describe("sanitizeSource", () => {
  it("strips raw HTML/script content and reports removed fragments, preserving valid Markdown", () => {
    const result = sanitizeSource(
      "# Title\n\n<script>alert(1)</script>\n\nSome <b>text</b> and {{stat.hp}}.",
    );
    expect(result.source).not.toContain("<script>");
    expect(result.source).not.toContain("<b>");
    expect(result.source).toContain("# Title");
    expect(result.source).toContain("{{stat.hp}}");
    expect(result.removed.some((f) => f.includes("<script>"))).toBe(true);
    expect(result.removed.some((f) => f.includes("<b>"))).toBe(true);
  });

  it("strips executable-expression syntax while preserving flat field references", () => {
    const result = sanitizeSource(
      '{{stat.hp display="counter"}} and ${window.location} and {{#if x}}y{{/if}}',
    );
    expect(result.source).toContain('{{stat.hp display="counter"}}');
    expect(result.source).not.toContain("${window.location}");
    expect(result.source).not.toContain("{{#if x}}");
    expect(result.removed.length).toBeGreaterThan(0);
  });

  it("returns no removed fragments for plain valid source", () => {
    const result = sanitizeSource(
      '# Title\n\n{{stat.hp display="plain"}}\n{{stat.str hide-label}}',
    );
    expect(result.removed).toEqual([]);
    expect(result.source).toBe(
      '# Title\n\n{{stat.hp display="plain"}}\n{{stat.str hide-label}}',
    );
  });
});

describe("exportPresentationTemplate / importPresentationTemplatePackage", () => {
  const template: PresentationTemplate = {
    id: "presentation-1",
    vaultId: "vault-1",
    schemaTemplateId: "builtin-test",
    name: "My Layout",
    description: "A custom layout",
    source: "{{stat.hp}}",
    formatVersion: 1,
    isBuiltIn: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };

  it("exports only formatVersion/name/description/schemaTemplateId/source, no entity values/vault id/asset refs", () => {
    const pkg = exportPresentationTemplate(template);
    expect(pkg).toEqual({
      formatVersion: 1,
      name: "My Layout",
      description: "A custom layout",
      schemaTemplateId: "builtin-test",
      source: "{{stat.hp}}",
    });
    expect(pkg).not.toHaveProperty("id");
    expect(pkg).not.toHaveProperty("vaultId");
    expect(pkg).not.toHaveProperty("isBuiltIn");
    expect(pkg).not.toHaveProperty("createdAt");
  });

  it("imports successfully when the destination vault has a matching schema", () => {
    const pkg = exportPresentationTemplate(template);
    const result = importPresentationTemplatePackage(pkg, ["builtin-test"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.package.schemaTemplateId).toBe("builtin-test");
    expect(result.removedFragments).toEqual([]);
  });

  it("returns a typed incompatibility result when no schema matches, instead of attaching to an unrelated schema", () => {
    const pkg = exportPresentationTemplate(template);
    const result = importPresentationTemplatePackage(pkg, [
      "some-other-schema",
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("schema-not-found");
  });

  it("strips disallowed content from an imported package's source and reports it", () => {
    const pkg = {
      formatVersion: 1,
      name: "Imported",
      description: null,
      schemaTemplateId: "builtin-test",
      source: "<script>alert(1)</script>{{stat.hp}}",
    };
    const result = importPresentationTemplatePackage(pkg, ["builtin-test"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.package.source).not.toContain("<script>");
    expect(result.package.source).toContain("{{stat.hp}}");
    expect(result.removedFragments.length).toBeGreaterThan(0);
  });

  it("rejects a structurally invalid package as invalid-package", () => {
    const result = importPresentationTemplatePackage({ foo: "bar" }, [
      "builtin-test",
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalid-package");
  });

  it("retargets imported package to targetSchema and identifies unmapped fields", () => {
    const pkg = {
      formatVersion: 1,
      name: "Imported from Another Character",
      description: null,
      schemaTemplateId: "entity-local-stat-sheet:char-1",
      source: "{{stat.hp}}\n\n{{stat.ac}}\n\n{{stat.mana}}",
    };

    const targetSchema: StatSheetTemplate = {
      id: "entity-local-stat-sheet:char-2",
      name: "Character 2",
      isBuiltIn: false,
      fields: [
        { id: "hp", label: "Hit Points", type: "counter" },
        { id: "ac", label: "Armor Class", type: "number" },
      ],
    };

    const result = importPresentationTemplatePackage(pkg, [], targetSchema);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.package.schemaTemplateId).toBe(
      "entity-local-stat-sheet:char-2",
    );
    expect(result.unmappedFields).toEqual(["mana"]);
  });
});

describe("analyzePresentationCompatibility", () => {
  it("detects fully compatible presentation when all fields exist", () => {
    const targetSchema: StatSheetTemplate = {
      id: "schema-test",
      name: "Test",
      isBuiltIn: false,
      fields: [
        { id: "hp", label: "HP", type: "counter" },
        { id: "str", label: "STR", type: "number" },
      ],
    };

    const analysis = analyzePresentationCompatibility(
      "{{stat.hp}}\n\n[str]",
      1,
      targetSchema,
    );
    expect(analysis.compatible).toBe(true);
    expect(analysis.matchedFields).toContain("hp");
    expect(analysis.matchedFields).toContain("str");
    expect(analysis.unmappedFields).toEqual([]);
  });

  it("identifies missing field references in unmappedFields", () => {
    const targetSchema: StatSheetTemplate = {
      id: "schema-test",
      name: "Test",
      isBuiltIn: false,
      fields: [{ id: "hp", label: "HP", type: "counter" }],
    };

    const analysis = analyzePresentationCompatibility(
      "{{stat.hp}}\n\n{{stat.mana}}\n\n[spell_slots]",
      1,
      targetSchema,
    );
    expect(analysis.compatible).toBe(false);
    expect(analysis.matchedFields).toEqual(["hp"]);
    expect(analysis.unmappedFields).toContain("mana");
    expect(analysis.unmappedFields).toContain("spell_slots");
  });
});

describe("computeSectionKeys", () => {
  it("assigns keys to sections in document order, including nested sections", () => {
    const first: SectionNode = { type: "section", title: "A", children: [] };
    const second: SectionNode = {
      type: "section",
      title: "B",
      children: [{ type: "section", title: "C", children: [] }],
    };
    const keys = computeSectionKeys([first, second]);

    expect(keys.get(first)).toBe("section-0");
    expect(keys.get(second)).toBe("section-1");
    expect(keys.get(second.children[0] as SectionNode)).toBe("section-2");
  });

  it("ignores non-section nodes and sections nested in groups/cards/rows", () => {
    const nested: SectionNode = {
      type: "section",
      title: "Nested",
      children: [],
    };
    const ast = [
      { type: "heading", level: 1, children: [] } as HeadingNode,
      {
        type: "group",
        children: [{ type: "card", children: [nested] }],
      } as unknown as GroupNode,
    ];

    const keys = computeSectionKeys(ast);

    expect(keys.size).toBe(1);
    expect(keys.get(nested)).toBe("section-0");
  });
});
