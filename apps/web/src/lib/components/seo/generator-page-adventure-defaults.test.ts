import { describe, expect, it } from "vitest";
import { createAdventureDefaults } from "./generator-page-adventure-defaults";
import {
  encounterConfig,
  magicItemConfig,
  oneShotConfig,
} from "#lib/services/seo/generator-config.js";

describe("adventure form defaults", () => {
  it("preserves default choices and seeds only the plot twist from the quest", () => {
    const forms = createAdventureDefaults({
      questPremise: "The missing crown",
    });
    expect(forms.plotTwist.premise).toBe("The missing crown");
    expect(forms.quest.campaignContext).toBe("");
    expect(forms.encounter.encounterType).toBe(
      encounterConfig.encounterTypes.find((t) => t !== "Random") ??
        encounterConfig.encounterTypes[0],
    );
    expect(forms.magicItem.rarity).toBe(magicItemConfig.rarities[1]);
    expect(forms.oneShot).toMatchObject({
      genre: oneShotConfig.genres[0],
      durationHours: "3",
      partySize: "4",
      structure: oneShotConfig.structures[1],
    });
    expect(forms.pointCrawl).toMatchObject({
      pointCount: "8",
      density: "Balanced branching",
    });
    expect(forms.business.playersOwn).toBe(false);
    expect(forms.holiday.includeControversial).toBe(false);
  });

  it("keeps an absent premise empty and isolates every form per page", () => {
    const first = createAdventureDefaults({ questPremise: "" });
    first.plotTwist.premise = "Edited";
    const second = createAdventureDefaults({ questPremise: "" });
    expect(second.plotTwist.premise).toBe("");
    for (const key of Object.keys(first) as (keyof typeof first)[]) {
      expect(first[key]).not.toBe(second[key]);
    }
  });
});
