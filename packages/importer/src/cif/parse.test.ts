import { describe, it, expect } from "vitest";
import { parseCifFile } from "./parse";
import { validMinimalManifest, nonCifJson } from "./fixtures";

function fileOf(
  text: string,
  fileName = "world.cif.json",
): { fileName: string; size: number; text(): Promise<string> } {
  return { fileName, size: text.length, text: async () => text };
}

describe("parseCifFile — basic container parsing (T004)", () => {
  it("never throws on malformed JSON and returns a coded error", async () => {
    const result = await parseCifFile(fileOf("{ not: valid json"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe("malformed-json");
    }
  });

  it("returns a coded error for a non-CIF JSON document", async () => {
    const result = await parseCifFile(fileOf(JSON.stringify(nonCifJson())));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe("not-cif");
    }
  });

  it("returns the manifest for valid input", async () => {
    const result = await parseCifFile(
      fileOf(JSON.stringify(validMinimalManifest())),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.format).toBe("codex-world-interchange");
      expect(result.manifest.entities.length).toBe(2);
    }
  });

  it("never throws even on completely non-object JSON", async () => {
    const result = await parseCifFile(fileOf("42"));
    expect(result.ok).toBe(false);
  });
});
