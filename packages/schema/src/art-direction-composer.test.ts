import { describe, expect, it } from "vitest";
import {
  ART_DIRECTION_VERSION,
  MAX_ACTIVE_STYLE_REFERENCES,
  composeImagePrompt,
} from "./art-direction-composer";
import {
  ART_CATEGORIES,
  ART_THEMES,
  composeThemeLayer,
  FACTION_BLUEPRINTS,
  getFactionBlueprint,
  resolveCategoryId,
  resolveThemeId,
} from "./art-direction-catalogue";
import {
  CATEGORY_NEGATIVE_PROMPTS,
  FIGURE_NEGATIVE_PROMPT,
  UNIVERSAL_NEGATIVE_PROMPT,
  composeNegativeTerms,
} from "./art-direction-negatives";
import {
  ASPECT_RATIO_DIMENSIONS,
  ASPECT_RATIO_PHRASES,
  formatOptics,
  mergeOptics,
  validateOptics,
} from "./art-direction-optics";
import {
  ART_STATURES,
  resolveStatureFromLabels,
  resolveStatureId,
} from "./art-direction-stature";
import { prepareSubject } from "./art-direction-subject";

const REQUIRED_CATEGORIES = [
  "character",
  "creature",
  "location",
  "item",
  "faction",
  "event",
  "note",
  "cover",
];

const REQUIRED_THEMES = [
  "fantasy",
  "scifi",
  "cyberpunk",
  "modern",
  "apocalyptic",
  "horror",
  "steampunk",
  "mythic",
  "pulp_adventure",
  "fallout",
  "starwars",
  "startrek",
  "lancer",
];

describe("catalogue", () => {
  it("ships every reviewed category with a camera and negatives", () => {
    for (const id of REQUIRED_CATEGORIES) {
      const category = ART_CATEGORIES[id];
      expect(category, `missing category ${id}`).toBeDefined();
      expect(category.prompt.length).toBeGreaterThan(40);
      expect(category.defaultCamera.id).toContain("optics.");
      expect(category.negativePrompt.length).toBeGreaterThan(0);
    }
  });

  it("ships every reviewed theme with a name-free fallback", () => {
    for (const id of REQUIRED_THEMES) {
      const theme = ART_THEMES[id];
      expect(theme, `missing theme ${id}`).toBeDefined();
      expect(theme.medium.length).toBeGreaterThan(10);
      expect(theme.palette.length).toBeGreaterThan(10);
      expect(theme.lighting.length).toBeGreaterThan(5);
      expect(theme.craftMaterials.length).toBeGreaterThan(10);
      expect(theme.terrainMaterials.length).toBeGreaterThan(10);
      expect(theme.exaltedMaterials.length).toBeGreaterThan(10);
      expect(theme.exaltedPalette.length).toBeGreaterThan(10);
      expect(theme.nameFreeFallback.trim()).not.toBe("");
    }
  });

  it("keeps category prompts free of medium and palette language", () => {
    // Categories own framing only; themes own how it is rendered.
    for (const id of REQUIRED_CATEGORIES) {
      expect(ART_CATEGORIES[id].prompt).not.toMatch(
        /\b(oil painting|gouache|tempera|palette of|film grain)\b/i,
      );
    }
  });

  it("keeps camera language out of theme layers", () => {
    // Themes own how a shot is rendered; the optics layer owns how it is shot.
    // "35mm photography" is a medium and stays; a lens, an aperture, or a shot
    // size is camera direction and belongs in the optics layer, where an
    // override can reach it. Two themes also carry a composition bias that is
    // inseparable from the style (mythic's hierarchical scale, pulp's diagonal
    // action layout), which is why this checks camera terms and not framing.
    for (const id of REQUIRED_THEMES) {
      expect(composeThemeLayer(ART_THEMES[id]), id).not.toMatch(
        /\b(\d+mm lens|f\/\d|close-up shot|wide shot|full-body shot)\b/i,
      );
    }
  });

  it("maps every aspect ratio to renderable dimensions", () => {
    for (const [ratio, phrase] of Object.entries(ASPECT_RATIO_PHRASES)) {
      const dimensions =
        ASPECT_RATIO_DIMENSIONS[ratio as keyof typeof ASPECT_RATIO_DIMENSIONS];
      expect(dimensions, `${ratio} has no dimensions`).toBeDefined();
      // Diffusion models are trained on multiples of 64.
      expect(dimensions.width % 64, ratio).toBe(0);
      expect(dimensions.height % 64, ratio).toBe(0);
      // Portrait phrasing must not ship landscape pixels, and vice versa.
      const isPortrait = /portrait/.test(phrase);
      expect(dimensions.height > dimensions.width, ratio).toBe(isPortrait);
    }
  });

  it("resolves theme aliases and light/dark suffixes", () => {
    expect(resolveThemeId("post-apocalyptic")).toBe("apocalyptic");
    expect(resolveThemeId("post_apocalyptic")).toBe("apocalyptic");
    expect(resolveThemeId("gothic-horror")).toBe("horror");
    expect(resolveThemeId("gothic_horror")).toBe("horror");
    expect(resolveThemeId("pulp-adventure")).toBe("pulp_adventure");
    expect(resolveThemeId("scifi_light")).toBe("scifi");
    expect(resolveThemeId("fantasy-dark")).toBe("fantasy");
    expect(resolveThemeId("sci-fi")).toBe("scifi");
    expect(resolveThemeId("workspace")).toBeUndefined();
  });

  it("resolves category aliases", () => {
    expect(resolveCategoryId("npc")).toBe("character");
    expect(resolveCategoryId("place")).toBe("location");
    expect(resolveCategoryId("artifact")).toBe("item");
    expect(resolveCategoryId("world")).toBe("cover");
    expect(resolveCategoryId("nonsense")).toBeUndefined();
  });

  it("ships a faction blueprint for every reviewed theme", () => {
    for (const id of REQUIRED_THEMES) {
      const blueprint = FACTION_BLUEPRINTS[id];
      expect(blueprint, `missing faction blueprint ${id}`).toBeDefined();
      expect(blueprint.moments.length).toBeGreaterThanOrEqual(3);
      expect(blueprint.signals.trim()).not.toBe("");
    }
  });

  it("does not imitate named living artists", () => {
    const shipped = [
      ...Object.values(ART_CATEGORIES).map((c) => c.prompt),
      ...Object.values(ART_THEMES).map((t) => composeThemeLayer(t)),
      ...Object.values(ART_THEMES).flatMap((t) => t.styleReferences || []),
      ...Object.values(ART_THEMES).map((t) => t.nameFreeFallback),
    ].join("\n");

    expect(shipped).not.toMatch(
      /\b(by artgerm|by greg rutkowski|by loish|by sakimichan|by beeple|mcquarrie)\b/i,
    );
  });
});

describe("negative prompt library", () => {
  it("merges universal, figure, and category blocks in order", () => {
    const terms = composeNegativeTerms("character", { figureInFrame: true });
    expect(terms.slice(0, UNIVERSAL_NEGATIVE_PROMPT.length)).toEqual([
      ...UNIVERSAL_NEGATIVE_PROMPT,
    ]);
    expect(terms).toContain("extra fingers");
    expect(terms).toContain("stiff A-pose");
    expect(terms).toContain("hidden hands");
  });

  it("omits anatomy negatives when no figure is in frame", () => {
    const terms = composeNegativeTerms("location");
    for (const anatomy of FIGURE_NEGATIVE_PROMPT) {
      expect(terms, `${anatomy} should not apply to a landscape`).not.toContain(
        anatomy,
      );
    }
    expect(terms).toContain("empty stage");
    expect(terms).toContain("watermark");
  });

  it("deduplicates terms shared between the general and category blocks", () => {
    const terms = composeNegativeTerms("cover");
    // "generated text" and the general "text" are distinct; neither repeats.
    expect(new Set(terms).size).toBe(terms.length);
  });

  it("returns only the universal block for an unknown category", () => {
    expect(composeNegativeTerms("unknown")).toEqual([
      ...UNIVERSAL_NEGATIVE_PROMPT,
    ]);
    expect(composeNegativeTerms()).toEqual([...UNIVERSAL_NEGATIVE_PROMPT]);
  });

  it("covers every reviewed category", () => {
    for (const id of REQUIRED_CATEGORIES) {
      expect(CATEGORY_NEGATIVE_PROMPTS[id]?.length).toBeGreaterThan(0);
    }
  });
});

describe("optics toolkit", () => {
  it("renders structured presets in a fixed order", () => {
    expect(
      formatOptics({
        id: "test",
        shotSize: "full",
        focalLength: "85mm",
        aperture: "f/4",
        angle: "eye-level",
        aspectRatio: "3:2",
      }),
    ).toBe(
      "full-length shot with headroom, 85mm lens, f/4, moderate depth of field, eye-level angle, 3:2 landscape framing",
    );
  });

  it("omits absent fields without leaving separators", () => {
    expect(formatOptics({ id: "test", focalLength: "50mm" })).toBe("50mm lens");
    expect(formatOptics({ id: "test" })).toBe("");
    expect(formatOptics()).toBe("");
  });

  it("applies overrides without discarding untouched fields", () => {
    const merged = mergeOptics(
      { id: "base", focalLength: "85mm", aperture: "f/4", angle: "eye-level" },
      { aperture: "f/1.8" },
    );
    expect(merged).toEqual({
      id: "base",
      focalLength: "85mm",
      aperture: "f/1.8",
      angle: "eye-level",
    });
  });

  it("ignores undefined overrides", () => {
    const base = { id: "base", focalLength: "85mm" as const };
    expect(mergeOptics(base, { aperture: undefined })).toEqual(base);
    expect(mergeOptics(base)).toBe(base);
  });

  it("warns on contradictory optics", () => {
    const codes = validateOptics({
      id: "test",
      aperture: "f/16",
      lensCharacter: ["shallow-depth"],
    }).map((w) => w.code);
    expect(codes).toContain("aperture-depth-conflict");

    const overload = validateOptics({
      id: "test",
      lensCharacter: ["bokeh", "vignette", "grain", "halation", "light-leak"],
    }).map((w) => w.code);
    expect(overload).toContain("lens-character-overload");
  });
});

describe("subject preparation", () => {
  it("removes a proper name and repairs the appositive", () => {
    const result = prepareSubject(
      "Valerius, a weary veteran officer in a patched wool campaign coat",
      { names: ["Valerius"] },
    );
    expect(result.subject).toBe(
      "weary veteran officer in a patched wool campaign coat",
    );
    expect(result.removedNames).toEqual(["Valerius"]);
  });

  it("substitutes a descriptor when stripping leaves nothing behind", () => {
    const result = prepareSubject("Valerius", {
      names: ["Valerius"],
      descriptor: "male human veteran officer",
    });
    expect(result.subject).toBe("male human veteran officer");
    expect(result.usedDescriptor).toBe(true);
  });

  it("prepends a descriptor when the remainder is a dangling modifier", () => {
    const result = prepareSubject(
      "The Ninth Signal wearing matched grey longcoats",
      {
        names: ["The Ninth Signal"],
        descriptor: "cyberpunk data-broker crew",
      },
    );
    expect(result.subject).toBe(
      "cyberpunk data-broker crew wearing matched grey longcoats",
    );
  });

  it("strips individual words of a multi-word name", () => {
    const result = prepareSubject(
      "Blackfang Keep at dusk, narrow towers above the Blackfang cliffs",
      {
        names: ["Blackfang Keep"],
        descriptor: "weathered basalt border fortress",
      },
    );
    expect(result.subject).not.toMatch(/blackfang/i);
    expect(result.subject).toContain("narrow towers");
  });

  it("leaves common nouns inside a title alone", () => {
    // "Keep" is a common noun; removing it everywhere would damage prose.
    const result = prepareSubject("stone keep with a collapsed gate", {
      names: ["Blackfang Keep"],
    });
    expect(result.subject).toBe("stone keep with a collapsed gate");
    expect(result.removedNames).toEqual([]);
  });

  it("removes filler terms that carry no visual information", () => {
    const result = prepareSubject(
      "epic hyperdetailed masterpiece iron gauntlet, trending on ArtStation",
    );
    expect(result.subject).toBe("iron gauntlet");
  });

  it("preserves ordinary capitalisation and grammar", () => {
    const result = prepareSubject(
      "male human veteran officer, scarred obsidian breastplate over a patched wool coat",
      { names: ["Valerius"] },
    );
    expect(result.subject).toBe(
      "male human veteran officer, scarred obsidian breastplate over a patched wool coat",
    );
  });

  it("matches names case-insensitively but only on word boundaries", () => {
    const result = prepareSubject("mara holding a marbled stone tablet", {
      names: ["Mara"],
      descriptor: "young courier",
    });
    expect(result.subject).toContain("marbled stone tablet");
    expect(result.subject).not.toMatch(/\bmara\b/i);
  });
});

describe("composeImagePrompt", () => {
  const base = {
    subject: "weary veteran officer in a patched wool campaign coat",
    category: "character",
    theme: "fantasy",
  };

  it("orders layers subject, category, theme, camera, style reference", () => {
    const { prompt, layers } = composeImagePrompt(base);

    const indexes = [
      prompt.indexOf(layers.subject),
      prompt.indexOf(layers.category.slice(0, 30)),
      prompt.indexOf(layers.theme.slice(0, 30)),
      prompt.indexOf(layers.camera.slice(0, 30)),
      prompt.indexOf(layers.styleReference.slice(0, 20)),
    ];

    expect(indexes[0]).toBe(0);
    for (let i = 1; i < indexes.length; i++) {
      expect(indexes[i]).toBeGreaterThan(indexes[i - 1]);
    }
  });

  it("is deterministic for identical inputs", () => {
    expect(composeImagePrompt(base)).toEqual(composeImagePrompt(base));
  });

  it("omits empty layers cleanly", () => {
    const result = composeImagePrompt({
      subject: "a cracked lacquer box",
      category: "item",
      includeCamera: false,
    });
    expect(result.layers.theme).toBe("");
    expect(result.layers.camera).toBe("");
    expect(result.prompt).not.toContain("..");
    expect(result.prompt).not.toMatch(/\.\s*\./);
  });

  it("applies the category default camera", () => {
    const { layers, metadata } = composeImagePrompt(base);
    expect(layers.camera).toContain("85mm lens");
    expect(layers.camera).toContain("full-length shot with headroom");
    expect(metadata.cameraPresetId).toBe("optics.character.default");
  });

  it("applies a named camera variant", () => {
    const { layers, metadata } = composeImagePrompt({
      ...base,
      cameraVariant: "portrait",
    });
    expect(layers.camera).toContain("105mm short telephoto lens");
    expect(layers.camera).toContain("Rembrandt key light");
    expect(metadata.cameraVariant).toBe("portrait");
    expect(metadata.cameraPresetId).toBe("optics.character.portrait");
  });

  it("falls back to the default camera for an unknown variant", () => {
    const { metadata } = composeImagePrompt({
      ...base,
      cameraVariant: "nonexistent",
    });
    expect(metadata.cameraPresetId).toBe("optics.character.default");
  });

  it("lets optics overrides win over category and theme defaults", () => {
    const { layers } = composeImagePrompt({
      ...base,
      opticsOverrides: { aperture: "f/1.4", aspectRatio: "1:1" },
    });
    expect(layers.camera).toContain("f/1.4");
    expect(layers.camera).toContain("1:1 square framing");
    // Untouched category defaults survive.
    expect(layers.camera).toContain("85mm lens");
  });

  it("applies a theme camera bias beneath user overrides", () => {
    const themed = composeImagePrompt({ ...base, theme: "modern" });
    expect(themed.layers.camera).toContain("Kodak Portra 400");

    const overridden = composeImagePrompt({
      ...base,
      theme: "modern",
      opticsOverrides: { filmStock: "tri-x-400" },
    });
    expect(overridden.layers.camera).toContain("Tri-X 400");
    expect(overridden.layers.camera).not.toContain("Portra");
  });

  it("supports named, name-free, and disabled style reference modes", () => {
    const named = composeImagePrompt(base);
    expect(named.layers.styleReference).toContain("in the tradition of");

    const nameFree = composeImagePrompt({
      ...base,
      styleReferenceMode: "name-free",
    });
    expect(nameFree.layers.styleReference).toBe(
      ART_THEMES.fantasy.nameFreeFallback,
    );
    expect(nameFree.layers.styleReference).not.toContain("in the tradition of");

    const disabled = composeImagePrompt({
      ...base,
      styleReferenceMode: "disabled",
    });
    expect(disabled.layers.styleReference).toBe("");
    expect(disabled.prompt).not.toContain("in the tradition of");
  });

  it("never emits more than the allowed number of named lineages", () => {
    for (const theme of Object.values(ART_THEMES)) {
      expect((theme.styleReferences || []).length).toBeLessThanOrEqual(
        MAX_ACTIVE_STYLE_REFERENCES,
      );
    }
  });

  it("merges general and category negatives and keeps them out of the prompt", () => {
    const { prompt, negativeTerms } = composeImagePrompt(base);
    expect(negativeTerms).toContain("stiff A-pose");
    expect(negativeTerms).toContain("watermark");
    expect(negativeTerms).toContain("extra fingers");
    // Negatives travel separately; they must not leak into the positive prompt.
    expect(prompt).not.toContain("stiff A-pose");
    expect(prompt).not.toContain("watermark");
  });

  it("lets a style override replace the theme and suppress the lineage", () => {
    const { layers, metadata } = composeImagePrompt({
      ...base,
      styleOverride: "ink wash on rice paper, silver leaf highlights",
    });

    expect(layers.theme).toBe("ink wash on rice paper, silver leaf highlights");
    // Stacking the shipped theme on top would specify two mediums at once.
    expect(layers.theme).not.toContain("painterly oil");
    expect(layers.styleReference).toBe("");
    expect(metadata.styleOverridden).toBe(true);
    // Framing, camera, and negatives are unaffected.
    expect(layers.category).toContain("full-body character concept art");
    expect(layers.camera).toContain("85mm lens");
  });

  it("ignores a blank style override", () => {
    const { layers, metadata } = composeImagePrompt({
      ...base,
      styleOverride: "   ",
    });
    expect(layers.theme).toBe(
      composeThemeLayer(
        ART_THEMES.fantasy,
        ART_CATEGORIES.character.materialFocus,
      ),
    );
    expect(metadata.styleOverridden).toBe(false);
  });

  it("can omit negatives entirely", () => {
    expect(
      composeImagePrompt({ ...base, includeNegatives: false }).negativeTerms,
    ).toEqual([]);
  });

  it("strips entity names from the subject and records them in metadata", () => {
    const { prompt, metadata } = composeImagePrompt({
      ...base,
      subject: "Valerius, a weary veteran officer",
      subjectOptions: {
        names: ["Valerius"],
        descriptor: "male human veteran officer",
      },
    });

    expect(prompt).not.toContain("Valerius");
    expect(metadata.removedNames).toContain("Valerius");
  });

  it("does not repeat the subject in later layers", () => {
    const { prompt } = composeImagePrompt({
      ...base,
      subject: "weary veteran officer",
    });
    const occurrences = prompt.split("weary veteran officer").length - 1;
    expect(occurrences).toBe(1);
  });

  it("uses the faction blueprint for the active theme", () => {
    const { layers } = composeImagePrompt({
      subject: "crew in matched grey longcoats with mismatched cranial ports",
      category: "faction",
      theme: "cyberpunk",
    });
    expect(layers.category).toContain(
      getFactionBlueprint("cyberpunk")!.signals,
    );
    expect(layers.category).toContain("mid-action rather than posed in a line");
  });

  it("keeps the generic faction framing when the theme has no blueprint", () => {
    const { layers } = composeImagePrompt({
      subject: "crew in matched grey longcoats",
      category: "faction",
      theme: "workspace",
    });
    expect(layers.category).toContain("mid-action rather than posed in a line");
    expect(layers.category).toBe(ART_CATEGORIES.faction.prompt);
  });

  it("respects a prompt length limit and marks truncation", () => {
    const { prompt, metadata } = composeImagePrompt({
      ...base,
      maxPromptLength: 120,
    });
    expect(prompt.length).toBeLessThanOrEqual(120);
    expect(metadata.truncated).toBe(true);

    expect(composeImagePrompt(base).metadata.truncated).toBe(false);
  });

  it("records reproducibility metadata", () => {
    const { metadata } = composeImagePrompt(base);
    expect(metadata).toMatchObject({
      artDirectionVersion: ART_DIRECTION_VERSION,
      categoryId: "character",
      themeId: "fantasy",
      styleReferenceMode: "named",
    });
  });

  it("surfaces optics warnings rather than silently composing them", () => {
    const { warnings } = composeImagePrompt({
      ...base,
      opticsOverrides: { aperture: "f/16", lensCharacter: ["shallow-depth"] },
    });
    expect(warnings.map((w) => w.code)).toContain("aperture-depth-conflict");
  });

  it("throws when the subject is empty after preparation", () => {
    expect(() => composeImagePrompt({ ...base, subject: "   " })).toThrow(
      /subject is required/i,
    );
  });

  it("composes without a category or theme", () => {
    const { prompt, layers, metadata } = composeImagePrompt({
      subject: "a cracked lacquer box over pine",
    });
    expect(prompt).toBe("a cracked lacquer box over pine.");
    expect(layers.category).toBe("");
    expect(metadata.categoryId).toBeUndefined();
    expect(metadata.themeId).toBeUndefined();
  });
  it("gives environment categories terrain materials, not handcrafted goods", () => {
    const location = composeImagePrompt({
      subject: "slate-grey mountain peaks above a fortified watchtower",
      category: "location",
      theme: "fantasy",
    });

    expect(location.layers.theme).toContain("hand-cut stone");
    // A mountain range is not made of worn leather and hammered iron.
    expect(location.layers.theme).not.toContain("worn leather");
    expect(location.layers.theme).not.toContain("hammered iron");
  });

  it("gives figure and prop categories craft materials", () => {
    const character = composeImagePrompt({ ...base, category: "character" });
    expect(character.layers.theme).toContain("worn leather");
    expect(character.layers.theme).not.toContain("hand-cut stone");

    const item = composeImagePrompt({ ...base, category: "item" });
    expect(item.layers.theme).toContain("worn leather");
  });

  it("keeps landscape vocabulary out of a group portrait", () => {
    // The terrain clause supplied a thatched village behind one faction and a
    // mossy watchtower behind another. A faction is people and their gear.
    const faction = composeImagePrompt({ ...base, category: "faction" });
    expect(faction.layers.theme).toContain("worn leather");
    expect(faction.layers.theme).not.toContain("thatch");
    expect(faction.layers.theme).not.toContain("moss and lichen");
  });

  it("gives mixed categories both material vocabularies", () => {
    const event = composeImagePrompt({ ...base, category: "event" });
    expect(event.layers.theme).toContain("worn leather");
    expect(event.layers.theme).toContain("hand-cut stone");
  });

  it("omits anatomy negatives for figureless categories", () => {
    for (const category of ["location", "item", "note"]) {
      const result = composeImagePrompt({ ...base, category });
      expect(result.metadata.figureInFrame, category).toBe(false);
      expect(result.negativeTerms, category).not.toContain("extra fingers");
      expect(result.negativeTerms, category).not.toContain("cropped head");
    }
  });

  it("includes anatomy negatives for categories with figures", () => {
    // Cover included: both cover framings ask for a backlit hero silhouette.
    for (const category of [
      "character",
      "creature",
      "faction",
      "event",
      "cover",
    ]) {
      const result = composeImagePrompt({ ...base, category });
      expect(result.metadata.figureInFrame, category).toBe(true);
      expect(result.negativeTerms, category).toContain("extra fingers");
    }
  });

  it("adds anatomy negatives when a camera variant puts a hand in frame", () => {
    const shelf = composeImagePrompt({ ...base, category: "item" });
    expect(shelf.negativeTerms).not.toContain("fused hands");

    const inHand = composeImagePrompt({
      ...base,
      category: "item",
      cameraVariant: "in-hand",
    });
    expect(inHand.metadata.figureInFrame).toBe(true);
    expect(inHand.negativeTerms).toContain("fused hands");
  });

  it("emits an aspect ratio for every category framing", () => {
    for (const [id, category] of Object.entries(ART_CATEGORIES)) {
      // Variants included: a new framing is where a missing ratio hides.
      const presets = [
        category.defaultCamera,
        ...Object.values(category.variants || {}),
      ];
      for (const preset of presets) {
        const ratio = preset.aspectRatio;
        expect(ratio, `${id}/${preset.id} has no aspect ratio`).toBeDefined();
      }

      for (const [variant, preset] of Object.entries(category.variants || {})) {
        const { layers, metadata } = composeImagePrompt({
          ...base,
          category: id,
          cameraVariant: variant,
        });
        expect(metadata.aspectRatio, `${id}/${variant}`).toBe(
          preset.aspectRatio,
        );
        expect(layers.camera, `${id}/${variant}`).toContain(
          ASPECT_RATIO_PHRASES[preset.aspectRatio!],
        );
      }

      const { layers, metadata } = composeImagePrompt({
        ...base,
        category: id,
      });
      expect(metadata.aspectRatio, id).toBe(category.defaultCamera.aspectRatio);
      expect(layers.camera, id).toContain(
        ASPECT_RATIO_PHRASES[category.defaultCamera.aspectRatio!],
      );
    }
  });

  it("lets an explicit framing flag override the category default", () => {
    const suppressed = composeImagePrompt({
      ...base,
      category: "character",
      opticsOverrides: { figureInFrame: false },
    });
    expect(suppressed.metadata.figureInFrame).toBe(false);
    expect(suppressed.negativeTerms).not.toContain("extra fingers");
  });

  it("keeps unrenderable brief language out of category prompts", () => {
    // A diffusion model cannot render "history" or "intent".
    for (const [id, category] of Object.entries(ART_CATEGORIES)) {
      expect(category.prompt, id).not.toMatch(
        /\b(implies?|communicates?|conveys?|history|ideology|intent)\b/i,
      );
    }
  });
});

describe("stature", () => {
  const gods = {
    subject:
      "tall lithe elven deities in flowing garments interwoven with living plant motifs, holding slender crystal staves",
    category: "faction",
    theme: "fantasy",
  };

  it("resolves ids, aliases, and labels, highest stature winning", () => {
    expect(resolveStatureId("divine")).toBe("divine");
    expect(resolveStatureId("Deity")).toBe("divine");
    expect(resolveStatureId("legendary")).toBe("mythic");
    expect(resolveStatureId("blacksmith")).toBeUndefined();
    expect(resolveStatureFromLabels(["forest", "legendary", "deity"])).toBe(
      "divine",
    );
    expect(resolveStatureFromLabels(["forest", "windswept"])).toBeUndefined();
  });

  it("does not read stature into ordinary descriptive labels", () => {
    // An ancient ruin is a ruin. An exalted stature would strip the weathering
    // it exists to show, so these must stay mundane unless said explicitly.
    for (const label of [
      "ancient",
      "famous",
      "notable",
      "celebrated",
      "powerful",
      "old",
      "sacred",
    ]) {
      expect(resolveStatureFromLabels([label]), label).toBeUndefined();
    }
    // The ids themselves still resolve, so an explicit label always works.
    expect(resolveStatureFromLabels(["renowned"])).toBe("renowned");
    expect(resolveStatureFromLabels(["mythic"])).toBe("mythic");
  });

  it("changes nothing when no stature is named", () => {
    const plain = composeImagePrompt(gods);
    const labelled = composeImagePrompt({
      ...gods,
      statureLabels: ["forest", "elven"],
    });

    expect(labelled.prompt).toBe(plain.prompt);
    expect(labelled.metadata.statureId).toBeUndefined();
    expect(labelled.layers.stature).toBe("");
  });

  it("replaces mundane materials rather than adding divine adjectives", () => {
    // The defect this axis exists for: a prompt for gods that composed
    // "worn leather ... thatch and slate, moss and lichen" and rendered a
    // village militia. Adding "radiant" to that returns the militia with a
    // glow on it, so the vocabulary has to be substituted, not extended.
    const divine = composeImagePrompt({ ...gods, stature: "deity" });

    expect(divine.layers.theme).toContain("living amber");
    expect(divine.layers.theme).not.toContain("worn leather");
    expect(divine.layers.theme).not.toContain("thatch");
    expect(divine.layers.theme).not.toContain("moss and lichen");
    // The theme's own lighting logic argues with self-originating light.
    expect(divine.layers.theme).not.toContain("firelit");
    // And its palette names the same metals the materials just did, which
    // renders as one flat colour — plus "tarnished" contradicts the register.
    expect(divine.layers.theme).toContain("cool ivory and deep shadow");
    expect(divine.layers.theme).not.toContain("tarnished gold");
  });

  it("composes an exalted faction as a tableau, not a decisive moment", () => {
    // "mid-action" and "absolute stillness" in one prompt satisfied neither and
    // produced a ceremonial lineup.
    const divine = composeImagePrompt({ ...gods, stature: "deity" });
    expect(divine.layers.category).toContain("hierarchical tableau");
    expect(divine.layers.category).toContain("larger than those behind");
    expect(divine.layers.category).not.toContain("mid-action");
  });

  it("still asks a still group to differentiate its members", () => {
    // The mundane prompt ends with "visible differences of rank and role". The
    // first exalted rewrite dropped it and rendered seven identical figures —
    // the `clones` negative alone does not carry it. Stated as attribute
    // rather than activity so it cannot reintroduce the mid-action clash.
    for (const stature of ["deity", "legendary"]) {
      const { layers } = composeImagePrompt({ ...gods, stature });
      expect(layers.category, stature).toMatch(
        /different domain|differences of rank and role/,
      );
      expect(layers.category, stature).toContain("no two silhouettes alike");
    }
  });

  it("does not forbid every mark on an exalted subject", () => {
    // A war god's notched blade is legitimate; the clause describes materials
    // that do not degrade rather than banning damage the subject specified.
    const divine = composeImagePrompt({ ...gods, stature: "deity" });
    expect(divine.layers.stature).toContain("without ageing");
    expect(divine.layers.stature).not.toMatch(
      /no trace of use|repair, or wear/,
    );
  });

  it("suppresses the vocabulary that dragged the subject back down", () => {
    const divine = composeImagePrompt({ ...gods, stature: "deity" });

    for (const term of ["thatch", "worn leather", "militia", "rust"]) {
      expect(divine.negativeTerms, term).toContain(term);
    }
    // The shared blocks still apply.
    expect(divine.negativeTerms).toContain("watermark");
    expect(divine.negativeTerms).toContain("extra fingers");
    expect(new Set(divine.negativeTerms).size).toBe(
      divine.negativeTerms.length,
    );
  });

  it("shoots an exalted subject from below, in light of its own", () => {
    const divine = composeImagePrompt({ ...gods, stature: "deity" });

    expect(divine.layers.camera).toContain("slightly low angle");
    expect(divine.layers.camera).toContain("source-less ambient glow");
    expect(divine.metadata.aspectRatio).toBe("2:3");
  });

  it("keeps an explicit optics override above the stature bias", () => {
    const divine = composeImagePrompt({
      ...gods,
      stature: "deity",
      opticsOverrides: { angle: "birds-eye" },
    });

    expect(divine.layers.camera).toContain("bird's-eye");
    expect(divine.layers.camera).not.toContain("slightly low angle");
  });

  it("replaces the faction blueprint's mortal signals", () => {
    const mortal = composeImagePrompt(gods);
    const divine = composeImagePrompt({ ...gods, stature: "deity" });

    expect(mortal.layers.category).toContain("battle standards");
    expect(divine.layers.category).toContain("self-originating light");
    // Stated positively in the prompt, suppressed in the negative block: a
    // positive "no banners" tends to summon banners.
    expect(divine.layers.category).not.toContain("battle standards");
    expect(divine.layers.category).not.toContain("tabards");
    expect(divine.negativeTerms).toContain("battle standards");
    expect(divine.negativeTerms).toContain("tabards");
  });

  it("reads stature from labels, and lets an explicit value win", () => {
    const fromLabel = composeImagePrompt({
      ...gods,
      statureLabels: ["elven", "deity"],
    });
    expect(fromLabel.metadata.statureId).toBe("divine");
    expect(fromLabel.layers.stature).toContain("divine presence");

    const overridden = composeImagePrompt({
      ...gods,
      stature: "renowned",
      statureLabels: ["deity"],
    });
    expect(overridden.metadata.statureId).toBe("renowned");
  });

  it("drops the wear clause instead of contradicting it in negatives", () => {
    // The positive layer is what gets rendered: "practical wear — repairs,
    // stains" alongside a negative "patched cloth" is a fight the negative
    // block loses.
    const mortal = composeImagePrompt({ ...gods, category: "character" });
    expect(mortal.layers.category).toContain("practical wear");

    for (const category of ["character", "item", "location"]) {
      const divine = composeImagePrompt({
        ...gods,
        category,
        stature: "deity",
      });
      expect(divine.layers.category, category).not.toMatch(
        /\b(practical wear|repairs|chipped|tarnish)\b/i,
      );
    }
  });

  it("takes the distiller's reading only when nothing else says", () => {
    const inferred = composeImagePrompt({
      ...gods,
      inferredStature: "divine",
    });
    expect(inferred.metadata.statureId).toBe("divine");
    expect(inferred.metadata.statureSource).toBe("inferred");

    // A label the user typed beats a model's reading of the lore.
    const labelled = composeImagePrompt({
      ...gods,
      statureLabels: ["legendary"],
      inferredStature: "divine",
    });
    expect(labelled.metadata.statureId).toBe("mythic");
    expect(labelled.metadata.statureSource).toBe("labels");

    // And an explicit request beats both.
    const explicit = composeImagePrompt({
      ...gods,
      stature: "renowned",
      statureLabels: ["deity"],
      inferredStature: "divine",
    });
    expect(explicit.metadata.statureId).toBe("renowned");
    expect(explicit.metadata.statureSource).toBe("explicit");
  });

  it("ignores an unusable inferred value", () => {
    const junk = composeImagePrompt({ ...gods, inferredStature: "very epic" });
    expect(junk.metadata.statureId).toBeUndefined();
    expect(junk.metadata.statureSource).toBeUndefined();
    expect(junk.prompt).toBe(composeImagePrompt(gods).prompt);
  });

  it("leaves the register clause out of the mundane stature", () => {
    expect(ART_STATURES.mundane.prompt).toBe("");
    expect(ART_STATURES.mundane.negativePrompt).toEqual([]);
    for (const id of ["renowned", "mythic", "divine"] as const) {
      expect(ART_STATURES[id].prompt.length, id).toBeGreaterThan(20);
    }
  });
});
