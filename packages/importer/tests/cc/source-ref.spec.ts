import { describe, it, expect } from "vitest";
import { buildSourceRef, parseSourceRef } from "../../src/cc/source-ref";

describe("buildSourceRef", () => {
  it("builds id-based ref", () => {
    expect(buildSourceRef("kanka", "Character", { id: "12345" })).toBe(
      "kanka:Character:12345",
    );
  });

  it("builds path-based ref", () => {
    expect(
      buildSourceRef("markdown", "note", { path: "characters/sara.md" }),
    ).toBe("markdown:note:path:characters/sara.md");
  });
});

describe("parseSourceRef", () => {
  it("parses id-based ref", () => {
    expect(parseSourceRef("kanka:Character:12345")).toEqual({
      system: "kanka",
      type: "Character",
      id: "12345",
      path: undefined,
    });
  });

  it("parses path-based ref", () => {
    expect(parseSourceRef("markdown:note:path:characters/sara.md")).toEqual({
      system: "markdown",
      type: "note",
      id: undefined,
      path: "characters/sara.md",
    });
  });

  it("round-trips id-based ref", () => {
    const ref = buildSourceRef("kanka", "Location", { id: "678" });
    const parsed = parseSourceRef(ref);
    expect(parsed.system).toBe("kanka");
    expect(parsed.type).toBe("Location");
    expect(parsed.id).toBe("678");
  });

  it("round-trips path-based ref", () => {
    const ref = buildSourceRef("obsidian", "note", {
      path: "world/lore/magic.md",
    });
    const parsed = parseSourceRef(ref);
    expect(parsed.system).toBe("obsidian");
    expect(parsed.path).toBe("world/lore/magic.md");
  });
});
