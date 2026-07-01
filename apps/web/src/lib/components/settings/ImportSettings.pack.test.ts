/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listPacks,
  getPack,
  packToDiscoveredEntities,
} from "@codex/content-packs";

// Verify no AI client is imported/called by the content-packs module
vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn(() => {
      throw new Error("AI client must not be called during pack import");
    }),
  };
});

describe("Creature Packs — pack import path (zero AI calls)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listPacks returns at least one pack", () => {
    expect(listPacks().length).toBeGreaterThan(0);
  });

  it("fantasy-bestiary pack is available", () => {
    const pack = getPack("fantasy-bestiary");
    expect(pack).toBeDefined();
    expect(pack!.entries.length).toBeGreaterThanOrEqual(12);
  });

  it("selecting a pack produces one DiscoveredEntity per entry (move to review)", () => {
    const pack = getPack("fantasy-bestiary")!;
    const entities = packToDiscoveredEntities(pack);
    expect(entities.length).toBe(pack.entries.length);
  });

  it("all entities are of type Creature — mapType must return creature", () => {
    const pack = getPack("fantasy-bestiary")!;
    const entities = packToDiscoveredEntities(pack);
    for (const entity of entities) {
      expect(entity.suggestedType).toBe("Creature");
    }
  });

  it("all entities carry creature-pack label", () => {
    const pack = getPack("fantasy-bestiary")!;
    const entities = packToDiscoveredEntities(pack);
    for (const entity of entities) {
      expect(entity.frontmatter.labels).toContain("creature-pack");
    }
  });

  it("matched entries are flagged when existingTitles provided (dedup)", () => {
    const pack = getPack("fantasy-bestiary")!;
    const firstEntry = pack.entries[0];
    const slug = firstEntry.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const existing = new Map([[slug, "existing-vault-id"]]);
    const entities = packToDiscoveredEntities(pack, existing);
    expect(entities[0].matchedEntityId).toBe("existing-vault-id");
    // unmatched entries are undefined
    expect(entities[1].matchedEntityId).toBeUndefined();
  });

  it("pack import path issues zero AI-client calls (FR-006 / SC-004)", async () => {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const pack = getPack("fantasy-bestiary")!;
    packToDiscoveredEntities(pack);
    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
  });

  it("subpacks link to master pack via parentPackId", () => {
    const packs = listPacks();
    const masterPacks = packs.filter((p) => !p.parentPackId);
    const subpacks = packs.filter((p) => p.parentPackId === "fantasy-bestiary");
    expect(masterPacks.length).toBeGreaterThanOrEqual(6);
    expect(subpacks.length).toBe(15);
  });

  it("subpack selection produces DiscoveredEntities specifically for that subpack", () => {
    const beastSubpack = getPack("fantasy-beasts")!;
    expect(beastSubpack).toBeDefined();
    expect(beastSubpack.parentPackId).toBe("fantasy-bestiary");
    const entities = packToDiscoveredEntities(beastSubpack);
    expect(entities.length).toBe(20);
    expect(entities[0].suggestedType).toBe("Creature");
  });

  it("test run: humanoid creature pack produces entities with attribution credits and images", () => {
    const humanoidSubpack = getPack("fantasy-humanoids")!;
    expect(humanoidSubpack).toBeDefined();
    expect(humanoidSubpack.credits).toContain("Too-Many-Tokens-DND");
    const entities = packToDiscoveredEntities(humanoidSubpack);
    expect(entities.length).toBe(20);
    expect(entities[0].lore).toContain(
      "*Credits: Tokens courtesy of Too-Many-Tokens-DND (GitHub / Community CC0)*",
    );
    expect(entities[0].frontmatter.labels).toContain("creature-pack");
    expect(entities[0].frontmatter.image).toContain(
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/",
    );
  });

  it("test run: beast creature pack produces entities with attribution credits and images for all 20 entries", () => {
    const beastSubpack = getPack("fantasy-beasts")!;
    expect(beastSubpack).toBeDefined();
    expect(beastSubpack.credits).toContain("Too-Many-Tokens-DND");
    const entities = packToDiscoveredEntities(beastSubpack);
    expect(entities.length).toBe(20);
    for (const entity of entities) {
      expect(entity.frontmatter.image).toBeDefined();
      expect(entity.frontmatter.image).toContain(
        "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/",
      );
    }
  });

  it("all CC theme master bestiaries produce valid entities with token images and attribution", () => {
    const packs = listPacks();
    const masterPacks = packs.filter((p) => !p.parentPackId);
    const themeIds = [
      "fantasy",
      "scifi",
      "cyberpunk",
      "apocalyptic",
      "horror",
      "steampunk",
    ];

    for (const genre of themeIds) {
      const pack = masterPacks.find((p) => p.genre === genre);
      expect(pack).toBeDefined();
      expect(pack!.credits).toContain("Too-Many-Tokens-DND");

      const entities = packToDiscoveredEntities(pack!);
      expect(entities.length).toBeGreaterThan(0);
      for (const entity of entities) {
        expect(entity.frontmatter.image).toBeDefined();
        expect(entity.frontmatter.image).toContain(
          "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/",
        );
        expect(entity.lore).toContain(
          "*Credits: Tokens courtesy of Too-Many-Tokens-DND (GitHub / Community CC0)*",
        );
      }
    }
  });

  it("filtering master packs by genre maps themes correctly and defaults to fantasy", () => {
    const packs = listPacks();
    const mapThemeToGenre = (themeId: string) => {
      const rawId = (themeId || "").toLowerCase();
      if (
        [
          "scifi",
          "starwars",
          "startrek",
          "lancer",
          "space-opera-resistance",
        ].includes(rawId)
      )
        return "scifi";
      if (["cyberpunk", "modern"].includes(rawId)) return "cyberpunk";
      if (["apocalyptic", "fallout"].includes(rawId)) return "apocalyptic";
      if (["horror"].includes(rawId)) return "horror";
      if (["steampunk", "western"].includes(rawId)) return "steampunk";
      return "fantasy";
    };

    expect(mapThemeToGenre("workspace")).toBe("fantasy");
    expect(mapThemeToGenre("fantasy")).toBe("fantasy");
    expect(mapThemeToGenre("fallout")).toBe("apocalyptic");
    expect(mapThemeToGenre("modern")).toBe("cyberpunk");
    expect(mapThemeToGenre("western")).toBe("steampunk");

    const getFilteredMasterPacks = (themeId: string) => {
      const targetGenre = mapThemeToGenre(themeId);
      return packs.filter(
        (p) => !p.parentPackId && (p.genre || "fantasy") === targetGenre,
      );
    };

    expect(getFilteredMasterPacks("workspace")[0].id).toBe("fantasy-bestiary");
    expect(getFilteredMasterPacks("scifi")[0].id).toBe("scifi-bestiary");
    expect(getFilteredMasterPacks("fallout")[0].id).toBe(
      "apocalyptic-bestiary",
    );
  });
});
