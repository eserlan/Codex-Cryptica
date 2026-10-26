import { describe, expect, it, vi } from "vitest";
import { UIPersistence } from "$lib/stores/ui/persistence";
import { createCharacterDefaults } from "./generator-page-character-defaults";
import { createSettingDefaults } from "./generator-page-setting-defaults";
import { mountGeneratorPage } from "./generator-page-mount";

function options(
  slug: string,
  hubTheme: string | null = null,
  stored: string | null = "pirate",
) {
  const getItem = vi.fn(() => stored);
  return {
    slug,
    hubTheme,
    browser: true,
    persistence: new UIPersistence({
      storage: { getItem, setItem: vi.fn(), removeItem: vi.fn() },
    }),
    forms: {
      ...createSettingDefaults(null),
      ...createCharacterDefaults(slug, { npcContext: "", factionContext: "" }),
    },
    setActiveTheme: vi.fn(),
    applyWorldHandoff: vi.fn(),
    getItem,
  };
}

describe("generator mount reconciliation", () => {
  it("applies settlement choices without overwriting the user's context", () => {
    const opts = options("settlement", "lancer");
    opts.forms.settlement.campaignContext = "The frontier";
    mountGeneratorPage(opts);
    expect(opts.forms.settlement.genre).toBe("Sci-Fi");
    expect(opts.forms.settlement.campaignContext).toBe("The frontier");
    expect(opts.setActiveTheme).toHaveBeenCalledExactlyOnceWith("Lancer");
    expect(opts.getItem).not.toHaveBeenCalled();
  });

  it.each([
    ["nation", "nation"],
    ["social-hub", "socialHub"],
    ["ship-generator", "ship"],
    ["star-system", "starSystem"],
    ["alien-race", "alienRace"],
    ["news-sheet-generator", "newsSheet"],
  ] as const)("applies the %s hub patch", (slug, form) => {
    const opts = options(slug, "cyberpunk");
    mountGeneratorPage(opts);
    expect(opts.forms[form].genre).toBe("Cyberpunk");
    expect(opts.setActiveTheme).toHaveBeenCalled();
    expect(opts.getItem).not.toHaveBeenCalled();
  });

  it("applies a world handoff after genre and visible theme are patched", () => {
    const opts = options("world", "lancer");
    opts.applyWorldHandoff.mockImplementation(() => {
      expect(opts.forms.world.genre).toBe("Lancer");
      expect(opts.setActiveTheme).toHaveBeenCalledWith("Lancer");
      opts.forms.world.dominantFeature = "A gas giant";
    });
    mountGeneratorPage(opts);
    expect(opts.applyWorldHandoff).toHaveBeenCalledOnce();
    expect(opts.forms.world.dominantFeature).toBe("A gas giant");
  });

  it("does not restore stored themes over fixed-slug or compatible language patches", () => {
    const fixed = options("vampire-clan");
    mountGeneratorPage(fixed);
    expect(fixed.setActiveTheme).toHaveBeenCalledExactlyOnceWith(
      "Vampire / Gothic Noir",
    );
    expect(fixed.getItem).not.toHaveBeenCalled();
    const language = options("language-generator", "fantasy");
    mountGeneratorPage(language);
    expect(language.forms.language.genre).toBe("Classic Fantasy");
    expect(language.setActiveTheme).not.toHaveBeenCalled();
    expect(language.getItem).not.toHaveBeenCalled();
  });

  it("restores a stored theme for flat generic pages and incompatible language hubs", () => {
    for (const [slug, hub] of [
      ["npc", null],
      ["language-generator", "western"],
    ]) {
      const opts = options(slug!, hub);
      mountGeneratorPage(opts);
      expect(opts.setActiveTheme).toHaveBeenCalledExactlyOnceWith("Pirate");
    }
  });

  it("ignores invalid saved themes and preserves themed URLs", () => {
    const invalid = options("language-generator", "western", "invalid-theme");
    mountGeneratorPage(invalid);
    expect(invalid.setActiveTheme).not.toHaveBeenCalled();
    const themed = {
      ...options("language-generator", "western"),
      urlHubTheme: "western",
    };
    mountGeneratorPage(themed);
    expect(themed.setActiveTheme).not.toHaveBeenCalled();
    expect(themed.getItem).not.toHaveBeenCalled();
    expect(themed.applyWorldHandoff).not.toHaveBeenCalled();
  });
});
