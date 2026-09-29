import { describe, it, expect } from "vitest";
import { exportTemplatePackage, importTemplatePackage } from "../src/package";

const draft = {
  name: "Settlement",
  entityType: "location",
  markdown: "## Geography\n\nWhere.\n\n## People\n",
};

describe("template package", () => {
  it("round-trips a template", () => {
    const pkg = exportTemplatePackage(draft);
    const r = importTemplatePackage(JSON.parse(JSON.stringify(pkg)));
    expect(r).toEqual({ ok: true, template: draft });
  });

  it("round-trips a blank template", () => {
    const r = importTemplatePackage(
      exportTemplatePackage({ ...draft, markdown: "" }),
    );
    expect(r.ok && r.template.markdown).toBe("");
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
    expect(
      importTemplatePackage(exportTemplatePackage({ ...draft, name: " " })).ok,
    ).toBe(false);
  });
});
