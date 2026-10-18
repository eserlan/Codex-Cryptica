import { describe, it, expect } from "vitest";
import { talesOfTheValiant } from "./tales-of-the-valiant";

describe("talesOfTheValiant landing page config", () => {
  it("defines valid system slug and fantasy theme", () => {
    expect(talesOfTheValiant.slug).toBe("tales-of-the-valiant");
    expect(talesOfTheValiant.kind).toBe("system");
    expect(talesOfTheValiant.theme).toBe("fantasy");
    expect(talesOfTheValiant.hub).toBe("fantasy");
  });

  it("includes SEO metadata with assets.codexcryptica.com OpenGraph image", () => {
    expect(talesOfTheValiant.seo.title).toContain("Tales of the Valiant");
    expect(talesOfTheValiant.seo.description).toContain("Tales of the Valiant");
    expect(talesOfTheValiant.seo.image).toMatch(
      /^https:\/\/assets\.codexcryptica\.com\/og\//,
    );
  });

  it("covers core ToV specific workflows in use cases", () => {
    const titles = talesOfTheValiant.useCases.map((u) => u.title);
    expect(
      titles.some((t) => t.includes("Lineage") || t.includes("Heritage")),
    ).toBe(true);
    expect(titles.some((t) => t.includes("Luck"))).toBe(true);
    expect(
      titles.some((t) => t.includes("Doom") || t.includes("Adversar")),
    ).toBe(true);
  });

  it("describes Luck tracking and the available templates and generators", () => {
    const luck = talesOfTheValiant.useCases.find((u) =>
      u.title.includes("Luck"),
    );
    const sheets = talesOfTheValiant.useCases.find((u) =>
      u.title.includes("Stat Sheets"),
    );

    expect(luck?.description).toContain(
      "Codex does not apply a Long Rest reset",
    );
    expect(luck?.description).toContain("BFRD does not prescribe one");
    expect(sheets?.title).toContain("Generators");
    expect(sheets?.title).not.toContain("Import");
  });

  it("defines a sample campaign web connecting ToV concepts", () => {
    expect(talesOfTheValiant.exampleGraph?.steps.length).toBeGreaterThanOrEqual(
      4,
    );
    expect(talesOfTheValiant.exampleGraph?.description).toContain(
      "Lineage, Heritage, Background and motivation",
    );
    const doom = talesOfTheValiant.useCases.find((u) =>
      u.title.includes("Doom"),
    );
    expect(doom?.description).toContain("optional CR-based Doom pool");
    expect(doom?.description).toContain("creatures in the encounter");
  });

  it("links the NPC recommendation to the published NPC generator route", () => {
    const npcGenerator = talesOfTheValiant.recommendedTools.find(
      (tool) => tool.title === "NPC Generator",
    );

    expect(npcGenerator?.href).toBe("/generators/npc");
    expect(npcGenerator?.href).not.toBe("/generators/quick-npc");
  });
});
