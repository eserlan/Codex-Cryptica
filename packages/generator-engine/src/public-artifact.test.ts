import { describe, expect, it } from "vitest";
import {
  artifactConfig,
  buildArtifactPrompt,
  generateArtifactLocal,
  getGenreCausality,
  parseArtifactResponse,
  resolveArtifact,
} from "./public-artifact";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("public-artifact generator", () => {
  it("resolves default options deterministically from seed", () => {
    const rng1 = seededRng(42);
    const rng2 = seededRng(42);

    const resolved1 = resolveArtifact({}, rng1);
    const resolved2 = resolveArtifact({}, rng2);

    expect(resolved1).toEqual(resolved2);
    expect(artifactConfig.genres).toContain(resolved1.genre);
    expect(artifactConfig.forms).toContain(resolved1.form);
    expect(artifactConfig.originEras).toContain(resolved1.originEra);
  });

  it("avoids names in avoidNames list during resolution", () => {
    const rng = seededRng(42);
    const resolvedFirst = resolveArtifact({ genre: "Classic Fantasy" }, rng);

    const rngAgain = seededRng(42);
    const resolvedAvoided = resolveArtifact(
      {
        genre: "Classic Fantasy",
        avoidNames: [resolvedFirst.suggestedName],
      },
      rngAgain,
    );

    expect(resolvedAvoided.suggestedName).not.toBe(resolvedFirst.suggestedName);
  });

  it("correctly maps genres to causal profiles", () => {
    expect(getGenreCausality("Classic Fantasy")).toBe("magical");
    expect(getGenreCausality("Pirate")).toBe("magical");
    expect(getGenreCausality("Cyberpunk / Corporate")).toBe("technological");
    expect(getGenreCausality("Sci-Fi / Space Opera")).toBe("technological");
    expect(getGenreCausality("Lancer")).toBe("technological");
    expect(getGenreCausality("Modern Conspiracy")).toBe("technological");
    expect(getGenreCausality("Western / Frontier")).toBe("western-frontier");
    expect(getGenreCausality("Steampunk")).toBe("steampunk-industrial");
    expect(getGenreCausality("Post-Apocalyptic")).toBe("post-apocalyptic");
    expect(getGenreCausality("Vampire / Gothic Noir")).toBe("occult");
    expect(getGenreCausality("Cosmic Horror")).toBe("occult");
  });

  it("builds prompt tailored to causal logic and required sections", () => {
    const prompt = buildArtifactPrompt({
      genre: "Western / Frontier",
      form: "Weapon / Implement of War",
      originEra: "War of Extinction",
      powerTier: "Cataclysmic Power (Threatens nations & reality)",
      avoidNames: ["Gallows Iron", "Sundown Peacemaker"],
    });

    expect(prompt.userMessage).toContain("Western / Frontier");
    expect(prompt.userMessage).toContain("Frontier Manifestations & Legend");
    expect(prompt.userMessage).toContain("### Quick Reference");
    expect(prompt.userMessage).toContain("Dormant");
    expect(prompt.userMessage).toContain("Awakened");
    expect(prompt.userMessage).toContain("Ascendant");
    expect(prompt.userMessage).toContain(
      "Already created or used this session",
    );
    expect(prompt.userMessage).toContain("Gallows Iron");
    expect(prompt.userMessage).toContain("Sundown Peacemaker");
  });

  it("builds tech prompt with precursor subroutines heading", () => {
    const prompt = buildArtifactPrompt({
      genre: "Cyberpunk / Corporate",
    });

    expect(prompt.userMessage).toContain("Cyberpunk / Corporate");
    expect(prompt.userMessage).toContain(
      "Precursor Capabilities & Subroutines",
    );
    expect(prompt.userMessage).toContain("NEVER introduce supernatural spells");
  });

  it("parses valid JSON response into PublicGeneratorOutput", () => {
    const resolved = resolveArtifact({
      genre: "Classic Fantasy",
      form: "Crown / Regalia of Rule",
      originEra: "Primordial / Mythic Age",
      powerTier: "Heroic Wonder (Alters individuals & skirmishes)",
      currentStatus: "Sealed in Royal / High-Security Vault",
      curseCost: "Sacrificial Price (Requires vital tribute/blood)",
    });

    const json = JSON.stringify({
      title: "The Solar Sovereign Crown",
      summary: "An ancient golden crown worn by the first high kings.",
      content: "### Description\nGleams with unbroken celestial flame.",
      lore: `### Quick Reference\n- **Item Form**: Crown / Regalia of Rule\n\n### Artifact Powers & Manifestations\n- **Dormant Powers**: Aura of command.\n- **Awakened Powers**: Bends minds to sovereign decree.\n- **Ascendant / Zenith Powers**: Calls solar storm.\n\n### Attunement & Awakening Requirements\nBlood of kings.\n\n### Cost, Curse, Corruption, or Taboo\nDemands tribute.\n\n### Known History & Previous Keepers\nAncient.\n\n### Interested Factions & Pursuers\nRoyalists.\n\n### Rumours & Conflicting Legends\nNone.\n\n### Adventure Hooks\nSteal it.\n\n### Destruction or Sealing Conditions\nThrow in volcano.`,
      labels: ["artifact", "relic"],
    });

    const parsed = parseArtifactResponse(json, resolved);
    expect(parsed.type).toBe("item");
    expect(parsed.title).toBe("The Solar Sovereign Crown");
    expect(parsed.lore).toContain("### Quick Reference");
    expect(parsed.lore).toContain("### Artifact Powers & Manifestations");
  });

  it("recovers missing Quick Reference and Powers sections in parseArtifactResponse", () => {
    const resolved = resolveArtifact({
      genre: "Sci-Fi / Space Opera",
      form: "Mechanism / Grand Apparatus",
      originEra: "Pre-Collapse Era",
      powerTier: "Cataclysmic Power (Threatens nations & reality)",
      currentStatus: "Lost in Ruined Sanctuary",
      curseCost: "None (Pure Burden of Custody)",
    });

    const json = JSON.stringify({
      title: "Precursor Engine Alpha",
      content: "A humming quantum engine.",
      lore: "A mysterious device left behind by the Progenitors.",
    });

    const parsed = parseArtifactResponse(json, resolved);
    expect(parsed.lore).toContain("### Quick Reference");
    expect(parsed.lore).toContain("### Precursor Capabilities & Subroutines");
    expect(parsed.lore).toContain("Dormant Powers");
    expect(parsed.lore).toContain("Awakened Powers");
  });

  // Regression test (#3108): artifactConfig.genres is factionConfig.themes,
  // so "Superhero / Comic Book" is already exercised by the "for all genres"
  // loop below via namesByTheme's "Classic Fantasy" fallback. Assert it
  // explicitly so the safety guarantee doesn't silently erode if the loop
  // is ever narrowed.
  it("includes Superhero / Comic Book and does not crash generating it", () => {
    expect(artifactConfig.genres).toContain("Superhero / Comic Book");
    const local = generateArtifactLocal(
      { genre: "Superhero / Comic Book" },
      seededRng(12345),
    );
    expect(local.type).toBe("item");
    expect(local.title).toBeTruthy();
  });

  it("generates deterministic local artifact for all genres", () => {
    for (const genre of artifactConfig.genres) {
      const rng = seededRng(12345);
      const local = generateArtifactLocal({ genre }, rng);

      expect(local.type).toBe("item");
      expect(local.title).toBeTruthy();
      expect(local.content).toContain("### Description");
      expect(local.lore).toContain("### Quick Reference");
      expect(local.lore).toContain("Dormant Powers");
      expect(local.lore).toContain("Awakened Powers");
      expect(local.lore).toContain("Ascendant / Zenith Powers");
      expect(local.lore).toContain("### Attunement & Awakening Requirements");
      expect(local.lore).toContain("### Cost, Curse, Corruption, or Taboo");
      expect(local.lore).toContain("### Interested Factions & Pursuers");
      expect(local.lore).toContain("### Adventure Hooks");
      expect(local.lore).toContain("### Destruction or Sealing Conditions");
    }
  });
});

function sectionOf(lore: string, heading: string): string {
  const start = lore.indexOf(`### ${heading}`);
  if (start < 0) return "";
  const rest = lore.slice(start + heading.length + 4);
  const next = rest.indexOf("\n### ");
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

const baseOptions = {
  genre: "Classic Fantasy",
  form: artifactConfig.forms[0],
  originEra: artifactConfig.originEras[0],
  powerTier: artifactConfig.powerTiers[0],
  currentStatus: artifactConfig.currentStatuses[0],
  curseCost: artifactConfig.curseCosts[0],
};

describe("generateArtifactLocal offline options", () => {
  it("keeps the campaign context in the GM notes", () => {
    const local = generateArtifactLocal(
      { ...baseOptions, campaignContext: "The Salt Guild of Brindel" },
      seededRng(7),
    );
    expect(local.lore).toContain("### Campaign Context");
    expect(local.lore).toContain("The Salt Guild of Brindel");
  });

  it("omits the campaign section when the context is blank", () => {
    const local = generateArtifactLocal(
      { ...baseOptions, campaignContext: "   " },
      seededRng(7),
    );
    expect(local.lore).not.toContain("Campaign Context");
  });

  it("gives each curse option its own cost paragraph", () => {
    const costs = artifactConfig.curseCosts.map((curseCost) =>
      sectionOf(
        generateArtifactLocal({ ...baseOptions, curseCost }, seededRng(3))
          .lore!,
        "Cost, Curse, Corruption, or Taboo",
      ),
    );
    expect(new Set(costs).size).toBe(artifactConfig.curseCosts.length);
    expect(costs[5]).toContain("no supernatural price");
  });

  it("falls back to a genre cost for a custom curse", () => {
    const cost = sectionOf(
      generateArtifactLocal(
        { ...baseOptions, curseCost: "Typed by a GM" },
        seededRng(3),
      ).lore!,
      "Cost, Curse, Corruption, or Taboo",
    );
    expect(cost).toBeTruthy();
    expect(cost).not.toContain("no supernatural price");
  });

  it("gives heroic and regional tiers a smaller ascendant power than cataclysmic", () => {
    const ascendant = (powerTier: string) =>
      sectionOf(
        generateArtifactLocal({ ...baseOptions, powerTier }, seededRng(3))
          .lore!,
        "Artifact Powers & Manifestations",
      ).match(/Ascendant \/ Zenith Powers\*\*: (.*)/)?.[1];
    const [heroic, regional, cataclysmic] =
      artifactConfig.powerTiers.map(ascendant);
    expect(heroic).toBeTruthy();
    expect(new Set([heroic, regional, cataclysmic]).size).toBe(3);
    expect(cataclysmic).toContain("Rewrites local reality");
  });

  it("leads the hooks with the one that matches the current status", () => {
    const hooksFor = (currentStatus: string) =>
      sectionOf(
        generateArtifactLocal({ ...baseOptions, currentStatus }, seededRng(3))
          .lore!,
        "Adventure Hooks",
      );
    expect(hooksFor(artifactConfig.currentStatuses[1])).toMatch(
      /^\*\*The Vault Break\*\*/,
    );
    expect(hooksFor(artifactConfig.currentStatuses[0])).toMatch(
      /^\*\*The Lost Sanctuary\*\*/,
    );
  });

  it("names the artifact after its item form and uses that noun in the prose", () => {
    const local = generateArtifactLocal(
      { ...baseOptions, form: "Garment / Shroud" },
      seededRng(11),
    );
    expect(
      ["Shroud", "Mantle", "Cloak"].some((noun) => local.title?.endsWith(noun)),
    ).toBe(true);
    expect(local.content).not.toContain("garment / shroud");
    expect(local.content).not.toMatch(/ \/ /);
  });

  it("uses another form noun when every title for the first noun is excluded", () => {
    const form = "Garment / Shroud";
    const seed = 11;
    const initiallyResolved = resolveArtifact(
      { genre: "Classic Fantasy", form },
      seededRng(seed),
    );
    const adjectives = [
      "Solar",
      "Cinder",
      "Primordial",
      "Astral",
      "Crown-Breaker",
      "Dusk",
      "Radiant",
      "Sovereign",
      "World-Ender",
      "Glimmer",
      "Thorn",
      "Eternity",
    ];
    const avoidNames = adjectives.map(
      (adjective) => `${adjective} ${initiallyResolved.formNoun}`,
    );

    const resolved = resolveArtifact(
      { genre: "Classic Fantasy", form, avoidNames },
      seededRng(seed),
    );

    expect(avoidNames).toContain(
      `${adjectives[0]} ${initiallyResolved.formNoun}`,
    );
    expect(resolved.suggestedName).not.toBe("Eternity's Relic");
    expect(resolved.suggestedName).not.toMatch(/ Relic$/);
    expect(avoidNames).not.toContain(resolved.suggestedName);
    expect(
      ["Shroud", "Mantle", "Cloak"].some((noun) =>
        resolved.suggestedName.endsWith(noun),
      ),
    ).toBe(true);
  });

  it("uses the era as a readable phrase in the prose", () => {
    const local = generateArtifactLocal(
      { ...baseOptions, originEra: "Primordial / Mythic Age" },
      seededRng(11),
    );
    expect(local.lore).toContain("Forged during the primordial or mythic age");
    expect(local.lore).not.toContain("primordial / mythic age");
  });

  it("gives different vibe groups different factions and destruction methods", () => {
    const lore = (genre: string, seed: number) =>
      generateArtifactLocal({ ...baseOptions, genre }, seededRng(seed)).lore!;
    const tech = lore("Cyberpunk / Corporate", 9);
    const magic = lore("Classic Fantasy", 9);
    expect(sectionOf(tech, "Interested Factions & Pursuers")).not.toEqual(
      sectionOf(magic, "Interested Factions & Pursuers"),
    );
    expect(sectionOf(tech, "Destruction or Sealing Conditions")).not.toContain(
      "dragon-bile",
    );
  });
});
