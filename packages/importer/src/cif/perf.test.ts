import { describe, it, expect } from "vitest";
import { CifManifestSchema } from "./package";
import { parseCifFile } from "./parse";
import { validateCifManifest } from "./validate";
import { normalizeCifPackage } from "./normalize";
import { largeManifest } from "./fixtures";

describe("CIF import — performance guard (T024/SC-006)", () => {
  it("parses, validates, and normalizes a ~1,000-entity manifest in under 5 seconds", async () => {
    const raw = largeManifest(1000);
    const text = JSON.stringify(raw);

    const start = performance.now();

    const parseResult = await parseCifFile({
      fileName: "large-world.cif.json",
      size: text.length,
      text: async () => text,
    });
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const validation = validateCifManifest(parseResult.manifest);
    expect(validation.ok).toBe(true);

    const { pkg } = normalizeCifPackage(parseResult.manifest);
    expect(pkg.entityDrafts.length).toBe(1000);

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  it("parses a valid manifest built directly from the schema for parity", () => {
    const raw = largeManifest(1000);
    const manifest = CifManifestSchema.parse(raw);
    expect(manifest.entities.length).toBe(1000);
  });
});
