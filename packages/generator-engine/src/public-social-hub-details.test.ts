import { describe, expect, it } from "vitest";
import { generateSocialHubLocal } from "./public-social-hub";
import { socialHubConfig } from "./public-social-hub-config";
import {
  buildSocialHubDetails,
  pickSocialHubNames,
  toProse,
} from "./public-social-hub-details";
import { INHABITANT_NAMES_BY_GENRE } from "./public-settlement-inhabitant-names";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const TEXT = (out: { summary: string; content: string; lore: string }) =>
  [out.summary, out.content, out.lore].join("\n");

describe("generateSocialHubLocal option-driven detail (#5241)", () => {
  it("lets genre, atmosphere, wealth level and clientele change the GM notes", () => {
    const fantasy = generateSocialHubLocal(
      {
        genre: "Fantasy",
        venueType: "Mead Hall",
        atmosphere: "Rowdy and welcoming",
        wealthLevel: "Destitute (dirt floors, watered-down drinks)",
        clientele: "Soldiers and mercenaries",
      },
      seededRng(6),
    );
    const cyber = generateSocialHubLocal(
      {
        genre: "Cyberpunk",
        venueType: "Noodle Bar",
        atmosphere: "Cold and professional",
        wealthLevel: "Wealthy (exclusive clientele)",
        clientele: "Hackers and netrunners",
      },
      seededRng(6),
    );
    expect(fantasy.lore).toContain("Spiced mead in horn cups");
    expect(fantasy.lore).toContain("quicker to step between two people");
    expect(fantasy.content).toContain("the drinks are watered");
    expect(fantasy.lore).toContain("soldiers and mercenaries");
    expect(cyber.lore).toContain("clean data jack");
    expect(cyber.lore).toContain("unwilling to discuss anything but business");
    expect(cyber.content).toContain("Someone at the door decides who gets in");
    expect(cyber.lore).toContain("hackers and netrunners");
    expect(cyber.lore).not.toContain("Spiced mead");
    expect(cyber.lore).not.toContain("The house special, served without");
  });

  it("keeps typed-in custom values for every dropdown", () => {
    const out = generateSocialHubLocal(
      {
        genre: "Clockwork Venice",
        venueType: "Floating gondola bar",
        atmosphere: "Sleepy and gossipy",
        wealthLevel: "Ruinously rich",
        clientele: "Masked courtiers",
      },
      seededRng(8),
    );
    expect(out.summary).toBe(
      "A sleepy and gossipy floating gondola bar serving masked courtiers.",
    );
    expect(out.lore).toContain("**Theme / Genre**: Clockwork Venice");
    expect(out.lore).toContain("**Wealth Level**: Ruinously rich");
    expect(out.content).toContain("The wealth level is ruinously rich");
    expect(out.lore).toContain("only this floating gondola bar serves");
    expect(out.lore).toContain("the sleepy and gossipy mood");
    expect(out.lore).toContain("masked courtiers");
  });

  it("moves campaign context into the GM notes and omits it when blank", () => {
    const withContext = generateSocialHubLocal(
      { genre: "Western", campaignContext: "  a railway war  " },
      seededRng(3),
    );
    expect(withContext.lore).toMatch(/### Campaign Context\na railway war$/);
    expect(withContext.content).not.toContain("railway war");
    expect(withContext.content).not.toContain("main conflict");

    const blank = generateSocialHubLocal(
      { genre: "Western", campaignContext: "   " },
      seededRng(3),
    );
    expect(blank.lore).not.toContain("### Campaign Context");
  });

  it("chooses a or an from the word that follows", () => {
    const vowel = generateSocialHubLocal(
      {
        genre: "Sci-Fi",
        venueType: "Asteroid Miner Pub",
        atmosphere: "Eerie and hushed",
      },
      seededRng(4),
    );
    expect(vowel.summary).toMatch(/^An eerie and hushed asteroid miner pub /);
    expect(vowel.content).toContain("is an asteroid miner pub catering");

    const consonant = generateSocialHubLocal(
      {
        genre: "Western",
        venueType: "Saloon",
        atmosphere: "Tense and suspicious",
      },
      seededRng(4),
    );
    expect(consonant.summary).toMatch(/^A tense and suspicious saloon /);
    expect(consonant.content).toContain("is a saloon catering");
  });

  it("writes no dashes, no stock faction seed and no repeated names in any genre", () => {
    for (const genre of socialHubConfig.genres) {
      for (let seed = 1; seed <= 12; seed++) {
        const out = generateSocialHubLocal({ genre }, seededRng(seed));
        expect(TEXT(out)).not.toMatch(/[–—]/);
        expect(out.lore).not.toContain("Faction behind");
        expect(TEXT(out)).not.toMatch(/\b[Aa] [aeio]/);
        const owner = /\*\*Owner \/ Operator\*\*: ([^,]+),/.exec(out.lore)?.[1];
        const regulars = (out.lore.split("### Notable Regulars")[1] ?? "")
          .split("### Rumours")[0]
          .match(/^- \*\*([^*]+)\*\*: /gm);
        expect(regulars).toHaveLength(2);
        const names = (regulars ?? []).map((line) =>
          line.replace(/^- \*\*|\*\*: $/g, ""),
        );
        expect(new Set([owner, ...names]).size).toBe(3);
      }
    }
  });

  it("uses the genre's own name pool, not fantasy placeholders, for named genres", () => {
    const out = generateSocialHubLocal({ genre: "Cyberpunk" }, seededRng(2));
    const owner = /\*\*Owner \/ Operator\*\*: ([^,]+),/.exec(out.lore)?.[1];
    expect(INHABITANT_NAMES_BY_GENRE.Cyberpunk).toContain(owner);
    expect(out.title.startsWith(`${owner}'s `)).toBe(true);
  });

  it("names space-faring venues after the operator and keeps worn names elsewhere", () => {
    for (const genre of ["Lancer", "Space Western", "Sci-Fi"]) {
      const out = generateSocialHubLocal({ genre }, seededRng(3));
      expect(out.title).toMatch(/^\w+'s (Bay|Dock|Zone|Platform|Hub)$/);
    }
    const western = generateSocialHubLocal({ genre: "Western" }, seededRng(3));
    expect(western.title).toMatch(/^The \w+ \w+$/);
  });
});

describe("social-hub detail helpers", () => {
  it("keeps acronyms and reads a slash as 'and'", () => {
    expect(toProse("Hero-Team HQ Commissary")).toBe("hero-team HQ commissary");
    expect(toProse("Tavern / Inn")).toBe("tavern and inn");
    expect(toProse("NHP handlers on downtime protocols")).toBe(
      "NHP handlers on downtime protocols",
    );
  });

  it("borrows the Sci-Fi pool for Lancer and falls back for a custom genre", () => {
    const lancer = pickSocialHubNames("Lancer", seededRng(1));
    for (const name of lancer) {
      expect(INHABITANT_NAMES_BY_GENRE["Sci-Fi"]).toContain(name);
    }
    const custom = pickSocialHubNames("Clockwork Venice", seededRng(1));
    expect(new Set(custom).size).toBe(3);
    expect(custom.every((name) => name.length > 0)).toBe(true);
  });

  it("gives every built-in trouble its own hook and a named seed", () => {
    const hooks = new Set<string>();
    for (const trouble of socialHubConfig.troubles) {
      const details = buildSocialHubDetails(
        {
          genre: "Fantasy",
          venueType: "Guildhall",
          atmosphere: "Rowdy and welcoming",
          wealthLevel: "Modest (reliable, no frills)",
          clientele: "Mixed locals",
          trouble,
        },
        seededRng(5),
      );
      hooks.add(details.hook);
      expect(details.troubleSeed).not.toContain(
        "Whoever is behind the trouble",
      );
      expect(details.rumours).toHaveLength(3);
    }
    expect(hooks.size).toBe(socialHubConfig.troubles.length);
  });

  it("falls back to a generic seed for an unknown trouble", () => {
    const details = buildSocialHubDetails(
      {
        genre: "Fantasy",
        venueType: "Guildhall",
        atmosphere: "Rowdy and welcoming",
        wealthLevel: "Modest (reliable, no frills)",
        clientele: "Mixed locals",
        trouble: "The Well Has Gone Dry",
      },
      seededRng(5),
    );
    expect(details.troubleSeed).toContain("Whoever is behind the trouble");
    expect(details.rumours.join("\n")).toContain("the well has gone dry");
  });
});
