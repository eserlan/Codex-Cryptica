import { describe, expect, it } from "vitest";
import { GENERIC_TEMPLATES } from "schema";
import { EXTRACTION_PROMPT } from "./prompt-factory";

describe("EXTRACTION_PROMPT", () => {
  it("embeds the generic lore template sections for every declared type", () => {
    for (const key of [
      "character",
      "location",
      "item",
      "faction",
      "creature",
      "event",
    ]) {
      expect(EXTRACTION_PROMPT).toContain(GENERIC_TEMPLATES[key]);
    }
    // "Lore" (the AI's catch-all type) reuses the note template's structure.
    expect(EXTRACTION_PROMPT).toContain(GENERIC_TEMPLATES.note);
  });

  it("instructs the model to structure lore by section outline instead of leaving it freeform", () => {
    expect(EXTRACTION_PROMPT).toMatch(/section headings/i);
    expect(EXTRACTION_PROMPT).toContain("LORE SECTION OUTLINES BY TYPE");
  });

  it("lists Creature and Event as valid types alongside the original set", () => {
    expect(EXTRACTION_PROMPT).toContain(
      "[Character, Location, Item, Lore, Faction, Creature, Event]",
    );
  });
});
