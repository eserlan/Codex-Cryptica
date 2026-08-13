import { describe, it, expect } from "vitest";
import { vaultFileSourceRefBuilder } from "./source-ref";

describe("vaultFileSourceRefBuilder", () => {
  it("derives identity from sourcePath alone", () => {
    const ref = vaultFileSourceRefBuilder("vault-files", {
      sourcePath: "entities/thistle.md",
    });
    expect(ref).toBe("vault-files:path:entities/thistle.md");
  });

  it("produces the same ref for the same sourcePath (dedupe/match identity)", () => {
    const a = vaultFileSourceRefBuilder("vault-files", {
      sourcePath: "entities/thistle.md",
    });
    const b = vaultFileSourceRefBuilder("vault-files", {
      sourcePath: "entities/thistle.md",
    });
    expect(a).toBe(b);
  });

  it("never collides for different sourcePaths", () => {
    const a = vaultFileSourceRefBuilder("vault-files", {
      sourcePath: "entities/thistle.md",
    });
    const b = vaultFileSourceRefBuilder("vault-files", {
      sourcePath: "entities/other.md",
    });
    expect(a).not.toBe(b);
  });

  it("is not influenced by title (no title-based fallback identity)", () => {
    // sourceRefBuilder never even sees a title — this documents the
    // contract, since the type only accepts sourcePath.
    const ref = vaultFileSourceRefBuilder("vault-files", {
      sourcePath: "entities/thistle.md",
    });
    expect(ref).not.toContain("Thistle");
  });
});
