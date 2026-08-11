import { describe, it, expect } from "vitest";
import {
  alienRaceConfig,
  buildAlienRacePrompt,
  generateAlienRaceLocal,
  parseAlienRaceResponse,
  resolveAlienRace,
  GROUNDED_MODE,
  FREEFORM_MODE,
} from "./public-alien-race";

function seededRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const CONTENT_SECTIONS = [
  "## Overview",
  "## Evolutionary Origin",
  "## Homeworld & Environment",
  "## Biology & Lifecycle",
  "## Senses, Communication & Psychology",
  "## Culture & Social Structure",
  "## Technology",
  "## Beliefs & Worldview",
  "## Relations with Outsiders",
  "## Internal Factions & Conflicts",
];

const LORE_SECTIONS = [
  "## Weaknesses & Constraints",
  "## Naming Conventions",
  "## Typical Archetypes",
  "## Adventure Hooks",
];

/** Trait names flagged exotic — only reachable in Freeform mode. */
const EXOTIC_BODY_PLANS = [
  "Crystalline lattice",
  "Colonial swarm",
  "Plasma-bound field",
  "Self-replicating machine lineage",
];
const EXOTIC_ENVIRONMENTS = [
  "Gas giant cloud deck",
  "Deep void",
  "Generation-ship interior",
];

describe("public-alien-race", () => {
  describe("generateAlienRaceLocal", () => {
    it("is deterministic for a fixed seed", () => {
      const a = generateAlienRaceLocal({}, seededRng(42));
      const b = generateAlienRaceLocal({}, seededRng(42));
      expect(a).toEqual(b);
    });

    it("emits every content and lore section", () => {
      const result = generateAlienRaceLocal({}, seededRng(7));
      for (const section of CONTENT_SECTIONS) {
        expect(result.content).toContain(section);
      }
      for (const section of LORE_SECTIONS) {
        expect(result.lore).toContain(section);
      }
    });

    it("saves as a creature, since a species is not an individual", () => {
      expect(generateAlienRaceLocal({}, seededRng(1)).type).toBe("creature");
    });

    it("passes through explicit options into the output labels", () => {
      const result = generateAlienRaceLocal({
        genre: "Cosmic Horror",
        generationMode: GROUNDED_MODE,
        homeEnvironment: "Ocean world",
        bodyPlan: "Radially symmetric",
        socialOrganisation: "Rigid caste system",
        technologyLevel: "Interstellar",
      });
      expect(result.labels).toContain("alien-race");
      expect(result.labels).toContain("cosmic-horror");
      expect(result.labels).toContain("radially-symmetric");
      expect(result.labels).toContain("ocean-world");
      expect(result.labels).toContain("rigid-caste-system");
      expect(result.labels).toContain("interstellar");
    });

    it("never produces label fragments with leading or trailing dashes", () => {
      // "Grounded / Evolutionary" splits on "/" and would otherwise leave a
      // trailing separator once non-alphanumerics collapse to dashes.
      for (let seed = 0; seed < 50; seed++) {
        for (const item of generateAlienRaceLocal({}, seededRng(seed)).labels) {
          expect(item).not.toMatch(/^-|-$/);
        }
      }
    });
  });

  describe("generation mode", () => {
    it("never picks exotic traits in grounded mode across many seeds", () => {
      for (let seed = 0; seed < 200; seed++) {
        const resolved = resolveAlienRace(
          { generationMode: GROUNDED_MODE },
          seededRng(seed),
        );
        expect(EXOTIC_BODY_PLANS).not.toContain(resolved.bodyPlan);
        expect(EXOTIC_ENVIRONMENTS).not.toContain(resolved.homeEnvironment);
      }
    });

    it("can reach exotic traits in freeform mode", () => {
      const reached = new Set<string>();
      for (let seed = 0; seed < 300; seed++) {
        reached.add(
          resolveAlienRace({ generationMode: FREEFORM_MODE }, seededRng(seed))
            .bodyPlan,
        );
      }
      expect(EXOTIC_BODY_PLANS.some((plan) => reached.has(plan))).toBe(true);
    });

    it("respects an explicit exotic choice even in grounded mode", () => {
      // The form allows custom values; a user who typed it meant it.
      const resolved = resolveAlienRace({
        generationMode: GROUNDED_MODE,
        bodyPlan: "Crystalline lattice",
      });
      expect(resolved.bodyPlan).toBe("Crystalline lattice");
    });

    it("keeps derived traits consistent with an explicit exotic choice in grounded mode", () => {
      // A machine lineage is perpetual because of what it is, not because of
      // which mode was picked — deriving a 25-year biological lifespan here
      // would contradict the trait it was derived from.
      for (let seed = 0; seed < 40; seed++) {
        const biology = generateAlienRaceLocal(
          {
            generationMode: GROUNDED_MODE,
            bodyPlan: "Self-replicating machine lineage",
          },
          seededRng(seed),
        ).content.split("## Biology & Lifecycle")[1]!;
        expect(biology).toContain("no fixed lifespan");
      }
    });

    it("exposes mode-filtered pools for the form to narrow its choices", () => {
      expect(alienRaceConfig.bodyPlansByMode[GROUNDED_MODE]).not.toContain(
        "Plasma-bound field",
      );
      expect(alienRaceConfig.bodyPlansByMode[FREEFORM_MODE]).toContain(
        "Plasma-bound field",
      );
      expect(
        alienRaceConfig.homeEnvironmentsByMode[GROUNDED_MODE],
      ).not.toContain("Deep void");
      expect(alienRaceConfig.homeEnvironmentsByMode[FREEFORM_MODE]).toContain(
        "Deep void",
      );
    });
  });

  describe("consequence chaining (#2122 core principle)", () => {
    it("reflects the body plan in the technology section, not just biology", () => {
      const result = generateAlienRaceLocal({
        bodyPlan: "Hexapodal",
        generationMode: GROUNDED_MODE,
      });
      const technology = result.content.split("## Technology")[1] ?? "";
      // The hexapod's technology consequence is three-limbed grip and script.
      expect(technology).toContain("three");
    });

    it("ties naming conventions to the communication channel", () => {
      // A plasma being communicates by field modulation, whose names are
      // frequency signatures rather than spoken words.
      const result = generateAlienRaceLocal({
        generationMode: FREEFORM_MODE,
        bodyPlan: "Plasma-bound field",
      });
      const naming = result.lore.split("## Naming Conventions")[1] ?? "";
      expect(naming.toLowerCase()).toContain("frequency");
    });

    it("never picks a channel the environment's medium cannot carry", () => {
      // Vacuum carries neither air-borne chemistry nor sound. A body plan
      // that prefers chemical signalling (colonial swarm) must not override
      // that — the medium veto has to win.
      for (let seed = 0; seed < 60; seed++) {
        const senses = generateAlienRaceLocal(
          {
            generationMode: FREEFORM_MODE,
            homeEnvironment: "Deep void",
            bodyPlan: "Colonial swarm",
          },
          seededRng(seed),
        ).content.split("## Senses, Communication & Psychology")[1];
        expect(senses).not.toContain(
          "chemical signals read directly from the air",
        );
        expect(senses?.toLowerCase()).toMatch(
          /modulated fields|light patterns/,
        );
      }
    });

    it("keeps air-borne chemistry out of open water", () => {
      for (let seed = 0; seed < 40; seed++) {
        const senses = generateAlienRaceLocal(
          { homeEnvironment: "Ocean world" },
          seededRng(seed),
        ).content.split("## Senses, Communication & Psychology")[1];
        expect(senses).not.toContain(
          "chemical signals read directly from the air",
        );
      }
    });

    it("lets the lifespan govern what culture says about succession", () => {
      // The body plan is pinned as well as the environment: a chitinous
      // exoskeleton derives metamorphic castes and would take precedence over
      // the environment's lifespan, so leaving it to chance made this flaky.
      for (let seed = 0; seed < 40; seed++) {
        const culture = generateAlienRaceLocal(
          {
            homeEnvironment: "Ice world",
            bodyPlan: "Hexapodal",
            generationMode: GROUNDED_MODE,
          },
          seededRng(seed),
        ).content.split("## Culture & Social Structure")[1]!;
        // Cold, slow metabolisms are derived as Extended lifespans, whose
        // political consequence is centuries-long tenure.
        expect(culture.toLowerCase()).toContain("centuries");
      }
    });

    it("uses the right indefinite article for every technology level", () => {
      for (const technologyLevel of alienRaceConfig.technologyLevels) {
        const technology = generateAlienRaceLocal({
          technologyLevel,
        }).content.split("## Technology")[1]!;
        const expected = /^[aeiou]/i.test(technologyLevel) ? "an" : "a";
        expect(technology, technologyLevel).toContain(
          `At ${expected} ${technologyLevel.toLowerCase()} level`,
        );
      }
    });

    it("gives culture a source outside biology, as the prompt demands", () => {
      // The local path has to obey the same anti-determinism rule the prompt
      // states, or we ship a generator whose own fallback breaks its rules.
      for (let seed = 0; seed < 40; seed++) {
        const culture = generateAlienRaceLocal(
          {},
          seededRng(seed),
        ).content.split("## Culture & Social Structure")[1]!;
        expect(culture).toContain("Not all of it comes from their biology");
      }
    });

    it("closes the culture sentence on a word that can end a sentence", () => {
      // A contingency ending on a stranded preposition is grammatical but
      // reads badly at the end of an already-long sentence. Guards the whole
      // pool, so a new entry cannot reintroduce it.
      for (let seed = 0; seed < 200; seed++) {
        const culture = generateAlienRaceLocal({}, seededRng(seed))
          .content.split("## Culture & Social Structure")[1]!
          .split("##")[0]
          .trim();
        expect(culture, `seed ${seed}`).not.toMatch(
          /\b(of|to|with|for|by|from|about|into|onto|upon|than|and|but)\.$/i,
        );
      }
    });

    it("never asserts that everything follows from the environment", () => {
      for (let seed = 0; seed < 40; seed++) {
        const content = generateAlienRaceLocal({}, seededRng(seed)).content;
        expect(content).not.toContain("Everything else about them follows");
      }
    });

    it("includes an archetype who does not fit the dominant pattern", () => {
      const archetypes = generateAlienRaceLocal({}).lore.split(
        "## Typical Archetypes",
      )[1]!;
      expect(archetypes).toContain("The Unfitted");
      // The conservative-vs-reformer archetype is one the prompt now bans.
      expect(archetypes).not.toContain("The Traditionalist");
    });

    it("draws at least one weakness from the chosen body plan", () => {
      const result = generateAlienRaceLocal({
        bodyPlan: "Winged biped",
        generationMode: GROUNDED_MODE,
      });
      const weaknesses =
        result.lore.split("## Weaknesses & Constraints")[1] ?? "";
      expect(weaknesses.toLowerCase()).toContain("hollow skeleton");
    });
  });

  describe("buildAlienRacePrompt", () => {
    it("states the selected options in the brief", () => {
      const { userMessage } = buildAlienRacePrompt({
        genre: "Space Opera",
        homeEnvironment: "Desert world",
        bodyPlan: "Serpentine with manipulator hood",
        socialOrganisation: "Nomadic bands",
        technologyLevel: "Interplanetary",
        relationToOutsiders: "Uneasy ceasefire",
      });
      expect(userMessage).toContain("Space Opera");
      expect(userMessage).toContain("Desert world");
      expect(userMessage).toContain("Serpentine with manipulator hood");
      expect(userMessage).toContain("Nomadic bands");
      expect(userMessage).toContain("Interplanetary");
      expect(userMessage).toContain("Uneasy ceasefire");
    });

    it("forbids exotic life in grounded mode and allows it in freeform", () => {
      expect(
        buildAlienRacePrompt({ generationMode: GROUNDED_MODE }).userMessage,
      ).toContain("No crystalline, plasma, energy-based or machine life");
      expect(
        buildAlienRacePrompt({ generationMode: FREEFORM_MODE }).userMessage,
      ).toContain("exotic life is permitted");
    });

    it("does not forbid the very trait the user explicitly asked for", () => {
      // Grounded + an explicit exotic trait is reachable: the selects take
      // custom values and the in-app registry offers every trait regardless
      // of mode. Forbidding it here would contradict the request line.
      const { userMessage } = buildAlienRacePrompt({
        generationMode: GROUNDED_MODE,
        bodyPlan: "Crystalline lattice",
      });
      expect(userMessage).not.toContain(
        "No crystalline, plasma, energy-based or machine life",
      );
      expect(userMessage).toContain("Crystalline lattice");
      expect(userMessage).toContain("one deliberate exception");
      expect(userMessage).toContain(
        "Do not add further exotic traits beyond the one asked for",
      );
    });

    it("names every explicitly-chosen exotic trait in the exception", () => {
      const { userMessage } = buildAlienRacePrompt({
        generationMode: GROUNDED_MODE,
        bodyPlan: "Plasma-bound field",
        homeEnvironment: "Deep void",
      });
      expect(userMessage).toContain("Plasma-bound field and Deep void");
    });

    it("still forbids exotic life when the grounded choices are all ordinary", () => {
      const { userMessage } = buildAlienRacePrompt({
        generationMode: GROUNDED_MODE,
        bodyPlan: "Hexapodal",
        homeEnvironment: "Ocean world",
      });
      expect(userMessage).toContain(
        "No crystalline, plasma, energy-based or machine life",
      );
    });

    it("states the consequence principle as the primary rule", () => {
      const { systemInstruction, userMessage } = buildAlienRacePrompt();
      expect(systemInstruction).toContain("consequence");
      expect(systemInstruction).toContain("humans with unusual appearances");
      expect(userMessage).toContain(
        "must have consequences elsewhere in the species design",
      );
    });

    it("lists unset options as an explicit choice without mangling the sentence", () => {
      // The parameters used to be interpolated into prose, which produced
      // "a psychology of your choosing psychology" and "at a a technology
      // level of your choosing technology level" when left unset.
      const { userMessage } = buildAlienRacePrompt({});
      expect(userMessage).toContain("- Psychology: your choice");
      expect(userMessage).toContain("- Technology level: your choice");
      expect(userMessage).not.toMatch(/\bof your choosing\b/);
      expect(userMessage).not.toMatch(/\bat a a\b/);
    });

    it("forbids biological determinism while keeping the consequence rule", () => {
      const { userMessage } = buildAlienRacePrompt();
      expect(userMessage).toContain("Biology shapes; it does not determine");
      expect(userMessage).toContain(
        "Do not derive an entire civilisation from one adaptation",
      );
      // The two rules have to coexist, not replace one another.
      expect(userMessage).toContain(
        "every major biological or environmental difference must have consequences",
      );
      expect(userMessage).toContain(
        "at least one major cultural feature must come from somewhere other than biology",
      );
    });

    it("bans the recurring alien templates by name", () => {
      const { userMessage } = buildAlienRacePrompt();
      expect(userMessage).toContain("Vary the template");
      for (const trope of [
        "guild or artisan-collective societies",
        "efficiency, optimisation or resource-thrift",
        "entropy, heat-death or thermodynamics",
        "communal or hive identity",
        "biological inability to lie",
        "conservative-versus-reformer axis",
      ]) {
        expect(userMessage, trope).toContain(trope);
      }
    });

    it("stops the Core Alien Concept becoming an explanation for everything", () => {
      const { userMessage } = buildAlienRacePrompt();
      expect(userMessage).toContain(
        "must not become the explanation for everything",
      );
      expect(userMessage).toContain("does not fit the dominant pattern");
      expect(userMessage).toContain(
        "at least one part of their life it simply does not govern",
      );
    });

    it("asks for one Core Alien Concept carried through the draft", () => {
      const { systemInstruction, userMessage } = buildAlienRacePrompt();
      expect(systemInstruction).toContain("Core Alien Concept");
      expect(userMessage).toContain("Core Alien Concept");
      expect(userMessage).toContain("## Overview");
      expect(userMessage).toContain("at least three other sections");
    });

    it("rules out purely cosmetic traits", () => {
      const { userMessage } = buildAlienRacePrompt();
      expect(userMessage).toContain("Purely cosmetic differences");
      expect(userMessage).toMatch(
        /culture, technology, architecture, psychology, law, communication/,
      );
    });

    it("forbids monocultures and demands a dissenting faction", () => {
      const { userMessage } = buildAlienRacePrompt();
      expect(userMessage).toContain("Do not write a monoculture");
      expect(userMessage).toContain(
        "challenge a foundational cultural assumption",
      );
      expect(userMessage).toContain("all of them believe");
    });

    it("demands scientific consistency in grounded mode only", () => {
      const grounded = buildAlienRacePrompt({
        generationMode: GROUNDED_MODE,
      }).userMessage;
      expect(grounded).toContain(
        "environment, gravity, atmosphere, biology, senses and locomotion",
      );
      expect(grounded).toContain("unjustified absolutes");
      expect(grounded).toContain("no sense without a medium to carry it");

      // Freeform is allowed exotic physics, so the rigour block and its
      // consistency-pass counterpart must not be imposed there.
      const freeform = buildAlienRacePrompt({
        generationMode: FREEFORM_MODE,
      }).userMessage;
      expect(freeform).not.toContain("unjustified absolutes");
      expect(freeform).not.toContain("no sense without a medium to carry it");
    });

    it("keeps the grounded rigour rules when an exotic trait is carved out", () => {
      // The carve-out replaces the prohibition, not the plausibility bar.
      const { userMessage } = buildAlienRacePrompt({
        generationMode: GROUNDED_MODE,
        bodyPlan: "Crystalline lattice",
      });
      expect(userMessage).toContain("one deliberate exception");
      expect(userMessage).toContain("unjustified absolutes");
    });

    it("ends with the could-this-be-humans replaceability test", () => {
      const { userMessage } = buildAlienRacePrompt();
      expect(userMessage).toContain(
        "could this species be swapped for humans without changing the setting?",
      );
      expect(userMessage).toContain("make its biology, psychology, lifecycle");
    });

    it("ends with a consistency pass naming the specific cross-section links", () => {
      const { userMessage } = buildAlienRacePrompt();
      expect(userMessage).toContain("run a consistency pass");
      // Field-specific, not a generic "check your work".
      expect(userMessage).toContain("## Technology");
      expect(userMessage).toContain("## Naming Conventions");
      expect(userMessage).toContain("## Culture & Social Structure");
      expect(userMessage).toContain("## Weaknesses & Constraints");
      expect(userMessage).toContain("would not work unchanged for a generic");
    });

    it("lists both the content and lore sections it expects", () => {
      const { userMessage } = buildAlienRacePrompt();
      for (const section of [...CONTENT_SECTIONS, ...LORE_SECTIONS]) {
        expect(userMessage).toContain(section);
      }
    });

    it("passes campaign context and avoided names through", () => {
      const { userMessage } = buildAlienRacePrompt({
        campaignContext: "The Kesh Compact controls the outer belt.",
        avoidNames: ["Zarnok"],
      });
      expect(userMessage).toContain("Kesh Compact");
      expect(userMessage).toContain("Zarnok");
    });

    it("does not re-ban a name the user introduced in campaign context", () => {
      const { userMessage } = buildAlienRacePrompt({
        campaignContext: "The Ulmenaar have held the reach for centuries.",
        avoidNames: ["Ulmenaar"],
      });
      expect(userMessage).not.toContain(
        "do not use these campaign-specific names: Ulmenaar",
      );
    });
  });

  describe("parseAlienRaceResponse", () => {
    const valid = JSON.stringify({
      title: "Ith'vareen",
      summary: "A species that cannot lie about feeling.",
      content: "## Overview\nThey are six-limbed.",
      lore: "## Weaknesses & Constraints\n- Fragile forward limbs.",
      labels: ["hexapodal"],
    });

    it("parses a valid response and always prefixes the alien-race label", () => {
      const result = parseAlienRaceResponse(valid);
      expect(result.title).toBe("Ith'vareen");
      expect(result.type).toBe("creature");
      expect(result.labels[0]).toBe("alien-race");
      expect(result.labels).toContain("hexapodal");
    });

    it("parses a fenced response", () => {
      const result = parseAlienRaceResponse("```json\n" + valid + "\n```");
      expect(result.title).toBe("Ith'vareen");
    });

    it("throws on a response missing content, so the local fallback runs", () => {
      // content holds ten of the fourteen sections and the whole main column;
      // returning "" would render a near-empty draft instead of falling back.
      expect(() =>
        parseAlienRaceResponse(
          JSON.stringify({
            title: "Ith'vareen",
            lore: "## Weaknesses & Constraints\n- Fragile limbs.",
          }),
        ),
      ).toThrow(/missing content/);
      expect(() =>
        parseAlienRaceResponse(
          JSON.stringify({
            title: "Ith'vareen",
            content: "   ",
            lore: "## Weaknesses & Constraints\n- Fragile limbs.",
          }),
        ),
      ).toThrow(/missing content/);
    });

    it("throws on a response missing a title or lore", () => {
      expect(() =>
        parseAlienRaceResponse(JSON.stringify({ lore: "x" })),
      ).toThrow(/missing a title/);
      expect(() =>
        parseAlienRaceResponse(JSON.stringify({ title: "Ith'vareen" })),
      ).toThrow(/missing lore/);
    });

    it("throws on a banned title so the caller can fall back locally", () => {
      expect(() =>
        parseAlienRaceResponse(
          JSON.stringify({
            title: "Elara",
            content: "## Overview",
            lore: "## Weaknesses",
          }),
        ),
      ).toThrow(/banned title/);
    });

    it("throws on an avoided title", () => {
      expect(() =>
        parseAlienRaceResponse(
          JSON.stringify({
            title: "Ith'vareen",
            content: "## Overview",
            lore: "## Weaknesses",
          }),
          ["Ith'vareen"],
        ),
      ).toThrow(/banned title/);
    });

    it("cleans up duplicated punctuation from AI prose", () => {
      const result = parseAlienRaceResponse(
        JSON.stringify({
          title: "Ith'vareen",
          summary: "They cannot lie..",
          content: "## Overview\nThey  broadcast feeling.",
          lore: "## Weaknesses & Constraints\n- Fragile  limbs.",
        }),
      );
      expect(result.summary).toBe("They cannot lie.");
      expect(result.content).toContain("They broadcast feeling.");
      expect(result.lore).toContain("Fragile limbs.");
    });
  });
});
