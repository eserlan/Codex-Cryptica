import { describe, it, expect } from "vitest";
import { GENERIC_TEMPLATES } from "schema";
import { buildBuiltinTemplates } from "./builtin-templates";
import {
  FANTASY_TEMPLATES,
  resolveTemplateSync,
} from "../../services/EntityTemplateConstants";

describe("buildBuiltinTemplates", () => {
  it("returns one read-only standard built-in per generic entity type", () => {
    const standard = buildBuiltinTemplates("workspace").filter((t) =>
      t.name.startsWith("Standard "),
    );
    expect(standard.map((t) => t.entityType).sort()).toEqual(
      Object.keys(GENERIC_TEMPLATES).sort(),
    );
    for (const t of standard) {
      expect(t.id).toBe(`builtin:${t.entityType}`);
      expect(t.source).toBe("builtin");
    }
  });

  describe("Table Card", () => {
    const tableCard = (theme?: string) =>
      buildBuiltinTemplates(theme).find(
        (t) => t.id === "builtin:character:table-card",
      )!;

    it("is an extra read-only Character built-in", () => {
      const t = tableCard("workspace");
      expect(t.name).toBe("Table Card");
      expect(t.entityType).toBe("character");
      expect(t.source).toBe("builtin");
    });

    it("has the five elements and table delivery, with a summary line", () => {
      const md = tableCard("workspace").markdown;
      for (const heading of [
        "## Summary",
        "## The Five Elements",
        "## Table Delivery",
      ]) {
        expect(md).toContain(heading);
      }
      for (const label of [
        "Immediate Want",
        "Physical Mannerism",
        "Sharp Contradiction",
        "Relationship Hook",
        "Sensory Tag",
      ]) {
        expect(md).toContain(`- **${label}**:`);
      }
    });

    it("is the same in every theme", () => {
      expect(tableCard("fantasy").markdown).toBe(tableCard("scifi").markdown);
    });

    it("comes after the standard Character so it never becomes the default", () => {
      const characters = buildBuiltinTemplates("workspace").filter(
        (t) => t.entityType === "character",
      );
      expect(characters.map((t) => t.id)).toEqual([
        "builtin:character",
        "builtin:character:table-card",
      ]);
    });

    it("has a unique id and no other type gets one", () => {
      const list = buildBuiltinTemplates("workspace");
      expect(new Set(list.map((t) => t.id)).size).toBe(list.length);
      expect(
        list
          .filter((t) => t.id.includes(":table-card"))
          .map((t) => t.entityType),
      ).toEqual(["character"]);
    });
  });

  it("carries the exact original markdown for the given theme", () => {
    const list = buildBuiltinTemplates("fantasy");
    const character = list.find((t) => t.entityType === "character")!;
    expect(character.markdown).toBe(FANTASY_TEMPLATES.character);
    expect(character.markdown).toBe(
      resolveTemplateSync("character", "fantasy"),
    );
  });

  it("falls back to the generic template for an unknown theme", () => {
    const list = buildBuiltinTemplates("no-such-theme");
    const faction = list.find((t) => t.entityType === "faction")!;
    expect(faction.markdown).toBe(GENERIC_TEMPLATES.faction);
  });

  it("gives every built-in a plain-language name", () => {
    const character = buildBuiltinTemplates("workspace").find(
      (t) => t.entityType === "character",
    )!;
    expect(character.name).toBe("Standard Character");
  });

  it("never yields a blank built-in for the standard entity types", () => {
    for (const theme of ["workspace", "fantasy", "scifi", "horror"]) {
      for (const t of buildBuiltinTemplates(theme)) {
        expect(t.markdown).toContain("## ");
      }
    }
  });
});
