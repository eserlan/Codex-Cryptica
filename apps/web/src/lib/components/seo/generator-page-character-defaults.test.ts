import { describe, expect, it } from "vitest";
import { createCharacterDefaults } from "./generator-page-character-defaults";
import {
  factionConfig,
  npcThemeConfig,
  pantheonConfig,
} from "$lib/services/seo/generator-config";

const handoff = { npcContext: "A trusted scout", factionContext: "The Watch" };

describe("character form defaults", () => {
  it("seeds the character and roster from their separate handoffs", () => {
    const forms = createCharacterDefaults("npc", handoff);
    expect(forms.npc).toMatchObject({
      theme: factionConfig.themes[0],
      ancestry: npcThemeConfig.ancestries[factionConfig.themes[0]][0],
      campaignContext: handoff.npcContext,
      mode: "table-card",
    });
    expect(forms.factionRoster.factionContext).toBe(handoff.factionContext);
    expect(forms.faction.campaignContext).toBe("");
    expect(forms.dndNpc.mode).toBe("table-card");
  });

  it("selects pantheon mode only on the pantheon route", () => {
    expect(
      createCharacterDefaults("pantheon-generator", handoff).pantheon,
    ).toMatchObject({
      mode: "pantheon",
      genre: pantheonConfig.genres[0],
      size: "small",
      width: "balanced",
    });
    expect(
      createCharacterDefaults("god-generator", handoff).pantheon.mode,
    ).toBe("single");
  });

  it("does not share mutable defaults between page instances", () => {
    const first = createCharacterDefaults("npc", handoff);
    first.npc.campaignContext = "Edited";
    first.personality.concept = "Edited";
    const second = createCharacterDefaults("npc", {
      npcContext: "",
      factionContext: "",
    });
    expect(second.npc.campaignContext).toBe("");
    expect(second.personality.concept).toBe("");
    for (const key of Object.keys(first) as (keyof typeof first)[]) {
      expect(first[key]).not.toBe(second[key]);
    }
  });
});
