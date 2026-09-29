import { describe, it, expect } from "vitest";
import { validateTemplate } from "../src/validate";

const ok = {
  name: "My template",
  entityType: "character",
  sections: [{ id: "a", title: "Summary" }],
};

describe("validateTemplate", () => {
  it("accepts a valid draft", () => {
    expect(validateTemplate(ok)).toEqual([]);
  });

  it("rejects blank and over-long names", () => {
    expect(validateTemplate({ ...ok, name: "   " })[0].field).toBe("name");
    expect(validateTemplate({ ...ok, name: "x".repeat(81) })[0].field).toBe(
      "name",
    );
  });

  it("requires an entity type", () => {
    expect(validateTemplate({ ...ok, entityType: "" })[0].field).toBe(
      "entityType",
    );
  });

  it("requires at least one section", () => {
    const issues = validateTemplate({ ...ok, sections: [] });
    expect(issues.map((i) => i.field)).toEqual(["sections"]);
  });

  it("flags blank and over-long section titles with the section id", () => {
    const issues = validateTemplate({
      ...ok,
      sections: [
        { id: "a", title: " " },
        { id: "b", title: "y".repeat(121) },
        { id: "c", title: "fine" },
      ],
    });
    expect(issues.map((i) => i.sectionId)).toEqual(["a", "b"]);
  });

  it("rejects multi-line names and section titles (they would inject headings)", () => {
    expect(validateTemplate({ ...ok, name: "A\n## B" })[0].field).toBe("name");
    const issues = validateTemplate({
      ...ok,
      sections: [{ id: "a", title: "Summary\n## Injected" }],
    });
    expect(issues.map((i) => i.sectionId)).toEqual(["a"]);
  });

  it("caps the number of sections", () => {
    const sections = Array.from({ length: 101 }, (_, i) => ({
      id: `s${i}`,
      title: `S${i}`,
    }));
    expect(validateTemplate({ ...ok, sections })[0].field).toBe("sections");
    expect(
      validateTemplate({ ...ok, sections: sections.slice(0, 100) }),
    ).toEqual([]);
  });

  it("uses plain-language messages", () => {
    for (const i of validateTemplate({
      name: "",
      entityType: "",
      sections: [],
    })) {
      expect(i.message).toMatch(/^[A-Z]/);
      expect(i.message).not.toMatch(/undefined|schema|zod/i);
    }
  });
});
