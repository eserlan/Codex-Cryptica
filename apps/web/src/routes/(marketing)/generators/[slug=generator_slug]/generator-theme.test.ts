import { describe, expect, it } from "vitest";
import {
  resolveHubGeneratorGenre,
  shouldSyncGeneratorTheme,
} from "./generator-theme";

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

  it("maps hub themes to genre-driven generator defaults", () => {
    expect(resolveHubGeneratorGenre("fantasy")).toBe("Fantasy");
    expect(resolveHubGeneratorGenre("modern")).toBe("Modern");
    expect(resolveHubGeneratorGenre("cyberpunk")).toBe("Cyberpunk");
    expect(resolveHubGeneratorGenre("sci-fi")).toBe("Sci-Fi");
    expect(resolveHubGeneratorGenre("post-apocalyptic")).toBe(
      "Post-Apocalyptic",
    );
    expect(resolveHubGeneratorGenre("vampire")).toBe("Horror");
    expect(resolveHubGeneratorGenre("western")).toBe("Western");
  });

  it("returns null for missing or unknown hub themes", () => {
    expect(resolveHubGeneratorGenre(null)).toBeNull();
    expect(resolveHubGeneratorGenre("unknown")).toBeNull();
  });
});
