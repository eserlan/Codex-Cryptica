import { describe, expect, it } from "vitest";
import {
  SLUG_GUIDES,
  defaultGuideForSlug,
  getGeneratorGuide,
} from "./generator-page-guides";
import type { GeneratorGuide } from "./generator-page-guides";

/**
 * Length of the word runs compared between guides. Long enough that ordinary
 * shared phrasing ("the rest of the party") does not trip it, short enough
 * that a template sentence with only the generator name swapped still shares
 * several runs with its source.
 */
const SHINGLE_WORDS = 8;

function guideWords(guide: GeneratorGuide): string[] {
  return [guide.summary, ...guide.tips.map((tip) => tip.detail)]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function shingles(words: string[]): Set<string> {
  const runs = new Set<string>();
  for (let i = 0; i + SHINGLE_WORDS <= words.length; i += 1) {
    runs.add(words.slice(i, i + SHINGLE_WORDS).join(" "));
  }
  return runs;
}

/**
 * Returns each word run that appears in more than one slug's guide. Catches
 * copied sentences and name-swapped templates, which differ only in a word or
 * two and so still share most of their runs.
 */
function findSharedGuideCopy(guides: Record<string, GeneratorGuide>) {
  const owners = new Map<string, Set<string>>();
  for (const [slug, guide] of Object.entries(guides)) {
    for (const run of shingles(guideWords(guide))) {
      const set = owners.get(run) ?? new Set<string>();
      set.add(slug);
      owners.set(run, set);
    }
  }
  return [...owners.entries()]
    .filter(([, slugs]) => slugs.size > 1)
    .map(([run, slugs]) => ({ run, slugs: [...slugs].sort() }));
}

function guide(summary: string, detail = "A short tip."): GeneratorGuide {
  return { summary, tips: [{ title: "Tip", detail }] };
}

describe("generator guide distinctness", () => {
  it("has no copy shared across specific guides", () => {
    expect(
      findSharedGuideCopy(SLUG_GUIDES as Record<string, GeneratorGuide>),
    ).toEqual([]);
  });

  it("has no copy shared with the fallback template", () => {
    // The template is the same for every slug, so one copy is enough to
    // compare against. Its title is a placeholder that no real guide uses.
    const template = defaultGuideForSlug("tome" as never, "Placeholder Title");
    expect(
      findSharedGuideCopy({
        ...(SLUG_GUIDES as Record<string, GeneratorGuide>),
        "fallback-template": template,
      }).filter((hit) => hit.slugs.includes("fallback-template")),
    ).toEqual([]);
  });

  it("detects a new guide that copies a fallback template sentence", () => {
    const template = defaultGuideForSlug("tome" as never, "Placeholder Title");
    const copied = guide("A new guide for the tome.", template.tips[0].detail);
    const found = findSharedGuideCopy({
      "fallback-template": template,
      tome: copied,
    });
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].slugs).toEqual(["fallback-template", "tome"]);
  });

  it("detects a sentence copied between two guides", () => {
    const shared =
      "Pick two or three bodies where rival factions or scarce resources collide, and leave the rest as landmarks.";
    const found = findSharedGuideCopy({
      "star-system": guide("A system guide.", shared),
      "ship-generator": guide("A ship guide.", shared),
    });
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].slugs).toEqual(["ship-generator", "star-system"]);
  });

  it("detects a name-swapped template sentence", () => {
    const template = (name: string) =>
      `Use the ${name} to draft a structured, system-agnostic starting point you can drop straight into prep or live play.`;
    const found = findSharedGuideCopy({
      tome: guide(template("Tome Generator")),
      "ship-generator": guide(template("Ship Generator")),
    });
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].slugs).toEqual(["ship-generator", "tome"]);
  });

  it("allows short phrases that any two guides might share", () => {
    expect(
      findSharedGuideCopy({
        a: guide("Roll once, then keep what fits your table."),
        b: guide("Roll once, then cut anything your players will skip."),
      }),
    ).toEqual([]);
  });

  it("serves the social hub guide with tips that name its form labels", () => {
    const guide = getGeneratorGuide("social-hub", "Social Hub Generator");
    expect(guide).toBe(SLUG_GUIDES["social-hub"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug("social-hub", "Social Hub Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Genre / Setting",
      "Venue type",
      "Primary clientele",
      "Atmosphere",
      "Wealth level",
      "Campaign context (optional)",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("qualifies custom culture behavior for the offline fantasy name roll", () => {
    const guide = getGeneratorGuide("fantasy-names", "Fantasy Names");
    const cultureTip = guide.tips.find((tip) =>
      tip.title.includes("culture for the sound"),
    );

    expect(cultureTip?.detail).toContain("Built-in Culture / Style options");
    expect(cultureTip?.detail).toContain(
      "custom culture or style label uses generic fantasy tables on the offline roll",
    );
  });

  it("serves the vampire clan guide with tips that name its form labels and output lines", () => {
    const guide = getGeneratorGuide("vampire-clan", "Vampire Clan Generator");
    expect(guide).toBe(SLUG_GUIDES["vampire-clan"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug("vampire-clan", "Vampire Clan Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Choose how they feed",
      "Choose their weakness",
      "Add campaign context",
      "Feeding Habit",
      "Clan Weakness",
      "Campaign Fit",
    ]) {
      expect(tipText).toContain(label);
    }
    expect(tipText).toContain("In offline drafts, Add campaign context");
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves every specific guide instead of the template", () => {
    for (const [slug, specific] of Object.entries(SLUG_GUIDES)) {
      expect(getGeneratorGuide(slug as never, "Any Title")).toBe(specific);
    }
    expect(Object.keys(SLUG_GUIDES)).toContain("magic-item");
  });

  it("returns a specific guide for a slug that has one, and the template otherwise", () => {
    expect(
      getGeneratorGuide("star-system", "Star System Generator").summary,
    ).toContain("playable region map");
    expect(getGeneratorGuide("tome", "Tome Generator").summary).toContain(
      "Tome Generator",
    );
  });

  it("serves the kingdom guide with tips that name its form labels", () => {
    const guide = getGeneratorGuide("kingdom", "Kingdom Generator");
    expect(guide).toBe(SLUG_GUIDES.kingdom);
    expect(guide.summary).not.toContain("Kingdom Generator");
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Government style",
      "Geography",
      "Conflict level",
      "Magic level",
      "Campaign context (optional)",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the tavern guide with tips that name its form labels", () => {
    const guide = getGeneratorGuide("tavern", "Tavern Generator");
    expect(guide).toBe(SLUG_GUIDES.tavern);
    expect(guide.summary).not.toContain("Tavern Generator");
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Wealth level",
      "Primary clientele",
      "Settlement type",
      "Campaign context (optional)",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the dark fantasy faction guide with tips that name its form labels", () => {
    const guide = getGeneratorGuide(
      "dark-fantasy-faction",
      "Dark Fantasy Faction Generator",
    );
    expect(guide).toBe(SLUG_GUIDES["dark-fantasy-faction"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug(
        "dark-fantasy-faction",
        "Dark Fantasy Faction Generator",
      ),
    );
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Dark fantasy mode",
      "Moral posture",
      "Operating scope",
      "Add campaign context",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the nation guide with tips that name its form labels", () => {
    const guide = getGeneratorGuide("nation", "Nation Generator");
    expect(guide).toBe(SLUG_GUIDES.nation);
    expect(guide.summary).not.toContain("Nation Generator");
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    expect(guide.summary).toContain("two or three power blocs");
    expect(tipText).toContain("In offline drafts");
    expect(tipText).toContain(
      "AI results may structure those seeds differently",
    );
    for (const label of ["Conflict level", "Scale", "Power Blocs"]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("does not serve the template to the nation page", () => {
    expect(getGeneratorGuide("nation", "Nation Generator").summary).not.toBe(
      defaultGuideForSlug("nation" as never, "Nation Generator").summary,
    );
  });

  it("serves the names guide with tips that name its form labels and offline limits", () => {
    const guide = getGeneratorGuide("names", "RPG Name Generator");
    expect(guide).toBe(SLUG_GUIDES.names);
    expect(guide).not.toEqual(
      defaultGuideForSlug("names", "RPG Name Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Name Type",
      "Choose a vibe",
      "Culture / Style",
      "Add campaign context",
      "Usage Suggestions",
    ]) {
      expect(tipText).toContain(label);
    }
    // The offline limits must match the engine: these vibes have no tables.
    for (const vibe of [
      "Cyberpunk / Corporate",
      "Vampire / Gothic Noir",
      "Sci-Fi / Space Opera",
      "Modern Conspiracy",
      "Post-Apocalyptic",
    ]) {
      expect(tipText).toContain(vibe);
    }
    expect(tipText).toContain("including after an AI failure");
    expect(tipText).toContain("retry if AI is already enabled");
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the urban fantasy faction guide with tips that name its form labels", () => {
    const guide = getGeneratorGuide(
      "urban-fantasy-faction",
      "Urban Fantasy Faction Generator",
    );
    expect(guide).toBe(SLUG_GUIDES["urban-fantasy-faction"]);
    expect(guide.summary).not.toContain("Urban Fantasy Faction Generator");
    expect(guide.summary).toContain("hidden-world group");
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Operating scope",
      "Add campaign context",
      "Moral posture",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("does not serve the template to the urban fantasy faction page", () => {
    expect(
      getGeneratorGuide(
        "urban-fantasy-faction",
        "Urban Fantasy Faction Generator",
      ).summary,
    ).not.toBe(
      defaultGuideForSlug(
        "urban-fantasy-faction",
        "Urban Fantasy Faction Generator",
      ).summary,
    );
  });
});
