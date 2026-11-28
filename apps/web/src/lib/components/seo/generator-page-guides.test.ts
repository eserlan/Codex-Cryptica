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

  it("serves the nomad clan guide with tips that name its form labels", () => {
    const guide = getGeneratorGuide(
      "nomad-clan",
      "Cyberpunk Nomad Clan Generator",
    );
    expect(guide).toBe(SLUG_GUIDES["nomad-clan"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug("nomad-clan", "Cyberpunk Nomad Clan Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Main conflict",
      "Clan role",
      "Primary territory",
      "Add campaign context",
    ]) {
      expect(tipText).toContain(label);
    }
    expect(guide.summary).not.toContain("Offline drafts");
    expect(guide.summary).not.toContain("AI drafts");
    expect(tipText).not.toContain("In offline drafts");
    expect(tipText).not.toContain("AI drafts");
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the pantheon generator guide with tips that name its form labels", () => {
    const guide = getGeneratorGuide(
      "pantheon-generator",
      "RPG Pantheon Generator",
    );
    expect(guide).toBe(SLUG_GUIDES["pantheon-generator"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug("pantheon-generator", "RPG Pantheon Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips
      .map((tip) => `${tip.title} ${tip.detail}`)
      .join(" ");
    for (const label of [
      "Pantheon Focus / Width",
      "Conflict Theme",
      "Worshippers",
      "Campaign context (optional)",
    ]) {
      expect(tipText).toContain(label);
    }
    expect(tipText).not.toContain("In offline drafts");
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
    expect(guide.links?.map((link) => link.href)).toEqual([
      "/answers/how-do-you-create-a-pantheon",
      "/answers/can-multiple-gods-share-a-domain",
      "/answers/how-do-you-create-a-believable-fictional-religion",
    ]);
  });

  it("qualifies custom culture behavior for the offline fantasy name roll", () => {
    const guide = getGeneratorGuide("fantasy-names", "Fantasy Names");
    const cultureTip = guide.tips.find((tip) =>
      tip.title.includes("culture for the sound"),
    );

    expect(guide.summary).toContain(
      "Built-in cultures shape offline names; custom culture labels use generic fantasy tables",
    );
    expect(cultureTip?.detail).toContain("Built-in Culture / Style options");
    expect(cultureTip?.detail).toContain(
      "custom culture or style label uses generic fantasy tables on the offline roll",
    );
  });

  it("distinguishes AI style notes from the offline name list", () => {
    const guide = getGeneratorGuide("fantasy-names", "Fantasy Names");

    expect(guide.summary).toContain(
      "AI results include a short style note for each name; offline results list names only",
    );
  });

  it("limits offline gender guidance to surnames on full Norse and Celtic names", () => {
    const guide = getGeneratorGuide("fantasy-names", "Fantasy Names");
    const genderTip = guide.tips.find((tip) =>
      tip.title.includes("Gender / Presentation"),
    );

    expect(genderTip?.detail).toContain("full person names");
    expect(genderTip?.detail).toContain("changes the surname only");
    expect(genderTip?.detail).toContain(
      "no effect on first-name-only rolls or names in other cultures",
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
    expect(
      getGeneratorGuide("nonexistent-slug" as never, "Fallback Generator")
        .summary,
    ).toContain("Fallback Generator");
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
    expect(guide.linksTitle).toBe("Make your faction matter at the table");
    expect(guide.links).toHaveLength(3);
    expect(guide.links?.map((link) => link.href)).toEqual([
      "/answers/how-do-you-create-a-fantasy-faction",
      "/answers/how-do-i-run-political-intrigue-and-faction-play",
      "/answers/how-do-you-track-faction-turns-between-rpg-sessions",
    ]);
    for (const link of guide.links ?? []) {
      expect(link.description).toBeTruthy();
      expect([link.label, link.description].join(" ")).not.toMatch(/[–—]/);
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
    expect(guide.linksTitle).toBe("Bring your nation to life");
    expect(guide.links).toHaveLength(3);
    expect(guide.links?.map((link) => link.href)).toEqual([
      "/answers/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
      "/answers/how-do-i-run-political-intrigue-and-faction-play",
      "/answers/how-do-i-build-a-believable-constitutional-crisis-or-coup",
    ]);
    for (const link of guide.links ?? []) {
      expect(link.description).toBeTruthy();
      expect([link.label, link.description].join(" ")).not.toMatch(/[–—]/);
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

  it("serves the dnd-npc guide with tips that name its form labels and output fields", () => {
    const guide = getGeneratorGuide("dnd-npc", "D&D NPC Generator");
    expect(guide).toBe(SLUG_GUIDES["dnd-npc"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug("dnd-npc", "D&D NPC Generator"),
    );
    expect(guide.summary).not.toContain("D&D NPC Generator");
    expect(guide.tips).toHaveLength(3);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Prep style",
      "Table Card (6-Element 60-Second Prep)",
      "Full Dossier (Detailed Background)",
      "Choose their role",
      "Choose their ancestry",
      "Choose their morality",
      "Add campaign context",
      "Class / Archetype",
      "Table Rating",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the news-sheet-generator guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide(
      "news-sheet-generator",
      "News Sheet Generator",
    );
    expect(guide).toBe(SLUG_GUIDES["news-sheet-generator"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug("news-sheet-generator", "News Sheet Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    expect(tipText).toContain(
      "Campaign context (optional) to add relevant details to the lead story",
    );
    expect(tipText).not.toContain("rival faction into the classifieds");
    for (const label of [
      "Genre / Setting",
      "Publication type",
      "Editorial tone",
      "Ownership / bias",
      "Censor level",
      "Hook density",
      "Settlement, region, or publication name (optional)",
      "Current crisis or headline event (optional)",
      "Campaign context (optional)",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the ship-generator guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide("ship-generator", "RPG Ship Generator");
    expect(guide).toBe(SLUG_GUIDES["ship-generator"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug("ship-generator", "RPG Ship Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Genre",
      "Ship Role",
      "Scale",
      "Condition",
      "Tone",
      "Campaign context (optional)",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the dungeon-generator guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide(
      "dungeon-generator",
      "Dungeon / Delve Idea Generator",
    );
    expect(guide).toBe(SLUG_GUIDES["dungeon-generator"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug(
        "dungeon-generator",
        "Dungeon / Delve Idea Generator",
      ),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Choose a vibe",
      "Original Purpose",
      "Current State & Function",
      "Complex Scale",
      "World context (optional)",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });
  it("serves the adventure-idea-generator guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide(
      "adventure-idea-generator",
      "Adventure Idea Generator",
    );
    expect(guide).toBe(SLUG_GUIDES["adventure-idea-generator"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug(
        "adventure-idea-generator",
        "Adventure Idea Generator",
      ),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Choose a vibe",
      "Adventure Type",
      "Adventure Scale",
      "Tone",
      "Starting Seed / Situation (optional)",
      "World context (optional)",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the one-shot-adventure-generator guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide(
      "one-shot-adventure-generator",
      "One-Shot Adventure Builder",
    );
    expect(guide).toBe(SLUG_GUIDES["one-shot-adventure-generator"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug(
        "one-shot-adventure-generator",
        "One-Shot Adventure Builder",
      ),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Genre",
      "Session length",
      "Players",
      "Adventure emphasis",
      "Advanced options",
      "Structure",
      "System",
      "Level or tier",
      "Starting premise",
      "Content boundaries",
      "Optional campaign context",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the comic-book-event-generator guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide(
      "comic-book-event-generator",
      "Comic Book Event Generator",
    );
    expect(guide).toBe(SLUG_GUIDES["comic-book-event-generator"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug(
        "comic-book-event-generator",
        "Comic Book Event Generator",
      ),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Event Type",
      "Scale",
      "Tone",
      "Optional Campaign Context",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the plot-twist-generator guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide(
      "plot-twist-generator",
      "Plot Twist & Complication Generator",
    );
    expect(guide).toBe(SLUG_GUIDES["plot-twist-generator"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug(
        "plot-twist-generator",
        "Plot Twist & Complication Generator",
      ),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Choose a vibe",
      "Current situation / premise",
      "Twist Type",
      "Impact",
      "When It Hits",
      "Fairness / Foreshadowing",
      "Avoid / constraints (optional)",
      "World context (optional)",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the council vote guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide("council-vote", "Council Vote Generator");
    expect(guide).toBe(SLUG_GUIDES["council-vote"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug("council-vote", "Council Vote Generator"),
    );
    expect(guide.summary).toContain("voting procedure");
    expect(guide.summary).not.toContain("voting threshold");
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Council Size",
      "Voting Rule",
      "Antagonist Influence",
      "Deadline",
      "Council Members",
      "Current Vote Estimate",
      "Secret Ballot does not set a threshold",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the holiday guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide("holiday", "Holiday & Festival Generator");
    expect(guide).toBe(SLUG_GUIDES.holiday);
    expect(guide).not.toEqual(
      defaultGuideForSlug("holiday", "Holiday & Festival Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Observance scope",
      "Culture",
      "Climate",
      "Religion",
      "Tone",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the villain-scheme-generator guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide(
      "villain-scheme-generator",
      "Superhero Villain Scheme Generator",
    );
    expect(guide).toBe(SLUG_GUIDES["villain-scheme-generator"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug(
        "villain-scheme-generator",
        "Superhero Villain Scheme Generator",
      ),
    );
    expect(guide.summary).toContain("four to six discoverable scheme stages");
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Power Scale",
      "Tone",
      "Scheme Type",
      "Villain Profile",
      "Optional Campaign Context",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the encounter guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide("encounter", "RPG Encounter Generator");
    expect(guide).toBe(SLUG_GUIDES.encounter);
    expect(guide).not.toEqual(
      defaultGuideForSlug("encounter", "RPG Encounter Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of ["Threat", "Encounter Type", "Environment", "Tone"]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the alien race guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide("alien-race", "Alien Race Generator");
    expect(guide).toBe(SLUG_GUIDES["alien-race"]);
    expect(guide).not.toEqual(
      defaultGuideForSlug("alien-race", "Alien Race Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "/answers/how-do-you-make-an-alien-species-feel-believable",
        }),
        expect.objectContaining({
          href: "/answers/what-kind-of-ship-should-a-sci-fi-rpg-party-start-with",
        }),
      ]),
    );
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Home Environment",
      "Body Plan",
      "Psychology",
      "Relationship to Other Species",
    ]) {
      expect(tipText).toContain(label);
    }
    expect(tipText).toContain(
      "A custom relationship appears in the section, but uses the first built-in friction line.",
    );
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("serves the tome, secret society, and world guides with form labels and without dashes", () => {
    const cases = [
      {
        slug: "tome",
        title: "Tome & Forbidden Book Generator",
        labels: [
          "Primary Reading Hazard",
          "Current Custodian",
          "Campaign Context",
        ],
      },
      {
        slug: "secret-society",
        title: "Secret Society Generator",
        labels: ["Public face", "Relationship to truth", "Danger level"],
      },
      {
        slug: "world",
        title: "Sci-Fi World Generator",
        labels: [
          "World Tag 1",
          "World Tag 2",
          "Habitability",
          "Civilisation",
          "Dominant feature (optional)",
        ],
      },
    ] as const;

    for (const { slug, title, labels } of cases) {
      const guide = getGeneratorGuide(slug, title);
      expect(guide).toBe(SLUG_GUIDES[slug]);
      expect(guide).not.toEqual(defaultGuideForSlug(slug, title));
      expect(guide.tips).toHaveLength(3);
      expect(guide.links?.length).toBeGreaterThan(0);
      const tipText = guide.tips.map((tip) => tip.detail).join(" ");
      for (const label of labels) {
        expect(tipText).toContain(label);
      }
      expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
    }
  });

  it("serves the constellation guide with tips naming its form labels and without dashes", () => {
    const guide = getGeneratorGuide("constellation", "Constellation Generator");
    expect(guide).toBe(SLUG_GUIDES.constellation);
    expect(guide).not.toEqual(
      defaultGuideForSlug("constellation", "Constellation Generator"),
    );
    expect(guide.tips).toHaveLength(3);
    expect(guide.links?.length).toBeGreaterThan(0);
    const tipText = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Visual Impression",
      "Practical Use",
      "Cultural Meaning",
      "Single Constellation",
      "Full Night Sky",
    ]) {
      expect(tipText).toContain(label);
    }
    expect([guide.summary, tipText].join(" ")).not.toMatch(/[–—]/);
  });

  it("falls back to the default template for slugs without a specific guide", () => {
    const fallbackSlug = "nonexistent-slug" as never;
    expect(getGeneratorGuide(fallbackSlug, "Custom Generator")).toEqual(
      defaultGuideForSlug(fallbackSlug, "Custom Generator"),
    );
  });
});

describe("BBEG editorial guide", () => {
  it("teaches scale, motive and adapting the next move, with a campaign reading sequence", () => {
    const guide = getGeneratorGuide("bbeg-generator", "BBEG Generator");
    const text = guide.tips.map(({ detail }) => detail).join(" ");
    for (const label of [
      "Threat Scale",
      "Villain Archetype",
      "World Relation",
      "Tone",
      "Degree of Sympathy / Redeemability",
      "The Villain's Plan",
      "Escalation If Ignored",
    ]) {
      expect(text).toContain(label);
    }
    expect(text).toContain("change the next viable stage");
    expect(text).not.toContain("Save to Codex");
    expect(guide.linksTitle).toBe("Build, run and update the campaign threat");
    expect(guide.links?.map(({ href }) => href)).toEqual([
      "/answers/how-do-i-plan-story-arcs-for-an-rpg-campaign",
      "/answers/how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
      "/answers/how-do-you-track-faction-turns-between-rpg-sessions",
    ]);
    expect(guide.links?.every(({ description }) => description)).toBe(true);
  });
});

describe("Quest editorial guide", () => {
  it("teaches table decisions using field labels and three progressive Answers", () => {
    const guide = getGeneratorGuide("quest", "RPG Quest Generator");
    const text = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Choose a vibe",
      "Scope",
      "Location Type",
      "Main Threat",
      "Twist",
      "Reward",
      "Optional Campaign Context",
    ]) {
      expect(text).toContain(label);
    }
    expect(guide.linksTitle).toBe("Turn a quest hook into playable choices");
    expect(guide.links?.map(({ href }) => href)).toEqual([
      "/answers/how-do-you-create-quest-hooks-without-railroading",
      "/answers/how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
      "/answers/how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
    ]);
    expect(guide.links?.every(({ description }) => description)).toBe(true);
  });
});

describe("Personality editorial guide", () => {
  it("connects personality choices to relationships, flaws and pressure, with a reading progression", () => {
    const guide = getGeneratorGuide("personality", "Personality Generator");
    const detail = guide.tips.map(({ detail }) => detail).join(" ");
    for (const label of [
      "Role / Context",
      "Optional Relationship Context",
      "Social Style",
      "Moral Outlook",
      "Temperament",
      "Reserved / Expressive",
    ]) {
      expect(detail).toContain(label);
    }
    expect(detail).toContain("guide your own edits to a non-AI profile");
    expect(detail).not.toContain("Save to Codex");
    expect(guide.linksTitle).toBe(
      "Bring the personality to the table and back again",
    );
    expect(guide.links?.map(({ href }) => href)).toEqual([
      "/answers/how-do-you-make-npcs-memorable-without-lots-of-prep",
      "/answers/how-do-i-roleplay-npcs-if-im-not-good-at-acting",
      "/answers/how-do-you-keep-track-of-npcs-in-a-long-campaign",
    ]);
    expect(guide.links?.every(({ description }) => description)).toBe(true);
  });
});

describe("Faction Roster editorial guide", () => {
  it("uses roster controls and progresses from roleplay to negotiation and faction turns", () => {
    const guide = getGeneratorGuide(
      "faction-roster",
      "Faction Roster Generator",
    );
    const detail = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "The faction",
      "Roster size",
      "How the faction is organised",
      "Roster emphasis",
      "Add campaign context (optional)",
    ]) {
      expect(detail).toContain(label);
    }
    expect(guide.linksTitle).toBe("Put the faction's members into play");
    expect(guide.links?.map(({ href }) => href)).toEqual([
      "/answers/how-do-i-roleplay-npcs-if-im-not-good-at-acting",
      "/answers/how-do-i-run-political-intrigue-and-faction-play",
      "/answers/how-do-you-track-faction-turns-between-rpg-sessions",
    ]);
    expect(guide.links?.every(({ description }) => description)).toBe(true);
  });
});

describe("RPG Item editorial guide", () => {
  it("uses the actual controls and curates loot placement, upgrades and trading", () => {
    const guide = getGeneratorGuide("item", "RPG Item Generator");
    const detail = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of ["Item Type", "Rarity", "Add campaign context"]) {
      expect(detail).toContain(label);
    }
    expect(guide.linksTitle).toBe(
      "Put found equipment to work in your campaign",
    );
    expect(guide.links?.map(({ href }) => href)).toEqual([
      "/answers/how-much-loot-and-how-many-magic-items-should-i-give-my-players",
      "/answers/how-do-i-upgrade-a-player-characters-weapon-without-replacing-it",
      "/answers/what-can-players-actually-buy-and-sell-in-a-fantasy-settlement",
    ]);
    expect(guide.links?.every(({ description }) => description)).toBe(true);
  });
});
