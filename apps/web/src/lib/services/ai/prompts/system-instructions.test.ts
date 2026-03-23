import { describe, it, expect } from "vitest";
import { buildSystemInstruction } from "./system-instructions";

describe("buildSystemInstruction", () => {
  it("should build standard instructions when demoMode is false", () => {
    const result = buildSystemInstruction(false);
    expect(result).toContain("Lore Oracle");
    expect(result).not.toContain("DEMO_MODE_ACTIVE");
  });

  it("should build demo instructions when demoMode is true", () => {
    const result = buildSystemInstruction(true);
    expect(result).toContain("Lore Oracle");
    expect(result).toContain("DEMO_MODE_ACTIVE");
    expect(result).toContain("transient");
    expect(result).toContain("Save as Campaign");
  });
});
