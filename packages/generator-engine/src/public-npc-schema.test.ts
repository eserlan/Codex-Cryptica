import { describe, expect, it } from "vitest";
import { npcConfig, npcThemeConfig, DELVE_ROLES } from "./public-npc-constants";
import {
  buildNpcSchema,
  LOCAL_MANNERISMS,
  LOCAL_FACTION_STANCES,
  LOCAL_LEVERAGE_PRICES,
} from "./public-npc-schema";
import {
  NPC_ANCESTRY_TRAITS,
  NPC_ROLE_TRAITS,
  NPC_ALIGNMENT_TRAITS,
  NPC_MANNERISM_TRAITS,
  NPC_FACTION_STANCE_TRAITS,
  NPC_LEVERAGE_TRAITS,
  NPC_TRAIT_VOCABULARY,
} from "./public-npc-traits";
import { NPC_PRESETS } from "./public-npc-presets";
import { resolveSmart, validateSchema, applyPreset } from "./smart";
import { generateNpcLocal, resolveNpc } from "./public-npc";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const THEMES = Object.keys(npcThemeConfig.ancestries);

describe("npc trait annotations", () => {
  it("uses only traits from the closed vocabulary", () => {
    const vocab = new Set(NPC_TRAIT_VOCABULARY);
    const maps = [
      NPC_ANCESTRY_TRAITS,
      NPC_ROLE_TRAITS,
      NPC_ALIGNMENT_TRAITS,
      NPC_MANNERISM_TRAITS,
      NPC_FACTION_STANCE_TRAITS,
      NPC_LEVERAGE_TRAITS,
    ];
    for (const map of maps) {
      for (const [key, traits] of Object.entries(map)) {
        for (const trait of traits) {
          expect(
            vocab.has(trait),
            `Unknown trait '${trait}' in entry '${key}'`,
          ).toBe(true);
        }
      }
    }
  });

  it("annotates every ancestry across all themes and standard races", () => {
    for (const race of npcConfig.races) {
      expect(NPC_ANCESTRY_TRAITS[race]).toBeDefined();
    }
    for (const theme of THEMES) {
      for (const ancestry of npcThemeConfig.ancestries[theme] ?? []) {
        expect(
          NPC_ANCESTRY_TRAITS[ancestry],
          `Missing ancestry trait annotation for '${theme} -> ${ancestry}'`,
        ).toBeDefined();
      }
    }
  });

  it("annotates every role across all themes, base roles, and delve roles", () => {
    for (const role of npcConfig.roles) {
      expect(NPC_ROLE_TRAITS[role]).toBeDefined();
    }
    for (const theme of THEMES) {
      for (const role of npcThemeConfig.roles[theme] ?? []) {
        expect(
          NPC_ROLE_TRAITS[role],
          `Missing role trait annotation for '${theme} -> ${role}'`,
        ).toBeDefined();
      }
    }
    for (const role of DELVE_ROLES) {
      expect(
        NPC_ROLE_TRAITS[role],
        `Missing delve role trait annotation for '${role}'`,
      ).toBeDefined();
    }
  });

  it("annotates every standard alignment and theme-specific morality", () => {
    for (const alignment of npcConfig.alignments) {
      expect(NPC_ALIGNMENT_TRAITS[alignment]).toBeDefined();
    }
    for (const theme of THEMES) {
      for (const morality of npcThemeConfig.moralities[theme] ?? []) {
        expect(
          NPC_ALIGNMENT_TRAITS[morality.id],
          `Missing morality trait annotation for '${theme} -> ${morality.id}'`,
        ).toBeDefined();
      }
    }
  });

  it("annotates all local mannerisms, faction stances, and leverage prices", () => {
    for (const mannerism of LOCAL_MANNERISMS) {
      expect(NPC_MANNERISM_TRAITS[mannerism]).toBeDefined();
    }
    for (const stance of LOCAL_FACTION_STANCES) {
      expect(NPC_FACTION_STANCE_TRAITS[stance]).toBeDefined();
    }
    for (const leverage of LOCAL_LEVERAGE_PRICES) {
      expect(NPC_LEVERAGE_TRAITS[leverage]).toBeDefined();
    }
  });
});

describe("npc schema validation", () => {
  it("builds a valid schema without delve", () => {
    const schema = buildNpcSchema(false);
    expect(validateSchema(schema)).toEqual([]);
  });

  it("builds a valid schema with delve", () => {
    const schema = buildNpcSchema(true);
    expect(validateSchema(schema)).toEqual([]);
  });
});

describe("npc generation relaxation and coherence", () => {
  it("never relaxes any constraint across all themes and seeds", () => {
    const schema = buildNpcSchema(false);
    for (const theme of THEMES) {
      for (let seed = 1; seed <= 30; seed++) {
        const result = resolveSmart(
          schema,
          { genre: theme },
          seededRng(seed * 71),
        );
        expect(
          result.relaxations,
          `Relaxation occurred for theme '${theme}' on seed ${seed}`,
        ).toEqual([]);
      }
    }
  });

  it("produces coherent mannerisms for highborn vs underclass roles", () => {
    const nobleRes = resolveNpc(
      { theme: "Classic Fantasy", role: "Noble" },
      seededRng(42),
    );
    expect(nobleRes.role).toBe("Noble");
    // Noble should never have rough/underclass mannerism
    expect(nobleRes.mannerism).not.toContain("gravelly whisper");

    const rogueRes = resolveNpc(
      { theme: "Classic Fantasy", role: "Rogue" },
      seededRng(19),
    );
    expect(rogueRes.role).toBe("Rogue");
  });

  it("supports delve context resolution cleanly", () => {
    const delveRes = resolveNpc(
      { delveContext: "Sunken Crypt of the Lich Queen" },
      seededRng(10),
    );
    expect(delveRes.isDelve).toBe(true);
    expect(DELVE_ROLES.has(delveRes.role)).toBe(true);
  });
});

describe("npc presets", () => {
  it("applies curated presets without constraint relaxation", () => {
    const schema = buildNpcSchema(false);
    for (const preset of NPC_PRESETS) {
      const config = applyPreset({ genre: preset.genres[0] }, preset);
      const result = resolveSmart(schema, config, seededRng(123));
      expect(result.relaxations).toEqual([]);
      for (const [key, expectedValue] of Object.entries(preset.set)) {
        expect(result.values[key]).toBe(expectedValue);
      }
    }
  });
});

describe("generateNpcLocal smart integration", () => {
  it("returns a complete PublicGeneratorOutput with all four sections and lore", () => {
    const output = generateNpcLocal(
      { theme: "Cyberpunk / Corporate" },
      seededRng(5),
    );
    expect(output.type).toBe("character");
    expect(output.content).toContain("### Who they are");
    expect(output.content).toContain("### What they want");
    expect(output.content).toContain("### Why they are useful");
    expect(output.content).toContain("### How to use them at the table");
    expect(output.lore).toContain("### At a Glance");
    expect(output.lore).toContain("- **Mannerism / Vocal Tell**:");
    expect(output.lore).toContain("- **Moral Stance**:");
  });
});
