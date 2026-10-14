import { describe, expect, it } from "vitest";
import { EXEMPLARS } from "./campaign-generator-exemplars";
import {
  auditTomeConsistency,
  buildTomePrompt,
  ensureGroundTruthInLore,
  generateTomeLocal,
  parseTomeResponse,
  resolveTome,
  tomeConfig,
} from "./public-tome";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("public-tome generator", () => {
  describe("resolveTome", () => {
    it("resolves default values when options are empty", () => {
      const resolved = resolveTome({}, seededRng(42));
      expect(resolved.genre).toBe("Cosmic Horror");
      expect(tomeConfig.formats).toContain(resolved.format);
      expect(tomeConfig.rarities).toContain(resolved.rarity);
      expect(tomeConfig.custodians).toContain(resolved.custodian);
      expect(tomeConfig.primaryHazards).toContain(resolved.primaryHazard);
      expect(resolved.title).toBeTruthy();
    });

    it("preserves explicit options when provided", () => {
      const resolved = resolveTome(
        {
          genre: "Classic Fantasy",
          tomeType: "Arcane Compendium",
          format: "Illuminated Vellum Folio",
          rarity: "Unique Original Manuscript",
          custodian: "University Restricted Archive",
          primaryHazard: "Physical / Environmental Hazard",
          language: "Archaic Latin",
          concept: "The Black Codex of Maelgwn",
        },
        seededRng(42),
      );
      expect(resolved.genre).toBe("Classic Fantasy");
      expect(resolved.tomeType).toBe("Arcane Compendium");
      expect(resolved.format).toBe("Illuminated Vellum Folio");
      expect(resolved.rarity).toBe("Unique Original Manuscript");
      expect(resolved.custodian).toBe("University Restricted Archive");
      expect(resolved.primaryHazard).toBe("Physical / Environmental Hazard");
      expect(resolved.language).toBe("Archaic Latin");
      expect(resolved.title).toBe("The Black Codex of Maelgwn");
    });
  });

  describe("generateTomeLocal", () => {
    it("generates a complete tome output with all required markdown sections", () => {
      const out = generateTomeLocal(
        {
          genre: "Cosmic Horror",
          concept: "The Drowned Liturgy of Saint Jude",
        },
        seededRng(100),
      );

      expect(out.type).toBe("item");
      expect(out.title).toBe("The Drowned Liturgy of Saint Jude");
      expect(out.summary).toContain("The Drowned Liturgy of Saint Jude");

      expect(out.content).toContain("### Physical Description & Format");
      expect(out.content).toContain("### Provenance & Transmission");
      expect(out.content).toContain("### Contents & Revelations");
      expect(out.content).toContain("### Risks & Costs of Study");
      expect(out.content).toContain("### Adventure Hooks");

      expect(out.lore).toContain("### At the Table Reference");
      expect(out.lore).toContain("### Connected Entities");
      expect(out.lore).toContain("### Quick Checks & Mechanics");
      expect(out.lore).toContain("Deciphering");

      expect(out.labels).toContain("tome");
      expect(out.labels).toContain("forbidden-book");
      expect(out.labels).toContain("item");
      expect(out.labels).toContain("cosmic-horror");
    });

    it("produces deterministic output with the same seed", () => {
      const out1 = generateTomeLocal({ genre: "Gothic Horror" }, seededRng(77));
      const out2 = generateTomeLocal({ genre: "Gothic Horror" }, seededRng(77));
      expect(out1.title).toBe(out2.title);
      expect(out1.content).toBe(out2.content);
      expect(out1.lore).toBe(out2.lore);
    });

    it("uses the selected modern setting, era, format, and hazard in local mode", () => {
      const options = {
        genre: "Cyberpunk / Corporate",
        tomeType: "Leaked Research Log",
        format: "Redacted Printed Octavo",
        primaryHazard: "Social / Investigation Risk",
        custodian: "University Restricted Archive",
      };
      const resolved = resolveTome(options, seededRng(8));
      const out = generateTomeLocal(options, seededRng(8));

      expect(out.content).toContain("Cyberpunk / Corporate");
      expect(out.content).toContain("Social / Investigation Risk");
      expect(out.content).toContain("audit trail");
      expect(out.content.toLowerCase()).toContain("redacted printed octavo");
      expect(out.content).not.toContain("iron-gall ink");
      expect(out.content).not.toContain("governing synod");
      expect(out.content).toContain(resolved.era);
      expect(out.lore).toContain(resolved.era);
      expect(["Late 21st century", "Near-future era"]).toContain(resolved.era);
      expect(out.lore.toLowerCase()).toContain("compiled the work in the");
      expect(out.lore).not.toContain("seventeenth-century");
    });

    it("keeps date-bearing sample titles consistent with the selected era", () => {
      for (let seed = 0; seed < 100; seed += 1) {
        const resolved = resolveTome(
          { genre: "Modern Conspiracy" },
          seededRng(seed),
        );
        const titleYear = resolved.title.match(
          /\b(?:1[0-9]{3}|20[0-9]{2})\b/,
        )?.[0];

        if (titleYear) expect(resolved.era).toContain(titleYear);
      }
    });

    it.each([
      ["Physical / Environmental Hazard", "compromised casing"],
      ["Mental / Obsessive Toll", "Repeated study encourages fixation"],
      ["Supernatural / Entity Attraction", "draws the attention"],
      [
        "Uncatalogued hazard",
        "Study carries the stated risk of uncatalogued hazard",
      ],
    ])(
      "describes the selected %s in the primary risk",
      (primaryHazard, expectedRisk) => {
        const out = generateTomeLocal({ primaryHazard }, seededRng(23));
        const primaryRisk =
          out.content.match(/\*\*Primary hazard[^\n]+/)?.[0] ?? "";

        expect(primaryRisk).toContain(expectedRisk);
      },
    );
  });

  describe("buildTomePrompt", () => {
    it("builds prompt with parameters, session anti-repetition, and consistency pass", () => {
      const prompt = buildTomePrompt(
        {
          genre: "Modern Conspiracy",
          primaryHazard: "Social / Investigation Risk",
          concept: "Operation Black Archive",
          avoidNames: ["Project Chiron", "MK-Ultra"],
          campaignContext: "A cold-war occult research group",
        },
        "Previous session: Investigators searched the sub-basement.",
        seededRng(1),
      );

      expect(prompt.systemInstruction).toContain("British English");
      expect(prompt.systemInstruction).toContain("System-neutral");

      expect(prompt.userMessage).toContain("Modern Conspiracy");
      expect(prompt.userMessage).toContain(
        `Composition Era**: ${prompt.resolved.era}`,
      );
      expect(prompt.userMessage).toContain("Operation Black Archive");
      expect(prompt.userMessage).toContain("Social / Investigation Risk");
      expect(prompt.userMessage).toContain("A cold-war occult research group");
      expect(prompt.userMessage).toContain("Project Chiron");
      expect(prompt.userMessage).toContain("Previous session");

      // Assert consistency pass instruction
      expect(prompt.userMessage).toContain(
        "Before returning, run a consistency pass:",
      );
      expect(prompt.userMessage).toContain("historically grounded");
      expect(prompt.userMessage).toContain(
        "physical materials, binding, and condition",
      );
      expect(prompt.userMessage).toContain("risks and costs of study");
      expect(prompt.userMessage).toContain("adventure hooks");
      expect(prompt.userMessage).toContain("errors or deceptive passages");
    });
  });

  describe("parseTomeResponse", () => {
    it("parses valid JSON response and assigns expected labels", () => {
      const json = JSON.stringify({
        title: "Liber Umbrarum",
        summary: "A scorched 16th-century grimoire.",
        content:
          "### Physical Description & Format\nBlack pigskin.\n\n### Provenance & Transmission\nWritten in Venice.",
        lore: "### At the Table Reference\nGM notes.",
        labels: ["grimoire", "venetian"],
        connections: [
          { targetTitle: "Venetian Synod", relationship: "banned by" },
        ],
      });

      const parsed = parseTomeResponse(json, {
        genre: "Cosmic Horror",
        tomeType: "Grimoire",
        format: "Octavo",
        rarity: "Unique",
        custodian: "Synod",
        primaryHazard: "Mould",
        language: "Latin",
        title: "Fallback Title",
        author: "Author",
        era: "16th century",
      });

      expect(parsed.type).toBe("item");
      expect(parsed.title).toBe("Liber Umbrarum");
      expect(parsed.summary).toBe("A scorched 16th-century grimoire.");
      expect(parsed.labels).toContain("tome");
      expect(parsed.labels).toContain("item");
      expect(parsed.labels).toContain("grimoire");
      expect(parsed.labels).toContain("cosmic horror");
      expect(parsed.connections).toEqual([
        { targetTitle: "Venetian Synod", relationship: "banned by" },
      ]);
    });

    it("falls back to local generator when given invalid or malformed JSON", () => {
      const parsed = parseTomeResponse("not json at all");
      expect(parsed.type).toBe("item");
      expect(parsed.title).toBeTruthy();
      expect(parsed.content).toContain("### Physical Description & Format");
      expect(parsed.labels).toContain("tome");
    });

    it("injects Ground Truth for the GM when omitted by the model response", () => {
      const json = JSON.stringify({
        title: "Test Codex",
        summary: "A mysterious book.",
        content: "### Physical Description & Format\nText.",
        lore: "### At the Table Reference\n\n### Connected Entities\n- **Author**: Test",
      });

      const parsed = parseTomeResponse(json, {
        genre: "Cosmic Horror",
        tomeType: "Occult Treatise",
        format: "Octavo",
        rarity: "Unique",
        custodian: "University Archive",
        primaryHazard: "Mental / Obsessive Toll",
        language: "Latin",
        title: "Test Codex",
        author: "Test Author",
        era: "17th century",
        exactDamage: "Three leaves excised from the second quire",
        associatedLocation: "The Subterranean Vaults",
        bookClaim: "Page 68 asserts that the tenth seal is a ward",
        deceptionOrFlaw: "The tenth seal is an authorising release trigger",
        objectiveTruth:
          "Nine wards bind the threshold; breaking the tenth dissolves the barrier",
        actionableClue:
          "A marginal note in red ochre noting the parish register discrepancy",
      });

      expect(parsed.lore).toContain("### Ground Truth for the GM");
      expect(parsed.lore).toContain("What the Book Claims");
      expect(parsed.lore).toContain(
        "Page 68 asserts that the tenth seal is a ward",
      );
      expect(parsed.lore).toContain("The Deception / Flaw");
      expect(parsed.lore).toContain(
        "The tenth seal is an authorising release trigger",
      );
      expect(parsed.lore).toContain("The Objective Truth");
      expect(parsed.lore).toContain("Actionable Clue");
    });
  });

  describe("ensureGroundTruthInLore", () => {
    it("preserves existing Ground Truth for the GM without duplicating", () => {
      const existingLore = `### At the Table Reference

### Ground Truth for the GM
- **What the Book Claims**: Custom claim
- **The Deception / Flaw**: Custom flaw
- **The Objective Truth**: Custom truth
- **Actionable Clue**: Custom clue`;

      const result = ensureGroundTruthInLore(existingLore, {
        bookClaim: "Fallback claim",
      });

      expect(result).toBe(existingLore);
      expect(result).not.toContain("Fallback claim");
    });
  });

  describe("auditTomeConsistency", () => {
    it("passes cleanly on locally generated tomes", () => {
      const out = generateTomeLocal({ genre: "Cosmic Horror" }, seededRng(42));
      const audit = auditTomeConsistency(out);
      expect(audit.valid).toBe(true);
      expect(audit.issues).toEqual([]);
    });

    it("passes consistency audit on the campaign generator exemplar", () => {
      const parsed = parseTomeResponse(EXEMPLARS.tome);
      const audit = auditTomeConsistency(parsed);
      expect(audit.valid).toBe(true);
      expect(audit.issues).toEqual([]);
    });

    it("flags missing content and lore sections", () => {
      const incomplete: any = {
        type: "item",
        title: "Incomplete Book",
        content: "### Physical Description & Format\nSome text.",
        lore: "### At the Table Reference\nNotes.",
      };
      const audit = auditTomeConsistency(incomplete);
      expect(audit.valid).toBe(false);
      expect(audit.issues).toContain(
        "Content is missing required section: ### Provenance & Transmission",
      );
      expect(audit.issues).toContain(
        "Content is missing required section: ### Contents & Revelations",
      );
      expect(audit.issues).toContain(
        "Content is missing required section: ### Risks & Costs of Study",
      );
      expect(audit.issues).toContain(
        "Content is missing required section: ### Adventure Hooks",
      );
      expect(audit.issues).toContain(
        "Lore is missing required section: ### Ground Truth for the GM",
      );
    });

    it("detects unit contradiction between leaves and gatherings", () => {
      const contradictory: any = {
        type: "item",
        title: "Contradictory Tome",
        content: `### Physical Description & Format
Seven leaves are missing from the binding.

### Provenance & Transmission
Passed down through generations.

### Contents & Revelations
Describes ancient wards.

### Risks & Costs of Study
Handling burns fingers.

### Adventure Hooks
1. Three gatherings are missing and currently in private hands.`,
        lore: `### At the Table Reference

### Ground Truth for the GM
- **What the Book Claims**: The wards hold.
- **The Deception / Flaw**: The wards collapsed.
- **The Objective Truth**: Nothing remains sealed.
- **Actionable Clue**: The broken seal.

### Connected Entities
- **Author**: Marcus

### Quick Checks & Mechanics
- **Deciphering**: Latin`,
      };

      const audit = auditTomeConsistency(contradictory);
      expect(audit.valid).toBe(false);
      expect(
        audit.issues.some((i) => i.includes("Potential unit contradiction")),
      ).toBe(true);
    });

    it("detects duplicated prose paragraphs between content and lore", () => {
      const duplicatedParagraph =
        "Compiled in the seventeenth century by Father Marcellan of the northern diocesan archive, the volume combines ecclesiastical reports with suppressed depositions from provincial witch trials. Its surviving vellum copy was passed between clandestine collectors for over two centuries.";

      const redundant: any = {
        type: "item",
        title: "Redundant Tome",
        content: `### Physical Description & Format
Vellum binding.

### Provenance & Transmission
${duplicatedParagraph}

### Contents & Revelations
Describes rites.

### Risks & Costs of Study
Mould hazard.

### Adventure Hooks
1. Find the copy.`,
        lore: `### At the Table Reference

### Ground Truth for the GM
- **What the Book Claims**: The rites work.
- **The Deception / Flaw**: The rites fail.
- **The Objective Truth**: The truth is lost.
- **Actionable Clue**: The date gap.

### Connected Entities
${duplicatedParagraph}

### Quick Checks & Mechanics
- **Deciphering**: Latin`,
      };

      const audit = auditTomeConsistency(redundant);
      expect(audit.valid).toBe(false);
      expect(
        audit.issues.some((i) =>
          i.includes("Lore contains duplicated prose paragraph from content"),
        ),
      ).toBe(true);
    });
  });
});
