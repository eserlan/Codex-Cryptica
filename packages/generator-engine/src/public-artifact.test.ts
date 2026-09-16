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
