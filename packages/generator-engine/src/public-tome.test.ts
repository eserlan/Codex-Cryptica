import { describe, expect, it } from "vitest";
import { EXEMPLARS } from "./campaign-generator-exemplars";
import {
  auditTomeConsistency,
  buildTomeFacts,
  buildTomePrompt,
  ensureGroundTruthInLore,
  generateTomeLocal,
  generateTomeTwoPass,
  streamTomeTwoPass,
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


    it("excludes recent deception profiles while alternatives remain", () => {
      const seeded = seededRng(21);
      const old = resolveTome({ genre: "Classic Fantasy" }, seeded);
      const next = resolveTome(
        { genre: "Classic Fantasy", avoidDeceptions: [old.deceptionOrFlaw] },
        seededRng(21),
      );
      expect(next.deceptionOrFlaw).not.toBe(old.deceptionOrFlaw);
      expect(tomeConfig.deceptionProfilesByTheme["Classic Fantasy"].length).toBeGreaterThanOrEqual(7);
    });

    it("does not choose bound-gathering damage for rolls or tablets", () => {
      for (let i = 0; i < 100; i++) {
        const resolved = resolveTome(
          { genre: "Classic Fantasy", format: "Scorched Parchment Roll" },
          seededRng(i),
        );
        expect(resolved.exactDamage).not.toMatch(/gathering|signature|quire|leaves|pages/i);
      }
    });

    it("never gives Classic Fantasy a real-world calendar year", () => {
      for (let seed = 0; seed < 200; seed += 1) {
        const resolved = resolveTome(
          { genre: "Classic Fantasy" },
          seededRng(seed),
        );
        expect(resolved.era).not.toMatch(/\b\d{3,4}\b|century|Interwar/);
      }
    });

    it("keeps Classic Fantasy format, rarity, custodian and language in-world", () => {
      for (let seed = 0; seed < 200; seed += 1) {
        const r = resolveTome({ genre: "Classic Fantasy" }, seededRng(seed));
        expect(
          `${r.format} ${r.rarity} ${r.custodian} ${r.language}`,
        ).not.toMatch(
          /Printed|Pirated|University|Byzantine|Latin|Pocket Field/i,
        );
      }
    });

    it("still honours explicit user choices over theme lists", () => {
      const r = resolveTome(
        { genre: "Classic Fantasy", format: "Redacted Printed Octavo" },
        seededRng(1),
      );
      expect(r.format).toBe("Redacted Printed Octavo");
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
      const parsed = parseTomeResponse("not json at all", {
        exactDamage: "exactly three leaves are missing",
        associatedLocation: "the sealed west archive",
        bookClaim: "The archive records the true names of the dead",
      });
      expect(parsed.type).toBe("item");
      expect(parsed.title).toBeTruthy();
      expect(parsed.content).toContain("### Physical Description & Format");
      expect(parsed.labels).toContain("tome");
      expect(parsed.content).toContain("exactly three leaves are missing");
      expect(parsed.content).toContain("the sealed west archive");
      expect(parsed.lore).toContain(
        "The archive records the true names of the dead",
      );
      expect(parsed.content).toContain("Condition:");
      expect(parsed.content).toContain("The records point to");
      expect(parsed.content).not.toContain("undefined");
      expect(parsed.lore).not.toContain("undefined");
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

  describe("prompt editorial and logic rules", () => {
    it("states genre fidelity, spatial logic, production method and anti-repetition", () => {
      const prompt = buildTomePrompt(
        { genre: "Classic Fantasy" },
        undefined,
        seededRng(3),
      );
      const all = `${prompt.systemInstruction}\n${prompt.userMessage}`;
      expect(all).toContain("secondary world");
      expect(all).toContain("mirrored map swaps east and west");
      expect(all).toContain("production method");
      expect(all).toContain("Editorial economy");
    });

    it("does not forbid real-world references for Cosmic Horror", () => {
      const prompt = buildTomePrompt({}, undefined, seededRng(3));
      expect(prompt.systemInstruction).not.toContain("secondary world");
    });

    it("keeps editorial technology guidance appropriate to the resolved genre", async () => {
      const prompt = buildTomePrompt(
        { genre: "Cyberpunk" },
        undefined,
        seededRng(3),
      );
      let editorialInstruction = "";
      let editorialMessage = "";

      await generateTomeTwoPass(prompt, async (instruction, message) => {
        if (message.includes("EDITORIAL PASS 2 OF 2")) {
          editorialInstruction = instruction;
          editorialMessage = message;
        }
        return "invalid JSON";
      });

      expect(editorialInstruction).not.toContain("fantasy");
      expect(editorialMessage).toContain(
        "Keep technology consistent with the Cyberpunk setting and Composition Era.",
      );
      expect(editorialMessage).not.toContain(
        "avoid importing modern technology",
      );
    });
  });

  describe("canonical facts", () => {
    it("attaches structured facts to local output", () => {
      const resolved = resolveTome({ genre: "Classic Fantasy" }, seededRng(9));
      const out = generateTomeLocal({ genre: "Classic Fantasy" }, seededRng(9));
      expect(out.tomeFacts?.missingMaterial).toBe(resolved.exactDamage);
      expect(out.tomeFacts?.associatedLocation).toBe(
        resolved.associatedLocation,
      );
      expect(out.tomeFacts?.centralRule).toBeTruthy();
      expect(auditTomeConsistency(out, resolved).issues).toEqual([]);
    });

    it("keeps resolver anchors authoritative over model-supplied facts", () => {
      const prompt = buildTomePrompt({}, undefined, seededRng(4));
      const out = parseTomeResponse(
        JSON.stringify({
          title: "T",
          content: "x",
          lore: "y",
          canonicalFacts: {
            centralRule: "Reverse every left and right turn",
            productionMethod: "Printed facsimile of a handwritten notebook",
            errorSource: "The later glossator",
            missingMaterial: "ninety leaves",
          },
        }),
        prompt.resolved,
      );
      expect(out.tomeFacts?.centralRule).toBe(
        "Reverse every left and right turn",
      );
      expect(out.tomeFacts?.errorSource).toBe("The later glossator");
      expect(out.tomeFacts?.missingMaterial).toBe(prompt.resolved.exactDamage);
    });

    it("falls back to defaults when the model omits canonicalFacts", () => {
      const prompt = buildTomePrompt({}, undefined, seededRng(4));
      const out = parseTomeResponse(
        JSON.stringify({ title: "T", content: "x", lore: "y" }),
        prompt.resolved,
      );
      expect(out.tomeFacts?.productionMethod).toBe(prompt.resolved.format);
    });

    it("flags a central rule that never appears in the prose", () => {
      const resolved = resolveTome({ genre: "Classic Fantasy" }, seededRng(9));
      const out = generateTomeLocal({ genre: "Classic Fantasy" }, seededRng(9));
      const audit = auditTomeConsistency(
        {
          ...out,
          tomeFacts: {
            ...out.tomeFacts!,
            centralRule: "Submerge the vellum overnight in brine and moonlight",
            objectiveTruth: "Zebras guard the quarry gate at dusk",
          },
        },
        resolved,
      );
      expect(audit.warnings.join(" ")).toContain("not reflected");
    });

    it("ignores blank or non-string authored facts and tolerates a bare resolver", () => {
      const facts = buildTomeFacts(
        {},
        { centralRule: "   ", productionMethod: 5 as unknown as string },
      );
      expect(facts.centralRule).toBe("");
      expect(facts.productionMethod).toBe("Unspecified");
      expect(facts.errorSource).toContain("recoverable");
    });

    it("prompt asks the model to decide canonicalFacts first", () => {
      const prompt = buildTomePrompt({}, undefined, seededRng(4));
      expect(prompt.userMessage).toContain('"canonicalFacts"');
      expect(prompt.userMessage).toContain("Decide");
    });
  });

  describe("auditTomeConsistency genre and repetition", () => {
    const base = generateTomeLocal({ genre: "Classic Fantasy" }, seededRng(5));
    const resolved = resolveTome({ genre: "Classic Fantasy" }, seededRng(5));

    it("flags real-world references in a Classic Fantasy tome", () => {
      const audit = auditTomeConsistency(
        {
          ...base,
          content: `${base.content}\nSeized in Thessaloniki in 1924.`,
        },
        resolved,
      );
      expect(audit.valid).toBe(true);
      expect(audit.warnings.join(" ")).toContain("Genre drift");
    });

    it("never rejects a generation over heuristic warnings alone", () => {
      const line =
        "Reverse every left and right turn printed in the route before the expedition enters the lower vaults.";
      const audit = auditTomeConsistency(
        {
          ...base,
          content: `${base.content}\nSeized in Thessaloniki in 1924.\n\n### Adventure Hooks\n${line}\n\n### Contents & Revelations\n${line}`,
        },
        resolved,
      );
      expect(audit.warnings.length).toBeGreaterThan(0);
      expect(audit.issues).toEqual([]);
      expect(audit.valid).toBe(true);
    });

    it("does not mistake ordinary numbers for real-world years", () => {
      const audit = auditTomeConsistency(
        {
          ...base,
          content: `${base.content}\nThe vault holds 1600 gold crowns.`,
        },
        resolved,
      );
      expect(audit.warnings.join(" ")).not.toContain("Genre drift");
    });

    it("does not flag the same text for Cosmic Horror", () => {
      const horror = resolveTome({ genre: "Cosmic Horror" }, seededRng(5));
      const audit = auditTomeConsistency(
        {
          ...base,
          content: `${base.content}\nSeized in Thessaloniki in 1924.`,
        },
        horror,
      );
      expect(audit.warnings.join(" ")).not.toContain("Genre drift");
    });

    it("flags the same instruction restated across sections", () => {
      const line =
        "Reverse every left and right turn printed in the route before the expedition enters the lower vaults.";
      const audit = auditTomeConsistency({
        ...base,
        content: `${base.content}\n\n### Contents & Revelations\n${line}\n\n### Adventure Hooks\n${line}`,
      });
      expect(audit.valid).toBe(true);
      expect(audit.warnings.join(" ")).toContain("Repeated explanation");
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

  describe("generateTomeTwoPass", () => {
    const content = [
      "### Physical Description & Format",
      "A clay tablet bound in twine.",
      "### Provenance & Transmission",
      "The temple archived the tablet after its scribe vanished.",
      "### Contents & Revelations",
      "A river-clay vessel must dry in open air. A later censor substituted water.",
      "### Risks & Costs of Study",
      "Adding water to the vessel releases its resident spirit.",
      "### Adventure Hooks",
      "1. Retrieve the vessel before the rite begins.",
    ].join("\n\n");
    const lore = [
      "### At the Table Reference",
      "Use the vessel as an investigation.",
      "### Ground Truth for the GM",
      "- **What the Book Claims**: Apply water.",
      "- **The Deception / Flaw**: The censor changed the method.",
      "- **The Objective Truth**: The vessel must dry in open air.",
      "- **Actionable Clue**: A scorch exposes the correction.",
      "### Connected Entities",
      "- **Author / Compiler**: A temple scribe.",
      "### Quick Checks & Mechanics",
      "- **The Failure Condition**: Water releases the spirit.",
    ].join("\n\n");
    const response = (body: string) =>
      JSON.stringify({
        title: "The River-Clay Rite",
        summary: "A forbidden ritual tablet.",
        canonicalFacts: {
          centralRule: "Let the river-clay vessel dry in open air.",
          productionMethod: "Handwritten on a clay tablet.",
          errorSource: "A temple censor replaced drying with water.",
        },
        content: body,
        lore,
        labels: ["tome", "item"],
        connections: [],
      });

    it("runs two distinct calls and returns the editorially repaired output", async () => {
      const prompt = buildTomePrompt(
        { genre: "Classic Fantasy" },
        undefined,
        seededRng(8),
      );
      const calls: { instruction: string; message: string }[] = [];
      const out = await generateTomeTwoPass(
        prompt,
        async (instruction, message) => {
          calls.push({ instruction, message });
          return calls.length === 1
            ? response(
                content.replace("river-clay vessel", "soul-forged blade"),
              )
            : response(content);
        },
      );

      expect(calls).toHaveLength(2);
      expect(calls[1].message).toContain("FIRST-PASS DRAFT JSON");
      expect(calls[1].message).toContain("PROVISIONAL FIRST-PASS FACTS");
      expect(calls[1].message).toContain("blade");
      expect(out?.content).toContain("river-clay vessel");
      expect(out?.content).not.toContain("soul-forged blade");
      expect(out?.tomeFacts?.centralRule).toBe(
        "Let the river-clay vessel dry in open air.",
      );
    });


    it("lets the critic correct an impossible source clue and updates the structured truth", async () => {
      const prompt = buildTomePrompt({ genre: "Classic Fantasy" }, undefined, seededRng(4));
      const fixed = JSON.parse(response(content));
      fixed.canonicalFacts.actionableClue = "The east and west initials are swapped, but the north bearing stays fixed.";
      fixed.canonicalFacts.objectiveTruth = "A left-right reflection requires swapping all turns, while north stays fixed.";
      const out = await generateTomeTwoPass(prompt, async (_system, message) =>
        message.includes("EDITORIAL PASS 2") ? JSON.stringify(fixed) : response(content),
      );
      expect(out?.tomeFacts?.actionableClue).toContain("east and west");
      expect(out?.tomeFacts?.objectiveTruth).toContain("reflection");
      expect(out?.tomeFacts?.associatedLocation).toBe(prompt.resolved.associatedLocation);
      expect(out?.tomeFacts?.missingMaterial).toBe(prompt.resolved.exactDamage);
    });

    it("streams only pass two in pieces, then publishes a single validated result", async () => {
      const prompt = buildTomePrompt({}, undefined, seededRng(4));
      const final = response(content);
      const events = [];
      for await (const event of streamTomeTwoPass(
        prompt,
        async () => response(content.replace("river-clay vessel", "unfinished vessel")),
        async function* () {
          yield { type: "started" as const };
          yield { type: "delta" as const, text: final.slice(0, 95) };
          yield { type: "delta" as const, text: final.slice(95) };
          yield { type: "complete" as const, text: final };
        },
      )) events.push(event);

      expect(events.map(e => e.type)).toEqual(["phase", "phase", "delta", "delta", "result"]);
      expect(events.filter(e => e.type === "delta").map(e => "text" in e ? e.text : "").join("")).toBe(final);
      const outcome = events.at(-1);
      expect(outcome?.type).toBe("result");
      if (outcome?.type === "result") expect(outcome.output?.content).toContain("river-clay vessel");
    });

    it("streams the editorial pass but restores a valid first draft if the revision fails", async () => {
      const prompt = buildTomePrompt({}, undefined, seededRng(4));
      const events = [];
      for await (const event of streamTomeTwoPass(
        prompt,
        async () => response(content),
        async function* () {
          yield { type: "delta" as const, text: "not JSON" };
          yield { type: "error" as const, error: "connection lost" };
        },
      )) events.push(event);
      expect(events.map(e => e.type)).toEqual(["phase", "phase", "delta", "result"]);
      const outcome = events.at(-1);
      if (outcome?.type === "result") expect(outcome.output?.title).toBe("The River-Clay Rite");
    });

    it("does not stream a final result after cancellation", async () => {
      const prompt = buildTomePrompt({}, undefined, seededRng(4));
      const controller = new AbortController();
      const events = [];
      for await (const event of streamTomeTwoPass(
        prompt,
        async () => response(content),
        async function* () {
          yield { type: "delta" as const, text: "partial" };
          controller.abort();
          yield { type: "complete" as const, text: response(content) };
        },
        controller.signal,
      )) events.push(event);
      expect(events.some(e => e.type === "result")).toBe(false);
    });

    it("retains a valid first draft when the editorial response is malformed", async () => {
      const prompt = buildTomePrompt({}, undefined, seededRng(7));
      let count = 0;
      const out = await generateTomeTwoPass(prompt, async () =>
        ++count === 1 ? response(content) : "invalid JSON",
      );
      expect(count).toBe(2);
      expect(out?.title).toBe("The River-Clay Rite");
    });

    it("does not start the editorial pass or return a draft after cancellation", async () => {
      const prompt = buildTomePrompt({}, undefined, seededRng(7));
      const controller = new AbortController();
      let calls = 0;
      const out = await generateTomeTwoPass(
        prompt,
        async (_instruction, _message, signal) => {
          calls += 1;
          expect(signal).toBe(controller.signal);
          controller.abort();
          return response(content);
        },
        controller.signal,
      );

      expect(calls).toBe(1);
      expect(out).toBeNull();
    });

    it("rejects both drafts when neither passes structural validation", async () => {
      const prompt = buildTomePrompt({}, undefined, seededRng(7));
      let count = 0;
      const out = await generateTomeTwoPass(prompt, async () => {
        count += 1;
        return response("Broken document with missing sections.");
      });
      expect(count).toBe(2);
      expect(out).toBeNull();
    });
  });
});
