import { describe, it, expect } from "vitest";
import { buildSystemInstruction } from "./system-instructions";

describe("buildSystemInstruction", () => {
  it("should build standard instructions when demoMode is false", () => {
    const result = buildSystemInstruction(false);
    expect(result).toContain("Lore Oracle");
    expect(result).not.toContain("DEMO_MODE_ACTIVE");
    expect(result).toContain("archivist of worlds");
    expect(result).toContain("The vault is the canonical source of truth");
    expect(result).toContain("Canonical Priority");
    expect(result).toContain("Do NOT append artificial labels");
    expect(result).toContain("I cannot find that in your records.");
  });

  it("should build demo instructions when demoMode is true", () => {
    const result = buildSystemInstruction(true);
    expect(result).toContain("Lore Oracle");
    expect(result).toContain("DEMO_MODE_ACTIVE");
    expect(result).toContain("transient");
    expect(result).toContain("Save as Campaign");
  });
});
