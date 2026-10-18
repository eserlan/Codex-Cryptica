import { describe, it, expect } from "vitest";
import {
  BFRD_MANIFEST,
  RulesSourceManifestSchema,
  TOV_5E_DIFFERENCES,
  CONTENT_BOUNDARIES,
  TOV_HERO_LEVEL_1_FIXTURE,
  TOV_CAVE_GOBLIN_FIXTURE,
  TOV_LUCK_FIXTURE,
} from "../../src/rules-sources";

describe("BFRD Rules Source Manifest & Licensing (#3942)", () => {
  it("validates that BFRD_MANIFEST adheres to the strict manifest schema", () => {
    const validated = RulesSourceManifestSchema.parse(BFRD_MANIFEST);
    expect(validated.id).toBe("bfrd");
    expect(validated.version).toBe("1.0.0");
    expect(validated.license).toBe("CC-BY-4.0");
    expect(validated.publisher).toContain("Kobold Press");
    expect(validated.repositoryUrl).toBe(
      "https://github.com/koboldpress/black-flag",
    );
  });

  it("verifies mandatory attribution and upstream SRD notices are present", () => {
    expect(BFRD_MANIFEST.attributionNotice).toContain("Kobold Press");
    expect(BFRD_MANIFEST.attributionNotice).toContain("CC BY 4.0");

    expect(BFRD_MANIFEST.upstreamSources).toHaveLength(1);
    const upstream = BFRD_MANIFEST.upstreamSources[0];
    expect(upstream.name).toContain("System Reference Document 5.1");
    expect(upstream.publisher).toContain("Wizards of the Coast");
    expect(upstream.license).toBe("CC-BY-4.0");
  });

  it("enforces explicit trademark and logo guardrails", () => {
    expect(BFRD_MANIFEST.trademarkGuidance).toContain("Tales of the Valiant");
    expect(BFRD_MANIFEST.trademarkGuidance).toContain("Compatibility");
  });

  it("fails visibly when required provenance fields are omitted or malformed", () => {
    expect(() =>
      RulesSourceManifestSchema.parse({
        ...BFRD_MANIFEST,
        attributionNotice: "", // Invalid: empty string
      }),
    ).toThrow();

    expect(() =>
      RulesSourceManifestSchema.parse({
        ...BFRD_MANIFEST,
        releaseDate: "invalid-date-format",
      }),
    ).toThrow();
  });

  it("documents verified mechanical differences between ToV and 5e", () => {
    const categories = TOV_5E_DIFFERENCES.map((d) => d.category);
    expect(categories).toContain("Identity");
    expect(categories).toContain("Resources");
    expect(categories).toContain("Character Customization");
    expect(categories).toContain("Adversaries & GM Mechanics");

    const luckDiff = TOV_5E_DIFFERENCES.find((d) =>
      d.tovConcept.includes("Luck"),
    );
    expect(luckDiff).toBeDefined();
    expect(luckDiff?.differenceDescription).toContain(
      "Gained when a d20 roll fails",
    );

    const doomDiff = TOV_5E_DIFFERENCES.find((d) =>
      d.tovConcept.includes("Doom"),
    );
    expect(doomDiff).toBeDefined();
    expect(doomDiff?.differenceDescription).toContain(
      "optional BFRD Doom rule gives the GM a CR-based resource pool at the start of an encounter",
    );
    expect(doomDiff?.differenceDescription).toContain(
      "giving a creature advantage on an attack, giving a PC disadvantage on a save, or once per encounter refreshing, recharging, or gaining one additional use of a limited-use feature",
    );
    expect(doomDiff?.impactOnCodexCryptica).toContain(
      "per-creature Doom counter to track allocations from the encounter pool",
    );
  });

  it("defines explicit proprietary content boundaries", () => {
    expect(CONTENT_BOUNDARIES.strictlyExcludedProprietaryContent).toContain(
      "Proprietary setting lore (Midgard, Southlands, Margreve, Scarlet Citadel)",
    );
    expect(CONTENT_BOUNDARIES.licensedUnderBFRD).toContain(
      "Luck pool, earn mechanics, spend rules, and long rest reset",
    );
  });
});

describe("ToV Mechanical Fixtures (#3942)", () => {
  it("provides an independently verified Level 1 Hero fixture with Lineage, Heritage, and Luck", () => {
    const hero = TOV_HERO_LEVEL_1_FIXTURE;
    expect(hero.system).toBe("tales-of-the-valiant");
    expect(hero.lineage).toBe("Human");
    expect(hero.heritage).toBe("Cloudborn");
    expect(hero.class).toBe("Fighter");
    expect(hero.level).toBe(1);
    expect(hero.armorClass).toBe(16);
    expect(hero.hitPoints.current).toBe(12);
    expect(hero.luck.current).toBe(3);
    expect(hero.luck.max).toBe(5);
    expect(hero.attacks.length).toBeGreaterThan(0);
    expect(hero.attacks[0].name).toBe("Longsword");
  });

  it("provides an independently verified Cave Goblin creature fixture", () => {
    const creature = TOV_CAVE_GOBLIN_FIXTURE;
    expect(creature.system).toBe("tales-of-the-valiant");
    expect(creature.name).toBe("Cave Goblin");
    expect(creature.challengeRating).toBe("1/4");
    expect(creature.actions.some((a) => a.name === "Scimitar")).toBe(true);
    expect(creature.bonusActions?.some((b) => b.name === "Nimble Escape")).toBe(
      true,
    );
  });

  it("provides Luck mechanics specifications with verified test scenarios", () => {
    const luck = TOV_LUCK_FIXTURE;
    expect(luck.min).toBe(0);
    expect(luck.defaultMax).toBe(5);

    // Verify scenario: earn on failure increases luck up to cap
    const earnScenario = luck.scenarios.find(
      (s) => s.action === "earn_on_failure",
    );
    expect(earnScenario).toBeDefined();
    expect(earnScenario!.startingLuck + earnScenario!.amount).toBe(
      earnScenario!.expectedLuck,
    );

    // Verify scenario: cap overflow is bounded by maximum
    const capScenario = luck.scenarios.find((s) => s.action === "cap_overflow");
    expect(capScenario).toBeDefined();
    expect(capScenario!.expectedLuck).toBe(luck.defaultMax);
  });
});
