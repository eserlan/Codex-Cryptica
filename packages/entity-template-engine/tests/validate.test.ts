import { describe, it, expect } from "vitest";
import { validateTemplate } from "../src/validate";

const ok = {
  name: "My template",
  entityType: "character",
  markdown: "## Summary\n",
};

describe("validateTemplate", () => {
  it("accepts a valid draft, including a blank body", () => {
    expect(validateTemplate(ok)).toEqual([]);
    expect(validateTemplate({ ...ok, markdown: "" })).toEqual([]);
  });

  it("rejects blank, multi-line and over-long names", () => {
    expect(validateTemplate({ ...ok, name: "   " })[0].field).toBe("name");
    expect(validateTemplate({ ...ok, name: "A\nB" })[0].field).toBe("name");
    expect(validateTemplate({ ...ok, name: "x".repeat(81) })[0].field).toBe(
      "name",
    );
  });

  it("requires an entity type", () => {
    expect(validateTemplate({ ...ok, entityType: " " })[0].field).toBe(
      "entityType",
    );
  });

  it("caps the template length", () => {
    expect(
      validateTemplate({ ...ok, markdown: "x".repeat(50_001) })[0].field,
    ).toBe("markdown");
    expect(validateTemplate({ ...ok, markdown: "x".repeat(50_000) })).toEqual(
      [],
    );
  });

  it("uses plain-language messages", () => {
    for (const i of validateTemplate({
      name: "",
      entityType: "",
      markdown: "x".repeat(60_000),
    })) {
      expect(i.message).toMatch(/^[A-Z]/);
      expect(i.message).not.toMatch(/undefined|schema|zod/i);
    }
  });
});
