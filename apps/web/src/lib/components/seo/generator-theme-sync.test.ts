import { describe, expect, it, vi } from "vitest";
import {
  syncGeneratorTheme,
  type GeneratorThemeSyncContext,
} from "./generator-theme-sync";

function context(slug: string): GeneratorThemeSyncContext {
  const state = () => ({ theme: "Classic Fantasy", genre: "Classic Fantasy" });
  return {
    slug,
    activeTheme: "Blood Noir",
    setActiveTheme: vi.fn(),
    npc: state(),
    faction: state(),
    factionRoster: state(),
    quest: state(),
    personality: state(),
    rumour: state(),
    puzzle: state(),
    encounter: state(),
    councilVote: state(),
    heist: state(),
    holiday: state(),
    secretSociety: state(),
    socialHub: state(),
    nation: state(),
    pantheon: state(),
    language: state(),
    newsSheet: state(),
    world: state(),
    starSystem: state(),
    constellation: state(),
    alienRace: state(),
    dungeon: state(),
    adventure: state(),
    plotTwist: state(),
    villain: state(),
    minorMagicItem: state(),
    artifact: state(),
    creature: state(),
    themeToQuestGenre: {},
    mapSocialHubGenre: () => "Mapped Social",
    mapWorldGenre: () => "Mapped World",
    mapStarSystemGenre: () => "Mapped System",
    mapAlienRaceGenre: () => "Mapped Alien",
  };
}

describe("syncGeneratorTheme", () => {
  it("updates the form state for theme-driven generators", () => {
    const state = context("faction");
    syncGeneratorTheme(state);
    expect(state.faction.theme).toBe("Blood Noir");
    expect(state.setActiveTheme).not.toHaveBeenCalled();
  });

  it("syncs holiday form theme with the visible theme", () => {
    const state = context("holiday");
    syncGeneratorTheme(state);
    expect(state.holiday.genre).toBe("Blood Noir");
  });

  it("updates the visible theme for form-driven generators", () => {
    const state = context("world");
    syncGeneratorTheme(state);
    expect(state.setActiveTheme).toHaveBeenCalledWith("Mapped World");
    expect(state.world.genre).toBe("Classic Fantasy");
  });
});
