import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  composeImagePrompt,
  type ComposeImagePromptInput,
} from "./art-direction-composer";
import { ART_CATEGORIES, ART_THEMES } from "./art-direction-catalogue";

/**
 * Golden prompt fixtures.
 *
 * The committed JSON fixture is the contract for composed output. A change
 * there means every generated image shifts, so regenerate it only when the art
 * direction was deliberately revised:
 *
 *   UPDATE_GOLDENS=1 bun test src/art-direction-golden.test.ts
 *
 * Deliberately a plain file comparison rather than `toMatchSnapshot`. This
 * package runs under `bun test`, whose snapshot keys differ from vitest's, so
 * snapshots written by one runner are silently *added* rather than matched by
 * the other — the assertion passes without ever comparing anything.
 *
 * Subjects are descriptive by construction — no fixture may contain a
 * setting-specific proper name.
 */

const GOLDEN_FILE = join(
  import.meta.dirname ?? __dirname,
  "__fixtures__",
  "golden-prompts.json",
);

type GoldenRecord = Record<
  string,
  { prompt: string; negativeTerms: string[]; metadata: unknown }
>;

function readGoldens(): GoldenRecord {
  try {
    return JSON.parse(readFileSync(GOLDEN_FILE, "utf8")) as GoldenRecord;
  } catch {
    return {};
  }
}

const GOLDEN_CASES: Array<{ name: string; input: ComposeImagePromptInput }> = [
  // --- The three worked examples from the reviewed guide -------------------
  {
    name: "character / fantasy",
    input: {
      subject:
        "male human veteran officer, weary expression, scarred obsidian breastplate over a patched wool campaign coat, one gauntlet replaced with mismatched brass plate",
      category: "character",
      theme: "fantasy",
    },
  },
  {
    name: "item / apocalyptic",
    input: {
      subject:
        "hand-cranked water filter built from a fire extinguisher body, hose clamps and bicycle spokes, rust bleeding from every seam",
      category: "item",
      theme: "apocalyptic",
    },
  },
  {
    name: "faction / cyberpunk",
    input: {
      subject:
        "data-broker crew in matched grey longcoats with mismatched cranial ports, splicing a junction box on a flooded service walkway",
      category: "faction",
      theme: "cyberpunk",
    },
  },

  // --- Every remaining category -------------------------------------------
  {
    name: "creature / horror",
    input: {
      subject:
        "long-limbed pale scavenger, wet grey hide stretched over visible ribs, crouched over a splintered crate",
      category: "creature",
      theme: "horror",
    },
  },
  {
    name: "location / scifi",
    input: {
      subject:
        "orbital transfer platform bolted to an asteroid face, exposed conduit runs and a single lit gantry",
      category: "location",
      theme: "scifi",
    },
  },
  {
    name: "event / pulp adventure",
    input: {
      subject:
        "rope bridge giving way beneath a fleeing survey party, crates tumbling into the gorge",
      category: "event",
      theme: "pulp_adventure",
    },
  },
  {
    name: "note / mythic",
    input: {
      subject:
        "carved boundary stone incised with a repeating spiral, offerings of grain arranged at its base",
      category: "note",
      theme: "mythic",
    },
  },
  {
    name: "cover / steampunk",
    input: {
      subject:
        "airship silhouetted against a smoke-choked industrial skyline, mooring towers below",
      category: "cover",
      theme: "steampunk",
    },
  },

  // --- Representative variants and modes ----------------------------------
  {
    name: "character portrait variant / cyberpunk",
    input: {
      subject:
        "middle-aged fixer, subdermal port behind the ear, collar of a worn synthetic jacket turned up",
      category: "character",
      theme: "cyberpunk",
      cameraVariant: "portrait",
    },
  },
  {
    name: "creature anatomy variant / lancer",
    input: {
      subject:
        "armoured quadruped drone, scuffed actuator housing at the shoulder joint",
      category: "creature",
      theme: "lancer",
      cameraVariant: "anatomy",
    },
  },
  {
    name: "faction authority variant / fallout",
    input: {
      subject:
        "checkpoint detail in patched jumpsuits with stencilled unit numbers, sorting salvage into crates",
      category: "faction",
      theme: "fallout",
      cameraVariant: "authority",
    },
  },
  {
    name: "location interior variant / modern",
    input: {
      subject:
        "night shift office with two desks lit and the rest dark, coats still on the chairs",
      category: "location",
      theme: "modern",
      cameraVariant: "interior",
    },
  },
  {
    name: "item in-hand variant / starwars",
    input: {
      subject:
        "scorched multitool with a taped grip, one jaw replaced with a machined substitute",
      category: "item",
      theme: "starwars",
      cameraVariant: "in-hand",
    },
  },
  {
    name: "character / startrek, name-free style reference",
    input: {
      subject:
        "science officer in a division-coded uniform, holding a calibration instrument mid-reading",
      category: "character",
      theme: "startrek",
      styleReferenceMode: "name-free",
    },
  },
  {
    name: "cover / fantasy, style reference disabled",
    input: {
      subject:
        "flooded cathedral nave with a single boat drawn up between the pillars",
      category: "cover",
      theme: "fantasy",
      styleReferenceMode: "disabled",
    },
  },
  {
    name: "event aftermath variant / apocalyptic, optics overrides",
    input: {
      subject:
        "collapsed water tower across a road, silt fanned out where the tank split",
      category: "event",
      theme: "apocalyptic",
      cameraVariant: "aftermath",
      opticsOverrides: { aspectRatio: "2.39:1", lensCharacter: ["grain"] },
    },
  },
];

describe("golden prompts", () => {
  const goldens = readGoldens();

  if (process.env.UPDATE_GOLDENS) {
    const regenerated: GoldenRecord = {};
    for (const { name, input } of GOLDEN_CASES) {
      const result = composeImagePrompt(input);
      regenerated[name] = {
        prompt: result.prompt,
        negativeTerms: result.negativeTerms,
        metadata: result.metadata as unknown,
      };
    }
    writeFileSync(GOLDEN_FILE, `${JSON.stringify(regenerated, null, 2)}\n`);
    Object.assign(goldens, regenerated);
  }

  for (const { name, input } of GOLDEN_CASES) {
    it(`composes ${name}`, () => {
      const result = composeImagePrompt(input);
      const expected = goldens[name];

      expect(
        expected,
        `no golden recorded for "${name}" — run UPDATE_GOLDENS=1`,
      ).toBeDefined();
      expect(result.prompt).toBe(expected.prompt);
      expect(result.negativeTerms).toEqual(expected.negativeTerms);
      expect(JSON.parse(JSON.stringify(result.metadata))).toEqual(
        expected.metadata,
      );
    });
  }

  it("records a golden for every case and no others", () => {
    expect(Object.keys(goldens).sort()).toEqual(
      GOLDEN_CASES.map((c) => c.name).sort(),
    );
  });

  it("covers every catalogue category", () => {
    const covered = new Set(
      GOLDEN_CASES.map((c) => c.input.category).filter(Boolean),
    );
    for (const id of Object.keys(ART_CATEGORIES)) {
      expect(covered.has(id), `no golden case for category ${id}`).toBe(true);
    }
  });

  it("covers every catalogue theme", () => {
    const covered = new Set(
      GOLDEN_CASES.map((c) => c.input.theme).filter(Boolean),
    );
    for (const id of Object.keys(ART_THEMES)) {
      expect(covered.has(id), `no golden case for theme ${id}`).toBe(true);
    }
  });

  it("contains no setting-specific proper names in any fixture subject", () => {
    // A capitalised word mid-sentence that is not a brand/format term is the
    // signature of a leaked proper name.
    const allowed =
      /^(Kodak|Ilford|Fuji|Cinestill|Ektar|Ektachrome|Portra|Velvia|Rembrandt|Union)$/;
    for (const { name, input } of GOLDEN_CASES) {
      const midSentenceCaps =
        input.subject.slice(1).match(/(?<![.!?]\s)\b[A-Z][a-z]{2,}\b/g) || [];
      const leaked = midSentenceCaps.filter((word) => !allowed.test(word));
      expect(leaked, `proper name leaked in ${name}`).toEqual([]);
    }
  });

  it("emits no negative terms inside any composed positive prompt", () => {
    for (const { name, input } of GOLDEN_CASES) {
      const result = composeImagePrompt(input);
      for (const term of result.negativeTerms) {
        // Whole-word match: "texture" in a positive prompt is not the
        // negative term "text".
        const pattern = new RegExp(
          `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i",
        );
        expect(
          pattern.test(result.prompt),
          `negative term "${term}" leaked into ${name}`,
        ).toBe(false);
      }
    }
  });
});
