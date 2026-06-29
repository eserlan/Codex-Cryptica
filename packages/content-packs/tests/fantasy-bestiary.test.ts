import { describe, it, expect } from "vitest";
import { fantasyBestiary } from "../src/packs/fantasy-bestiary.js";

describe("fantasy-bestiary pack integrity", () => {
  it("has a non-empty slug-safe id", () => {
    expect(fantasyBestiary.id).toMatch(/^[a-z0-9-]+$/);
  });

  it("has at least 200 entries", () => {
    expect(fantasyBestiary.entries.length).toBeGreaterThanOrEqual(200);
  });

  it("has unique entry titles (case-insensitive)", () => {
    const titles = fantasyBestiary.entries.map((e) => e.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("has non-empty required fields on every entry", () => {
    for (const entry of fantasyBestiary.entries) {
      expect(entry.title.trim(), `title empty`).not.toBe("");
      expect(entry.category.trim(), `${entry.title}: category empty`).not.toBe(
        "",
      );
      expect(
        entry.description.trim(),
        `${entry.title}: description empty`,
      ).not.toBe("");
      expect(entry.habitat.trim(), `${entry.title}: habitat empty`).not.toBe(
        "",
      );
      expect(
        entry.behaviour.trim(),
        `${entry.title}: behaviour empty`,
      ).not.toBe("");
      expect(
        entry.threatLevel.trim(),
        `${entry.title}: threatLevel empty`,
      ).not.toBe("");
    }
  });

  it("uses only recognised category values", () => {
    const validCategories = new Set([
      "beast",
      "humanoid",
      "goblinoid",
      "undead",
      "fiend",
      "dragon",
      "giant",
      "monstrosity",
      "aberration",
      "construct",
      "fey",
      "elemental",
      "ooze",
      "plant",
      "celestial",
    ]);
    for (const entry of fantasyBestiary.entries) {
      expect(
        validCategories.has(entry.category),
        `${entry.title}: unknown category "${entry.category}"`,
      ).toBe(true);
    }
  });
});
