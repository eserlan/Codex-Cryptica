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
  formatOptics,
  mergeOptics,
  validateOptics,
} from "./art-direction-optics";
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

  it("gives mixed categories both material vocabularies", () => {
    const event = composeImagePrompt({ ...base, category: "event" });
    expect(event.layers.theme).toContain("worn leather");
    expect(event.layers.theme).toContain("hand-cut stone");
  });

  it("omits anatomy negatives for figureless categories", () => {
    for (const category of ["location", "item", "note", "cover"]) {
      const result = composeImagePrompt({ ...base, category });
      expect(result.metadata.figureInFrame, category).toBe(false);
      expect(result.negativeTerms, category).not.toContain("extra fingers");
      expect(result.negativeTerms, category).not.toContain("cropped head");
    }
  });

  it("includes anatomy negatives for categories with figures", () => {
    for (const category of ["character", "creature", "faction", "event"]) {
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

  it("emits an aspect ratio for every category", () => {
    for (const category of Object.keys(ART_CATEGORIES)) {
      const { layers } = composeImagePrompt({ ...base, category });
      expect(layers.camera, `${category} has no aspect ratio`).toMatch(
        /framing$/,
      );
    }
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
