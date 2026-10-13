import { describe, expect, it } from "vitest";
import {
  buildTomePrompt,
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
  });
});
