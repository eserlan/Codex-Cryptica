import { describe, expect, it } from "vitest";
import { shouldSyncGeneratorTheme } from "./generator-theme";

describe("shouldSyncGeneratorTheme", () => {
  it("syncs every generator route into the CFF theme store", () => {
    const slugs = [
      "npc",
      "settlement",
      "magic-item",
      "faction",
      "quest",
      "item",
      "tavern",
      "social-hub",
      "kingdom",
      "nation",
      "vampire-clan",
      "names",
      "fantasy-names",
      "dnd-npc",
      "pantheon-generator",
      "god-generator",
    ];

    for (const slug of slugs) {
      expect(shouldSyncGeneratorTheme(slug)).toBe(true);
    }
  });

  it("does not sync unknown slugs", () => {
    expect(shouldSyncGeneratorTheme("not-a-generator")).toBe(false);
  });
});
