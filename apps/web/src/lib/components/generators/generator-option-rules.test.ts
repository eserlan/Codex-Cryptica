import { describe, expect, it } from "vitest";
import {
  adventureConfig,
  dungeonConfig,
  getGenerator,
  getVillainThreatScales,
  worldConfig,
  themeIdToLabel,
} from "generator-engine";
import {
  getNextOptionValues,
  getThemedChoices,
  isOptionVisible,
  reconcileOptionValues,
  updateOptionValues,
} from "./generator-option-rules";

describe("generator option rules", () => {
  it("initializes defaults and retains existing false, zero and empty values", () => {
    const previous = { race: "", role: false, level: 0, obsolete: "discard" };
    const values = getNextOptionValues("npc", previous, true);
    expect(values).toMatchObject({
      race: "",
      role: false,
      gameSystem: "tales-of-the-valiant",
    });
    expect(values.obsolete).toBeUndefined();
    expect(getNextOptionValues("npc", {}, false).gameSystem).toBe(
      "system-neutral",
    );
    expect(
      getNextOptionValues("npc", { gameSystem: "custom" }, true).gameSystem,
    ).toBe("custom");
    expect(
      getNextOptionValues("encounter", { partySize: 0 }, false).partySize,
    ).toBe(0);
    expect(previous.obsolete).toBe("discard");
  });

  it("offers theme-specific choices and uses the supplied genre for villains and worlds", () => {
    const choices = getThemedChoices("western", { genre: "Lancer" });
    expect(choices["npc:race"]).not.toContain("Elf");
    expect(choices["npc:role"]).toContain("Gunslinger");
    expect(choices["world:campaignPressure"]).toEqual(
      worldConfig.lancerConflicts,
    );
    expect(
      getThemedChoices("fantasy", { genre: "Superhero" })[
        "villain:threatScale"
      ],
    ).toEqual(getVillainThreatScales("Superhero"));
  });

  it.each(["dungeon", "adventure", "villain"] as const)(
    "reconciles known %s values but preserves custom values",
    (id) => {
      const stale = {
        purpose: dungeonConfig.purposes[0],
        currentState: dungeonConfig.currentStates[0],
        archetype: adventureConfig.archetypes[0],
        tone: adventureConfig.tones[0],
        threatScale: getVillainThreatScales("Classic Fantasy")[0],
      };
      const emptyChoices = Object.fromEntries(
        Object.keys(getThemedChoices("scifi", {})).map((key) => [key, []]),
      );
      const reconciled = reconcileOptionValues(id, stale, emptyChoices);
      const field = {
        dungeon: "purpose",
        adventure: "archetype",
        villain: "threatScale",
      }[id];
      expect(reconciled[field]).toBe("");
      expect(stale[field as keyof typeof stale]).not.toBe("");
      const custom = {
        purpose: "My delve",
        currentState: "My state",
        archetype: "My adventure",
        tone: "My tone",
        threatScale: "My scale",
      };
      expect(reconcileOptionValues(id, custom, emptyChoices)).toBe(custom);
    },
  );

  it("clears an incompatible adventure tone instead of selecting a replacement", () => {
    const result = reconcileOptionValues(
      "adventure",
      { tone: adventureConfig.tones[0] },
      { "adventure:tone": ["Other"] },
    );
    expect(result.tone).toBe("");
    const empty = { threatScale: "" };
    expect(
      reconcileOptionValues(
        "villain",
        empty,
        getThemedChoices("western", empty),
      ),
    ).toBe(empty);
  });

  it("adapts dependent world and villain values on genre changes", () => {
    const world = {
      campaignPressure: worldConfig.campaignPressures[0],
      societalModel: "custom",
    };
    expect(
      updateOptionValues("world", world, "genre", "Lancer", "fantasy"),
    ).toMatchObject({
      campaignPressure: worldConfig.lancerConflicts[0],
      societalModel: "custom",
    });
    expect(
      updateOptionValues(
        "villain",
        { threatScale: "" },
        "genre",
        "Superhero",
        "fantasy",
      ).threatScale,
    ).toBe(getVillainThreatScales("Superhero")[0]);
    expect(
      updateOptionValues(
        "villain",
        { threatScale: 42 },
        "genre",
        "",
        "superhero",
      ).threatScale,
    ).toBe(getVillainThreatScales(themeIdToLabel.superhero)[0]);
    expect(world.campaignPressure).toBe(worldConfig.campaignPressures[0]);
  });

  it("keeps custom dependent choices and does not reset values on unrelated edits", () => {
    for (const id of ["world", "villain"] as const) {
      const custom = {
        campaignPressure: "My pressure",
        threatScale: "My scale",
      };
      expect(
        updateOptionValues(id, custom, "genre", "Lancer", "fantasy"),
      ).toMatchObject(custom);
      expect(
        updateOptionValues(id, custom, "name", "Updated", "fantasy"),
      ).toEqual({ ...custom, name: "Updated" });
    }
    const values = { purpose: "custom" };
    expect(reconcileOptionValues("npc", values, {})).toBe(values);
  });

  it("honours both allowed and excluded visibility values", () => {
    const option = {
      ...getGenerator("npc").options[0],
      visibleWhen: {
        optionId: "genre",
        values: ["Lancer", "Fantasy"],
        notValues: ["Fantasy"],
      },
    };
    expect(isOptionVisible(option, { genre: "Lancer" })).toBe(true);
    expect(isOptionVisible(option, { genre: "Fantasy" })).toBe(false);
    expect(isOptionVisible(option, { genre: false })).toBe(false);
    expect(isOptionVisible({ ...option, visibleWhen: undefined }, {})).toBe(
      true,
    );
    expect(
      isOptionVisible(
        {
          ...option,
          visibleWhen: { optionId: "genre", notValues: ["Lancer"] },
        },
        { genre: "Lancer" },
      ),
    ).toBe(false);
  });
});
