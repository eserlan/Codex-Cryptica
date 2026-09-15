import { describe, expect, it } from "vitest";
import {
  buildOriginPrompt,
  generateOriginLocal,
  originConfig,
  parseOriginResponse,
} from "./public-origin";

const fixedRng = () => 0.25;

const VALID_CONTENT =
  "### The Origin\nSomething happened.\n\n### What the World Knows\nNothing public.\n\n### Campaign Hook\nA scientist wants a sample.";
const VALID_LORE =
  "### The Full Truth\nThe real story.\n\n### Ongoing Consequence\nThe connection never closed.\n\n### Who Knows\nJust one contact.\n\n### Further Hooks\nThe event happens again.";

describe("Origin generator", () => {
  describe("generateOriginLocal", () => {
    it("is deterministic for a fixed rng", () => {
      const a = generateOriginLocal({ originType: "Mutation" }, fixedRng);
      const b = generateOriginLocal({ originType: "Mutation" }, fixedRng);
      expect(a).toEqual(b);
    });

    it("passes through an explicit origin type and tone rather than rolling them", () => {
      const output = generateOriginLocal(
        { originType: "Alien Heritage", tone: "Tragic" },
        fixedRng,
      );
      expect(output.summary).toContain("alien heritage");
      expect(output.summary).toContain("tragic");
    });

    it("structurally separates what happened, the campaign hook, and the ongoing consequence", () => {
      const output = generateOriginLocal({ originType: "Artefact" }, fixedRng);

      expect(output.content).toContain("### The Origin");
      expect(output.content).toContain("### What the World Knows");
      expect(output.content).toContain("### Campaign Hook");
      expect(output.lore).toContain("### The Full Truth");
      expect(output.lore).toContain("### Ongoing Consequence");
      expect(output.lore).toContain("### Who Knows");

      // The hook and the consequence must be non-empty, distinct bodies of
      // text, not merely present headings with nothing under them.
      const hookBody = output.content.split("### Campaign Hook")[1].trim();
      const consequenceBody = output.lore
        .split("### Ongoing Consequence")[1]
        .split("### Who Knows")[0]
        .trim();
      expect(hookBody.length).toBeGreaterThan(20);
      expect(consequenceBody.length).toBeGreaterThan(20);
      expect(hookBody).not.toEqual(consequenceBody);
    });

    it("resolves 'Random' to one of the eleven concrete origin types, never back to 'Random' itself", () => {
      for (let i = 0; i < 20; i++) {
        const rng = () => (i % 17) / 17;
        const output = generateOriginLocal({ originType: "Random" }, rng);
        expect(output.summary).not.toContain("random");
      }
    });

    it("covers every origin type from the issue with its own distinct event/hook/consequence pool", () => {
      const types = originConfig.originTypes.filter((t) => t !== "Random");
      expect(types).toEqual([
        "Mutation",
        "Accident",
        "Scientific Experiment",
        "Technology",
        "Magic / Occult Initiation",
        "Alien Heritage",
        "Artefact",
        "Cosmic Event",
        "Inherited Mantle",
        "Government Programme",
        "Divine / Extradimensional Intervention",
      ]);
      for (const originType of types) {
        const output = generateOriginLocal({ originType }, fixedRng);
        expect(output.content).toContain("### Campaign Hook");
        expect(output.lore).toContain("### Ongoing Consequence");
      }
    });

    it("uses an original codename, never a banned placeholder name", () => {
      for (let i = 1; i <= 12; i++) {
        const rng = () => i / 13;
        const output = generateOriginLocal({}, rng);
        expect(output.title).toBeTruthy();
      }
    });

    it("carries the origin-generator label plus superhero/character labels", () => {
      const output = generateOriginLocal(
        { originType: "Technology" },
        fixedRng,
      );
      expect(output.labels).toContain("origin-generator");
      expect(output.labels).toContain("superhero");
      expect(output.labels).toContain("character-generator");
    });

    it("preserves campaign context in local output", () => {
      const output = generateOriginLocal(
        {
          originType: "Mutation",
          campaignContext: "New Avalon is under a citywide blackout.",
        },
        fixedRng,
      );
      expect(output.content).toContain(
        "New Avalon is under a citywide blackout.",
      );
    });

    it("uses the selected custom origin type in local output", () => {
      const output = generateOriginLocal(
        { originType: "Temporal Echo" },
        fixedRng,
      );
      expect(output.summary).toContain("temporal echo");
      expect(output.content).toContain("temporal echo");
      expect(output.content).not.toContain("dormant trait");
    });
  });

  describe("buildOriginPrompt", () => {
    it("names the origin type and tone in the prompt", () => {
      const prompt = buildOriginPrompt(
        { originType: "Government Programme", tone: "Paranoid" },
        "",
        fixedRng,
      );
      expect(prompt.userMessage).toContain("Government Programme");
      expect(prompt.userMessage).toContain("Paranoid");
    });

    it("requires the schema to structurally separate the origin event, hook, and consequence as explicit fields", () => {
      const prompt = buildOriginPrompt({}, "", fixedRng);
      expect(prompt.userMessage).toContain("### The Origin");
      expect(prompt.userMessage).toContain("### Campaign Hook");
      expect(prompt.userMessage).toContain("### Ongoing Consequence");
      expect(prompt.userMessage).toContain(
        "stemming directly from the specific origin event",
      );
      expect(prompt.userMessage).toContain(
        "must NOT be solved simply by the origin story being known",
      );
    });

    it("includes a field-specific consistency pass naming the hook and consequence by their own field names", () => {
      const prompt = buildOriginPrompt({ tone: "Grim" }, "", fixedRng);
      expect(prompt.userMessage).toContain("consistency pass");
      expect(prompt.userMessage).toContain(
        '"### Campaign Hook" must name a concrete, usable-tonight hook',
      );
      expect(prompt.userMessage).toContain(
        '"### Ongoing Consequence" must describe a complication',
      );
      expect(prompt.userMessage).toContain("Grim");
    });

    it("states the single-genre, no-existing-IP constraints", () => {
      const prompt = buildOriginPrompt({}, "", fixedRng);
      expect(prompt.userMessage).toContain(
        "Superhero / Comic Book setting only",
      );
      expect(prompt.userMessage).toContain(
        "do not name or closely imitate any existing comic-book character",
      );
    });

    it("weaves campaign context and session context into the prompt", () => {
      const prompt = buildOriginPrompt(
        { campaignContext: "A rogue AI already runs the city's utilities." },
        "Existing campaign entities: The Latticework Combine.",
        fixedRng,
      );
      expect(prompt.userMessage).toContain(
        "A rogue AI already runs the city's utilities.",
      );
      expect(prompt.userMessage).toContain("The Latticework Combine");
    });
  });

  describe("parseOriginResponse", () => {
    const prompt = buildOriginPrompt(
      { originType: "Cosmic Event" },
      "",
      fixedRng,
    );

    it("parses a well-formed AI response", () => {
      const output = parseOriginResponse(
        JSON.stringify({
          title: "Halcyon Drift",
          summary: "A cosmic-event origin.",
          content:
            "### The Origin\nSomething happened.\n\n### What the World Knows\nNothing public.\n\n### Campaign Hook\nA scientist wants a sample.",
          lore: VALID_LORE,
          labels: ["origin-generator", "superhero"],
        }),
        prompt.resolved,
      );
      expect(output.title).toBe("Halcyon Drift");
      expect(output.type).toBe("character");
      expect(output.content).toContain("### Campaign Hook");
      expect(output.lore).toContain("### Ongoing Consequence");
    });

    it("throws (triggering the local fallback) when content is missing the required Campaign Hook section", () => {
      expect(() =>
        parseOriginResponse(
          JSON.stringify({
            title: "Voltframe",
            content:
              "### The Origin\nSomething happened.\n\n### What the World Knows\nNothing public.",
            lore: "### The Full Truth\nTrue.\n\n### Ongoing Consequence\nStill open.",
          }),
          prompt.resolved,
        ),
      ).toThrow(/Campaign Hook/);
    });

    it("throws (triggering the local fallback) when lore is missing the required Ongoing Consequence section", () => {
      expect(() =>
        parseOriginResponse(
          JSON.stringify({
            title: "Voltframe",
            content: VALID_CONTENT,
            lore: "### The Full Truth\nTrue.",
          }),
          prompt.resolved,
        ),
      ).toThrow(/Ongoing Consequence/);
    });

    it("throws (triggering the local fallback) on malformed JSON", () => {
      expect(() =>
        parseOriginResponse("not valid json at all", prompt.resolved),
      ).toThrow();
    });

    it("falls back to the resolved codename when the AI omits a title", () => {
      const output = parseOriginResponse(
        JSON.stringify({
          content: VALID_CONTENT,
          lore: VALID_LORE,
        }),
        prompt.resolved,
      );
      expect(output.title).toBe(prompt.resolved.codename);
    });

    it("rejects a banned placeholder title, triggering the local fallback", () => {
      expect(() =>
        parseOriginResponse(
          JSON.stringify({
            title: "Kael",
            content: VALID_CONTENT,
            lore: VALID_LORE,
          }),
          prompt.resolved,
        ),
      ).toThrow(/banned/);
    });

    it("always includes the origin-generator label even if the AI response omits it", () => {
      const output = parseOriginResponse(
        JSON.stringify({
          title: "Ferrowing",
          content: VALID_CONTENT,
          lore: VALID_LORE,
        }),
        prompt.resolved,
      );
      expect(output.labels).toContain("origin-generator");
    });

    it("rejects empty required sections instead of accepting a heading alone", () => {
      expect(() =>
        parseOriginResponse(
          JSON.stringify({
            content:
              "### The Origin\nSomething happened.\n\n### What the World Knows\nNothing public.\n\n### Campaign Hook\n",
            lore: VALID_LORE,
          }),
          prompt.resolved,
        ),
      ).toThrow(/empty content section/);
    });

    it("rejects section headings that are out of order or have extra text", () => {
      expect(() =>
        parseOriginResponse(
          JSON.stringify({
            content:
              "### The Origin\nSomething happened.\n\n### Campaign Hook (missing)\nA lead.\n\n### What the World Knows\nNothing public.",
            lore: VALID_LORE,
          }),
          prompt.resolved,
        ),
      ).toThrow(/section order/);
    });
  });
});
