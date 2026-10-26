import { describe, expect, it } from "vitest";
import { createSettingDefaults } from "./generator-page-setting-defaults";
import {
  nationConfig,
  settlementConfig,
  shipConfig,
  socialHubConfig,
  worldConfig,
} from "$lib/services/seo/generator-config";

describe("setting form defaults", () => {
  it("uses fantasy defaults without a hub, while ships start in sci-fi", () => {
    const forms = createSettingDefaults(null);
    expect(forms.settlement).toMatchObject({
      genre: "Fantasy",
      size: settlementConfig.sizesByGenre.Fantasy[2].name,
    });
    expect(forms.ship).toMatchObject({
      genre: "Sci-Fi",
      role: shipConfig.rolesByGenre["Sci-Fi"][0],
    });
    expect(forms.constellation.mode).toBe("single");
    expect(forms.world.campaignPressure).toBe(worldConfig.campaignPressures[0]);
  });

  it("maps Lancer settings and retains its world pressure", () => {
    const forms = createSettingDefaults("Lancer");
    expect(forms.settlement.genre).toBe("Sci-Fi");
    expect(forms.world.genre).toBe("Lancer");
    expect(forms.world.campaignPressure).toBe(worldConfig.lancerConflicts[0]);
  });

  it("uses supported hub pools and falls back for unsupported genres", () => {
    const cyberpunk = createSettingDefaults("Cyberpunk");
    expect(cyberpunk.nation.genre).toBe("Cyberpunk");
    expect(cyberpunk.socialHub.genre).toBe("Cyberpunk");
    expect(cyberpunk.newsSheet.genre).toBe("Cyberpunk");
    const unknown = createSettingDefaults("Unknown");
    expect(unknown.nation.genre).toBe(nationConfig.genres[0]);
    expect(unknown.socialHub.genre).toBe(socialHubConfig.genres[0]);
    expect(unknown.settlement.environment).toBe(
      settlementConfig.environmentsByGenre.Fantasy[0],
    );
  });

  it("isolates setting forms between pages", () => {
    const first = createSettingDefaults(null);
    first.world.dominantFeature = "Edited";
    const second = createSettingDefaults(null);
    expect(second.world.dominantFeature).toBe("");
    for (const key of Object.keys(first) as (keyof typeof first)[]) {
      expect(first[key]).not.toBe(second[key]);
    }
  });
});
