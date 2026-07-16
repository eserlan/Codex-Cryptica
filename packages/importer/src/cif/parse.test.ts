import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCifFile, DEFAULT_MAX_MANIFEST_BYTES } from "./parse";
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

describe("parseCifFile — container guards (T012/FR-004/FR-005)", () => {
  it("rejects a file over maxManifestBytes without reading its content", async () => {
    let textCalled = false;
    const input = {
      fileName: "world.cif.json",
      size: DEFAULT_MAX_MANIFEST_BYTES + 1,
      text: async () => {
        textCalled = true;
        return "{}";
      },
    };
    const result = await parseCifFile(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe("oversized-manifest");
    }
    expect(textCalled).toBe(false);
  });

  it("rejects a .cif.zip filename with the FR-004 message", async () => {
    const result = await parseCifFile(fileOf("{}", "world.cif.zip"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe("zip-not-supported");
      expect(result.errors[0].message.toLowerCase()).toContain("zip");
    }
  });

  it("rejects content sniffed as a ZIP archive regardless of filename", async () => {
    const zipBytes = String.fromCharCode(0x50, 0x4b, 0x03, 0x04) + "rest";
    const result = await parseCifFile(fileOf(zipBytes, "world.cif.json"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe("zip-not-supported");
    }
  });

  it("returns invalid-structure errors naming the field for a schema-violating manifest", async () => {
    const raw = readFileSync(
      join(
        import.meta.dirname,
        "../../../../schemas/cif/1.0/examples/invalid-missing-entity-title.cif.json",
      ),
      "utf-8",
    );
    const result = await parseCifFile(fileOf(raw));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe("invalid-structure");
      expect(result.errors[0].message).toContain("title");
    }
  });

  it("returns unsupported-version when the version field itself fails schema validation", async () => {
    const raw = JSON.stringify({
      ...(validMinimalManifest() as Record<string, unknown>),
      version: 99,
    });
    const result = await parseCifFile(fileOf(raw));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe("unsupported-version");
    }
  });

  it("parses an empty entities array as a friendly empty state, not an error", async () => {
    const result = await parseCifFile(
      fileOf(JSON.stringify(validMinimalManifest({ entities: [] }))),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.entities).toEqual([]);
    }
  });
});
