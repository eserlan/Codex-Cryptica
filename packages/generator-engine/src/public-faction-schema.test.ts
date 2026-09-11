import { describe, expect, it } from "vitest";
import {
  factionConfig,
  nomadClanConfig,
  vampireConfig,
} from "./public-faction-constants";
import {
  buildFactionSchema,
  factionSchema,
  buildNomadClanSchema,
  nomadClanSchema,
  buildVampireSchema,
  vampireSchema,
  selectSmartFactionBase,
  selectSmartFactionResource,
} from "./public-faction-schema";
import {
  FACTION_ALIGNMENT_TRAITS,
  FACTION_CONFLICT_TRAITS,
  FACTION_GOAL_TRAITS,
  FACTION_HOOK_TRAITS,
  FACTION_SCOPE_TRAITS,
  FACTION_TRAIT_VOCABULARY,
  FACTION_TYPE_TRAITS,
  NOMAD_CONFLICT_TRAITS,
  NOMAD_GOAL_TRAITS,
  NOMAD_HOOK_TRAITS,
  NOMAD_ROLE_TRAITS,
  NOMAD_TERRITORY_TRAITS,
  NOMAD_TONE_TRAITS,
  VAMPIRE_ALIGNMENT_TRAITS,
  VAMPIRE_ARCHETYPE_TRAITS,
  VAMPIRE_BLOODLINE_TRAITS,
  VAMPIRE_CONFLICT_TRAITS,
  VAMPIRE_FEEDING_TRAITS,
  VAMPIRE_GOAL_TRAITS,
  VAMPIRE_HOOK_TRAITS,
  VAMPIRE_SCOPE_TRAITS,
  VAMPIRE_WEAKNESS_TRAITS,
} from "./public-faction-traits";
import {
  generateFactionLocal,
  generateNomadClanLocal,
  generateVampireLocal,
} from "./public-faction";
import { resolveSmart, validateSchema } from "./smart";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const THEMES = factionConfig.themes;

describe("faction trait annotations", () => {
  const factionAxes = [
    ["typesByTheme", FACTION_TYPE_TRAITS] as const,
    ["scopesByTheme", FACTION_SCOPE_TRAITS] as const,
    ["goalsByTheme", FACTION_GOAL_TRAITS] as const,
  ];

  for (const [poolKey, traitMap] of factionAxes) {
    it(`annotates every option in ${poolKey}`, () => {
      const pools = factionConfig[poolKey] as Record<string, string[]>;
      const missing: string[] = [];
      for (const theme of THEMES) {
        for (const value of pools[theme] ?? []) {
          if (!traitMap[value]) missing.push(`${theme}: ${value}`);
        }
      }
      expect(missing).toEqual([]);
    });
  }

  it("annotates every standard faction alignment, conflict, and hook", () => {
    for (const align of factionConfig.alignments) {
      expect(FACTION_ALIGNMENT_TRAITS[align]).toBeDefined();
    }
    for (const conflict of factionConfig.conflicts) {
      expect(FACTION_CONFLICT_TRAITS[conflict]).toBeDefined();
    }
    for (const hook of factionConfig.hooks) {
      expect(FACTION_HOOK_TRAITS[hook]).toBeDefined();
    }
  });

  it("annotates every nomad clan option", () => {
    for (const role of nomadClanConfig.roles) {
      expect(NOMAD_ROLE_TRAITS[role]).toBeDefined();
    }
    for (const tone of nomadClanConfig.tones) {
      expect(NOMAD_TONE_TRAITS[tone]).toBeDefined();
    }
    for (const territory of nomadClanConfig.territories) {
      expect(NOMAD_TERRITORY_TRAITS[territory]).toBeDefined();
    }
    for (const conflict of nomadClanConfig.conflicts) {
      expect(NOMAD_CONFLICT_TRAITS[conflict]).toBeDefined();
    }
    for (const goal of nomadClanConfig.goals) {
      expect(NOMAD_GOAL_TRAITS[goal]).toBeDefined();
    }
    for (const hook of nomadClanConfig.hooks) {
      expect(NOMAD_HOOK_TRAITS[hook]).toBeDefined();
    }
  });

  it("annotates every vampire clan option", () => {
    for (const archetype of vampireConfig.archetypes) {
      expect(VAMPIRE_ARCHETYPE_TRAITS[archetype]).toBeDefined();
    }
    for (const bloodline of vampireConfig.bloodlines) {
      expect(VAMPIRE_BLOODLINE_TRAITS[bloodline]).toBeDefined();
    }
    for (const feeding of vampireConfig.feedingHabits) {
      expect(VAMPIRE_FEEDING_TRAITS[feeding]).toBeDefined();
    }
    for (const weakness of vampireConfig.weaknesses) {
      expect(VAMPIRE_WEAKNESS_TRAITS[weakness]).toBeDefined();
    }
    for (const scope of vampireConfig.scopes) {
      expect(VAMPIRE_SCOPE_TRAITS[scope]).toBeDefined();
    }
    for (const align of vampireConfig.alignments) {
      expect(VAMPIRE_ALIGNMENT_TRAITS[align]).toBeDefined();
    }
    for (const goal of vampireConfig.goals) {
      expect(VAMPIRE_GOAL_TRAITS[goal]).toBeDefined();
    }
    for (const conflict of vampireConfig.conflicts) {
      expect(VAMPIRE_CONFLICT_TRAITS[conflict]).toBeDefined();
    }
    for (const hook of vampireConfig.hooks) {
      expect(VAMPIRE_HOOK_TRAITS[hook]).toBeDefined();
    }
  });

  it("uses only vocabulary traits across all maps", () => {
    const vocabulary = new Set<string>(FACTION_TRAIT_VOCABULARY);
    const allMaps = [
      FACTION_TYPE_TRAITS,
      FACTION_SCOPE_TRAITS,
      FACTION_ALIGNMENT_TRAITS,
      FACTION_GOAL_TRAITS,
      FACTION_CONFLICT_TRAITS,
      FACTION_HOOK_TRAITS,
      NOMAD_ROLE_TRAITS,
      NOMAD_TONE_TRAITS,
      NOMAD_TERRITORY_TRAITS,
      NOMAD_CONFLICT_TRAITS,
      NOMAD_GOAL_TRAITS,
      NOMAD_HOOK_TRAITS,
      VAMPIRE_ARCHETYPE_TRAITS,
      VAMPIRE_BLOODLINE_TRAITS,
      VAMPIRE_FEEDING_TRAITS,
      VAMPIRE_WEAKNESS_TRAITS,
      VAMPIRE_SCOPE_TRAITS,
      VAMPIRE_ALIGNMENT_TRAITS,
      VAMPIRE_GOAL_TRAITS,
      VAMPIRE_CONFLICT_TRAITS,
      VAMPIRE_HOOK_TRAITS,
    ];

    const strays: string[] = [];
    for (const map of allMaps) {
      for (const [value, traits] of Object.entries(map)) {
        for (const trait of traits) {
          if (!vocabulary.has(trait)) strays.push(`${value}: ${trait}`);
        }
      }
    }
    expect(strays).toEqual([]);
  });

  it("gives every annotated option at least one trait", () => {
    const allMaps = [
      FACTION_TYPE_TRAITS,
      FACTION_SCOPE_TRAITS,
      FACTION_ALIGNMENT_TRAITS,
      FACTION_GOAL_TRAITS,
      FACTION_CONFLICT_TRAITS,
      FACTION_HOOK_TRAITS,
      NOMAD_ROLE_TRAITS,
      NOMAD_TONE_TRAITS,
      NOMAD_TERRITORY_TRAITS,
      NOMAD_CONFLICT_TRAITS,
      NOMAD_GOAL_TRAITS,
      NOMAD_HOOK_TRAITS,
      VAMPIRE_ARCHETYPE_TRAITS,
      VAMPIRE_BLOODLINE_TRAITS,
      VAMPIRE_FEEDING_TRAITS,
      VAMPIRE_WEAKNESS_TRAITS,
      VAMPIRE_SCOPE_TRAITS,
      VAMPIRE_ALIGNMENT_TRAITS,
      VAMPIRE_GOAL_TRAITS,
      VAMPIRE_CONFLICT_TRAITS,
      VAMPIRE_HOOK_TRAITS,
    ];

    const empty: string[] = [];
    for (const map of allMaps) {
      for (const [value, traits] of Object.entries(map)) {
        if (traits.length === 0) empty.push(value);
      }
    }
    expect(empty).toEqual([]);
  });
});

describe("factionSchemas", () => {
  it("resolves faction axes in causal order", () => {
    expect(factionSchema.axes.map((a) => a.id)).toEqual([
      "factionType",
      "scope",
      "alignment",
      "goal",
      "conflict",
      "hook",
    ]);
  });

  it("resolves nomad clan axes in causal order", () => {
    expect(nomadClanSchema.axes.map((a) => a.id)).toEqual([
      "role",
      "territory",
      "tone",
      "goal",
      "conflict",
      "hook",
    ]);
  });

  it("resolves vampire clan axes in causal order", () => {
    expect(vampireSchema.axes.map((a) => a.id)).toEqual([
      "archetype",
      "bloodline",
      "scope",
      "feedingHabit",
      "weakness",
      "alignment",
      "goal",
      "conflict",
      "hook",
    ]);
  });

  it("has no forward references in any faction schema", () => {
    expect(validateSchema(buildFactionSchema())).toEqual([]);
    expect(validateSchema(buildNomadClanSchema())).toEqual([]);
    expect(validateSchema(buildVampireSchema())).toEqual([]);
  });

  it("resolves every faction theme without ever relaxing a constraint", () => {
    const rng = seededRng(2026);
    const relaxed: string[] = [];
    for (const genre of THEMES) {
      for (let i = 0; i < 200; i++) {
        const result = resolveSmart(factionSchema, { genre }, rng);
        for (const relaxation of result.relaxations) {
          relaxed.push(`${genre}/${relaxation.axisId}/${relaxation.dropped}`);
        }
      }
    }
    expect([...new Set(relaxed)]).toEqual([]);
  });

  it("resolves nomad clan without ever relaxing a constraint", () => {
    const rng = seededRng(2026);
    const relaxed: string[] = [];
    for (let i = 0; i < 200; i++) {
      const result = resolveSmart(
        nomadClanSchema,
        { genre: "Cyberpunk / Corporate" },
        rng,
      );
      for (const relaxation of result.relaxations) {
        relaxed.push(`${relaxation.axisId}/${relaxation.dropped}`);
      }
    }
    expect(relaxed).toEqual([]);
  });

  it("resolves vampire clan without ever relaxing a constraint", () => {
    const rng = seededRng(2026);
    const relaxed: string[] = [];
    for (let i = 0; i < 200; i++) {
      const result = resolveSmart(
        vampireSchema,
        { genre: "Vampire / Gothic Noir" },
        rng,
      );
      for (const relaxation of result.relaxations) {
        relaxed.push(`${relaxation.axisId}/${relaxation.dropped}`);
      }
    }
    expect(relaxed).toEqual([]);
  });

  it("gives every theme a full set of resolved values", () => {
    const rng = seededRng(7);
    for (const genre of THEMES) {
      const { values } = resolveSmart(factionSchema, { genre }, rng);
      for (const axis of factionSchema.axes) {
        expect(values[axis.id]).toBeTruthy();
      }
    }
  });
});

describe("smart faction generation coherence", () => {
  it("generates compatible local factions across different seeds", () => {
    const rng = seededRng(42);
    for (let i = 0; i < 20; i++) {
      const out = generateFactionLocal({ theme: "Classic Fantasy" }, rng);
      expect(out.content).toContain("### What they control");
      expect(out.content).toContain("### What they want");
      expect(out.content).toContain("### Why they are dangerous");
      expect(out.lore).toContain("### At a Glance");
      expect(out.title).toBeTruthy();
    }
  });

  it("generates compatible local nomad clans across different seeds", () => {
    const rng = seededRng(42);
    for (let i = 0; i < 20; i++) {
      const out = generateNomadClanLocal({}, rng);
      expect(out.content).toContain("### Who they are");
      expect(out.content).toContain("### How they survive");
      expect(out.lore).toContain("### Clan Profile");
      expect(out.title).toBeTruthy();
    }
  });

  it("generates compatible local vampire clans across different seeds", () => {
    const rng = seededRng(42);
    for (let i = 0; i < 20; i++) {
      const out = generateVampireLocal({}, rng);
      expect(out.content).toContain("### Overview");
      expect(out.lore).toContain("### GM Reference Information");
      expect(out.title).toBeTruthy();
    }
  });

  it("selects base and resource consistent with traits", () => {
    const rng = seededRng(10);
    const base = selectSmartFactionBase("Pirate Crew", ["maritime"], rng);
    expect(base).toBeTruthy();
    const res = selectSmartFactionResource(
      "Merchant Guild",
      ["trade", "wealth"],
      rng,
    );
    expect(res).toBeTruthy();
  });
});
