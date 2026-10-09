import { describe, it, expect } from "vitest";
import { THEMES } from "schema";
import { themeIdToLabel } from "./public-faction-constants";
import { getGenerator, npcRacesForTheme } from "./campaign-generator-registry";
import type { GeneratorRunRequest } from "./campaign-generator-types";

function run(
  themeId: string,
  ctx: Record<string, unknown> = {},
): GeneratorRunRequest {
  return {
    generatorId: "npc",
    options: {},
    useAI: true,
    themeId,
    vaultContext: {
      categoryLabels: [],
      neighbors: [],
      worldSample: [],
      existingTitles: [],
      labelSuggestions: [],
      includedContext: [],
      applyTemplate: false,
      themeId,
      ...ctx,
    },
  } as GeneratorRunRequest;
}

describe("theme → genre mapping", () => {
  it("maps every app theme to a genre, so none silently falls back to Classic Fantasy", () => {
    const unmapped = Object.keys(THEMES).filter(
      (id) => !id.startsWith("workspace") && !themeIdToLabel[id],
    );
    expect(unmapped).toEqual([]);
  });

  it("maps the space-opera and wasteland themes to their own genres", () => {
    expect(themeIdToLabel.starwars).toBe("Sci-Fi / Space Opera");
    expect(themeIdToLabel["space-opera-resistance"]).toBe(
      "Sci-Fi / Space Opera",
    );
    expect(themeIdToLabel.fallout).toBe("Post-Apocalyptic");
  });

  it("no longer offers fantasy races on a space-opera theme", () => {
    const races = npcRacesForTheme("starwars").join(" ").toLowerCase();
    expect(races).not.toContain("elf");
    expect(races).not.toContain("dwarf");
  });
});

describe("theme genre grounding in the AI prompt", () => {
  const description =
    "Space opera, galactic conflict, ancient orders, rebellion, destiny.";

  it("states the theme's genre and description and warns off default fantasy", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("starwars", {
        themeName: "Galactic Holocron",
        themeDescription: description,
      }),
    );
    expect(prompt).toContain("World Theme: Galactic Holocron");
    expect(prompt).toContain(description);
    expect(prompt).toContain("Sci-Fi / Space Opera");
    expect(prompt).toMatch(/do not default to (high )?fantasy/i);
  });

  it("adds no fantasy warning for a fantasy theme", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("fantasy", { themeName: "Ancient Parchment" }),
    );
    expect(prompt).toContain("World Theme: Ancient Parchment");
    expect(prompt).not.toMatch(/do not default to (high )?fantasy/i);
  });

  it("adds nothing for the neutral workspace theme", () => {
    const prompt = getGenerator("npc").buildPrompt(
      run("workspace", { themeName: "Workspace (Light)" }),
    );
    expect(prompt).not.toContain("World Theme");
  });

  it("drops the guard on refinement turns, like the rest of the vault context", () => {
    const req = run("starwars", { themeName: "Galactic Holocron" });
    req.interaction = { input: "darker" };
    expect(getGenerator("npc").buildPrompt(req)).not.toContain(
      "Galactic Holocron",
    );
  });
});
