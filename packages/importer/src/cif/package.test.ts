import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CifManifestSchema } from "./package";
import {
  validMinimalManifest,
  manifestWithoutWorldKey,
  manifestWithDatesAtEachPrecision,
} from "./fixtures";

const EXAMPLES_DIR = join(
  import.meta.dirname,
  "../../../../schemas/cif/1.0/examples",
);

function loadExample(name: string): unknown {
  return JSON.parse(readFileSync(join(EXAMPLES_DIR, name), "utf-8"));
}

describe("CifManifestSchema — published fixture parity (T002)", () => {
  it("parses the published valid text-only example", () => {
    const result = CifManifestSchema.safeParse(
      loadExample("valid-text-only.cif.json"),
    );
    expect(result.success).toBe(true);
  });

  it("fails the published invalid example (missing entity title)", () => {
    const result = CifManifestSchema.safeParse(
      loadExample("invalid-missing-entity-title.cif.json"),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleIssue = result.error.issues.find((i) =>
        i.path.includes("title"),
      );
      expect(titleIssue).toBeTruthy();
    }
  });
});

describe("CifManifestSchema — field coverage (T002)", () => {
  it("accepts the minimal fixture manifest", () => {
    const result = CifManifestSchema.safeParse(validMinimalManifest());
    expect(result.success).toBe(true);
  });

  it("requires the exact format literal", () => {
    const result = CifManifestSchema.safeParse(
      validMinimalManifest({ format: "some-other-format" }),
    );
    expect(result.success).toBe(false);
  });

  it("requires content on every entity", () => {
    const manifest = validMinimalManifest() as any;
    delete manifest.entities[0].content;
    const result = CifManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it("rejects empty-string keys and labels", () => {
    const manifest = validMinimalManifest() as any;
    manifest.entities[0].key = "";
    expect(CifManifestSchema.safeParse(manifest).success).toBe(false);

    const manifest2 = validMinimalManifest() as any;
    manifest2.entities[0].labels = [""];
    expect(CifManifestSchema.safeParse(manifest2).success).toBe(false);
  });

  it("accepts a manifest without a worldKey", () => {
    const result = CifManifestSchema.safeParse(manifestWithoutWorldKey());
    expect(result.success).toBe(true);
  });

  it("accepts dates at year, month, and day precision", () => {
    const result = CifManifestSchema.safeParse(
      manifestWithDatesAtEachPrecision(),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an invalid date precision", () => {
    const manifest = validMinimalManifest() as any;
    manifest.entities[0].dates = {
      start: { value: "1142", precision: "decade" },
    };
    expect(CifManifestSchema.safeParse(manifest).success).toBe(false);
  });

  it("defaults relationship directed to true", () => {
    const manifest = validMinimalManifest({
      relationships: [
        { from: "characters/a", to: "characters/b", kind: "knows" },
      ],
    }) as any;
    const result = CifManifestSchema.parse(manifest);
    expect(result.relationships[0].directed).toBe(true);
  });
});
