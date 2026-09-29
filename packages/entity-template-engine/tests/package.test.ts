import { describe, it, expect } from "vitest";
import { exportTemplatePackage, importTemplatePackage } from "../src/package";

const draft = {
  name: "Settlement",
  entityType: "location",
  intro: "Intro",
  sections: [
    { id: "a", title: "Geography", hint: "Where." },
    { id: "b", title: "People" },
  ],
};

describe("template package", () => {
  it("round-trips a template", () => {
    const pkg = exportTemplatePackage(draft);
    const r = importTemplatePackage(JSON.parse(JSON.stringify(pkg)));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.template.name).toBe("Settlement");
    expect(r.template.intro).toBe("Intro");
    expect(r.template.sections.map((s) => [s.title, s.hint])).toEqual([
      ["Geography", "Where."],
      ["People", undefined],
    ]);
  });

  it("exports no id, source or default state", () => {
    const pkg = exportTemplatePackage({
      ...draft,
      id: "x",
      source: "user",
    } as any);
    expect(JSON.stringify(pkg)).not.toMatch(/"id"|"source"|"default/);
    expect(pkg.kind).toBe("entity-template");
    expect(pkg.formatVersion).toBe(1);
  });

  it("preserves unknown section fields", () => {
    const pkg = exportTemplatePackage({
      ...draft,
      sections: [{ id: "a", title: "A", fieldType: "number" } as any],
    });
    const r = importTemplatePackage(pkg);
    expect(r.ok && (r.template.sections[0] as any).fieldType).toBe("number");
  });

  it.each([
    ["null", null],
    ["a string", "hello"],
    ["wrong kind", { kind: "stat-sheet", formatVersion: 1, template: {} }],
    [
      "invalid template",
      { kind: "entity-template", formatVersion: 1, template: { name: 3 } },
    ],
  ])("rejects %s without throwing", (_label, raw) => {
    const r = importTemplatePackage(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });

  it("rejects a newer format version with an update hint", () => {
    const r = importTemplatePackage({
      ...exportTemplatePackage(draft),
      formatVersion: 99,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/update/i);
  });

  it("rejects a package that fails template validation", () => {
    const pkg = exportTemplatePackage({ ...draft, sections: [] });
    const r = importTemplatePackage(pkg);
    expect(r.ok).toBe(false);
  });

  it("rejects a package whose section title would inject a heading", () => {
    const pkg = exportTemplatePackage({
      ...draft,
      sections: [{ id: "a", title: "A\n## Injected" }],
    });
    expect(importTemplatePackage(pkg).ok).toBe(false);
  });
});
