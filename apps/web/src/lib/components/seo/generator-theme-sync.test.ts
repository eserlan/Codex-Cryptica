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
    mysteryInvestigation: state(),
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

  it("follows the visible theme for the business generator", () => {
    const state = context("business");
    state.business = { genre: "Classic Fantasy" };
    syncGeneratorTheme(state);
    expect(state.business.genre).toBe("Blood Noir");
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

  it("skins the page from the one-shot genre", () => {
    const state = context("one-shot-adventure-generator");
    state.oneShot = { genre: "Dark Fantasy" };
    state.mapOneShotGenre = (g) => (g === "Dark Fantasy" ? "Gothic" : null);
    syncGeneratorTheme(state);
    expect(state.setActiveTheme).toHaveBeenCalledWith("Gothic");
  });

  it("keeps the theme for a custom one-shot genre", () => {
    const state = context("one-shot-adventure-generator");
    state.oneShot = { genre: "My own genre" };
    state.mapOneShotGenre = () => null;
    syncGeneratorTheme(state);
    expect(state.setActiveTheme).not.toHaveBeenCalled();
  });

  it("passes the selected full theme through as the mystery genre", () => {
    const state = context("mystery-investigation");
    state.activeTheme = "Space Opera Resistance";
    syncGeneratorTheme(state);
    expect(state.mysteryInvestigation?.genre).toBe("Space Opera Resistance");
  });
});
