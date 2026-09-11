import { describe, expect, it } from "vitest";
import { migrateTemplatePackage } from "./migrations";
import { validTemplatePackage } from "./__fixtures__/template-packages";

describe("template package migrations", () => {
  it("accepts the current version", () => {
    expect(migrateTemplatePackage(validTemplatePackage).schemaVersion).toBe(1);
  });

  it("rejects unsupported future versions", () => {
    expect(() =>
      migrateTemplatePackage({ ...validTemplatePackage, schemaVersion: 99 }),
    ).toThrow("newer format");
  });
});
