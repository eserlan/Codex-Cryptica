import { describe, expect, it } from "vitest";
import {
  factionConfig,
  generateFactionLocal,
  generateNpcLocal,
  nationConfig,
  generateNationLocal,
  npcThemeConfig,
  questConfig,
  generateQuestLocal,
  settlementConfig,
  generateSettlementLocal,
  socialHubConfig,
  generateSocialHubLocal,
} from "./index";

const seededRng = () => 0.2;

describe("Pirate generator support", () => {
  it("exposes real Pirate pools across the hub generators", () => {
    expect(npcThemeConfig.roles.Pirate).toContain("Quartermaster");
    expect(factionConfig.typesByTheme.Pirate).toContain("Pirate Crew");
    expect(questConfig.threatsByTheme.Pirate).toContain("Ghost Ship");
    expect(socialHubConfig.venueTypesByGenre.Pirate).toContain(
      "Dockside Tavern",
    );
    expect(nationConfig.polityTypesByGenre.Pirate).toContain(
      "Pirate Confederation",
    );
    expect(settlementConfig.primaryFunctionsByGenre.Pirate).toContain(
      "Pirate haven",
    );
  });

  it("generates Pirate local fallbacks without silently using Fantasy", () => {
    const npc = generateNpcLocal(
      { theme: "Pirate", alignment: "crew_loyalist" },
      seededRng,
    );
    const faction = generateFactionLocal(
      { theme: "Pirate", type: "Pirate Crew" },
      seededRng,
    );
    const quest = generateQuestLocal({ genre: "Pirate" }, seededRng);
    const socialHub = generateSocialHubLocal({ genre: "Pirate" }, seededRng);
    const nation = generateNationLocal({ genre: "Pirate" }, seededRng);
    const settlement = generateSettlementLocal({ genre: "Pirate" }, seededRng);

    expect(npc.lore).toContain("captain");
    expect(faction.lore).toContain("Theme / Genre**: Pirate");
    expect(quest.content).toContain("pirate conventions");
    expect(socialHub.lore).toContain("Theme / Genre**: Pirate");
    expect(nation.lore).toContain("Pirate");
    expect(settlement.lore).toContain("Pirate");
  });
});
