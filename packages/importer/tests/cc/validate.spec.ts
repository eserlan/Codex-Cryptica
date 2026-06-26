import { describe, it, expect } from "vitest";
import { validatePackage } from "../../src/cc/validate";
import type { CCImportPackage } from "../../src/cc/package";

const validPkg: CCImportPackage = {
  version: "1.0",
  sourceSystem: "kanka",
  sourceLabel: "Test",
  entityDrafts: [{ sourceId: "1", title: "Alice", content: "", tags: [] }],
  relationshipDrafts: [],
  assetDrafts: [],
  warnings: [],
};

describe("validatePackage", () => {
  it("accepts a valid package", () => {
    const result = validatePackage(validPkg);
    expect(result.ok).toBe(true);
  });

  it("rejects unknown version", () => {
    const result = validatePackage({ ...validPkg, version: "99.0" });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.some((e) => e.code === "UNSUPPORTED_VERSION")).toBe(
        true,
      );
  });

  it("rejects missing version", () => {
    const result = validatePackage({ ...validPkg, version: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects empty sourceSystem", () => {
    const result = validatePackage({ ...validPkg, sourceSystem: "" });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.some((e) => e.path.includes("sourceSystem"))).toBe(
        true,
      );
  });

  it("rejects draft with neither sourceId nor sourcePath", () => {
    const result = validatePackage({
      ...validPkg,
      entityDrafts: [{ title: "Bob", content: "", tags: [] } as never],
    });
    expect(result.ok).toBe(false);
  });

  it("collects ALL errors (not just first)", () => {
    const result = validatePackage({
      ...validPkg,
      version: "99.0",
      sourceSystem: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("returns warning (not error) for duplicate sourceId, package still ok", () => {
    const result = validatePackage({
      ...validPkg,
      entityDrafts: [
        { sourceId: "dup", title: "A", content: "", tags: [] },
        { sourceId: "dup", title: "B", content: "", tags: [] },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.warnings.some((w) => w.code === "DUPLICATE_SOURCE_ID"),
      ).toBe(true);
    }
  });
});
