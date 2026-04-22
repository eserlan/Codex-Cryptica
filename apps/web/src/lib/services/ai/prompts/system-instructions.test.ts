import { describe, it, expect } from "vitest";
import { buildSystemInstruction } from "./system-instructions";

describe("buildSystemInstruction", () => {
  it("should build standard instructions when demoMode is false", () => {
    const result = buildSystemInstruction(false);
    expect(result).toContain("Lore Oracle");
    expect(result).not.toContain("DEMO_MODE_ACTIVE");
    expect(result).toContain("Do NOT add inline category suffixes");
    expect(result).not.toContain("use the format: **Entity Name** as **Type**");
    expect(result).not.toContain('they can use the "/draw" command');
    expect(result).toContain("Do not append /draw suggestions");
    expect(result).toContain('never output the structured fields "Name:"');
    expect(result).toContain("Markdown is welcome in normal oracle replies");
    expect(result).toContain(
      "Do not flatten distinct ideas into vague summaries",
    );
    expect(result).toContain(
      "For /create, prefer richer and more specific chronicle/lore output",
    );
    expect(result).toContain("Detailed markdown-rich notes and history");
  });

  it("should build demo instructions when demoMode is true", () => {
    const result = buildSystemInstruction(true);
    expect(result).toContain("Lore Oracle");
    expect(result).toContain("DEMO_MODE_ACTIVE");
    expect(result).toContain("transient");
    expect(result).toContain("Save as Campaign");
  });

  it("should include custom categories when provided", () => {
    const categories = ["Wizard", "Spell", "Tower"];
    const result = buildSystemInstruction(false, categories);
    expect(result).toContain("Wizard | Spell | Tower");
    expect(result).toContain(
      "strictly use one of the types listed above: Wizard | Spell | Tower",
    );
  });
});
