import { describe, expect, it } from "vitest";
import {
  buildPlotTwistPrompt,
  generatePlotTwistLocal,
  parsePlotTwistResponse,
  resolvePlotTwist,
  SUPERHERO_TWIST_ARCHETYPES,
} from "./public-plot-twist";

describe("resolvePlotTwist", () => {
  it("resolves supported options and safe defaults", () => {
    expect(
      resolvePlotTwist({
        premise: "The miners have stopped sending ore.",
        twistType: "Reversal",
        impact: "Subtle",
        timing: "Midpoint",
        foreshadowing: "Already hinted",
      }),
    ).toMatchObject({
      premise: "The miners have stopped sending ore.",
      twistType: "Reversal",
      impact: "Subtle",
      timing: "Midpoint",
      foreshadowing: "Already hinted",
    });

    expect(resolvePlotTwist({ twistType: "unknown" }).twistType).toBe("Random");
    expect(resolvePlotTwist({ premise: "  " }).premise).toBeTruthy();
  });
});

describe("buildPlotTwistPrompt", () => {
  it("grounds the prompt in the premise and continuity rules", () => {
    const prompt = buildPlotTwistPrompt({
      premise: "The queen's peace treaty is about to fail.",
      genre: "Cyberpunk / Corporate",
      twistType: "Hidden motive",
      constraints: "Do not change the villain.",
      campaignContext:
        "The treaty was signed by Queen Ilyra and the Dock Guild.",
    });

    expect(prompt.userMessage).toContain(
      "The queen's peace treaty is about to fail.",
    );
    expect(prompt.userMessage).toContain("Do not change the villain.");
    expect(prompt.userMessage).toContain("Queen Ilyra and the Dock Guild");
    expect(prompt.userMessage).toContain("content field MUST contain");
    expect(prompt.userMessage).toContain("Reserve lore for brief GM notes");
    expect(prompt.systemInstruction).toContain(
      "do not invalidate witnessed events",
    );
    expect(prompt.systemInstruction).toContain("meaningful player choices");
  });

  it("varies local titles when the random source varies", () => {
    const first = generatePlotTwistLocal(
      { premise: "The treaty is about to fail", twistType: "Reversal" },
      () => 0,
    );
    const second = generatePlotTwistLocal(
      { premise: "The treaty is about to fail", twistType: "Reversal" },
      () => 0.99,
    );

    expect(first.title).not.toBe(second.title);
  });
});

describe("Superhero / Comic Book plot twists", () => {
  it("steers the LLM prompt with genre-specific twist archetypes", () => {
    const prompt = buildPlotTwistPrompt({
      premise:
        "The city's newest hero just stopped a bank robbery live on camera.",
      genre: "Superhero / Comic Book",
    });

    expect(prompt.userMessage).toContain("Genre-specific twist archetypes");
    expect(prompt.userMessage).toContain("Secret identity revelation");
    expect(prompt.userMessage).toContain("Mentor betrayal");
    expect(prompt.userMessage).toContain("Legacy revelation");
    expect(prompt.userMessage).toContain(
      "The villain was protecting us from something worse",
    );
    expect(prompt.userMessage).toContain("Alternate-timeline consequences");
    for (const archetype of SUPERHERO_TWIST_ARCHETYPES) {
      expect(prompt.userMessage).toContain(archetype.label);
    }
  });

  it("does not append genre-specific twist archetypes for a non-Superhero genre", () => {
    const prompt = buildPlotTwistPrompt({
      premise: "The queen's peace treaty is about to fail.",
      genre: "Classic Fantasy",
    });

    expect(prompt.userMessage).not.toContain("Genre-specific twist archetypes");
    expect(prompt.userMessage).not.toContain("Secret identity revelation");
    expect(prompt.userMessage).not.toContain("Mentor betrayal");
  });

  it("produces a superhero-specific local reveal (identity) rather than a generic twist", () => {
    const output = generatePlotTwistLocal(
      {
        premise:
          "A masked hero just saved the mayor from an assassination attempt.",
        genre: "Superhero / Comic Book",
        twistType: "Revelation",
      },
      () => 0.2,
    );

    expect(output.content).toContain("civilian identity");
    expect(output.content).toContain("mask");
    expect(output.content).not.toContain("the pressure around");
  });

  it("produces a superhero-specific local reveal (betrayal) tied to a mentor", () => {
    const output = generatePlotTwistLocal(
      {
        premise: "The team's newest recruit uncovered a leak in their base.",
        genre: "Superhero / Comic Book",
        twistType: "Betrayal",
      },
      () => 0.2,
    );

    expect(output.content).toContain("mentor");
  });

  it("produces a superhero-specific local reveal (legacy) for a sympathetic ally twist", () => {
    const output = generatePlotTwistLocal(
      {
        premise:
          "An unaffiliated vigilante offered to help with the investigation.",
        genre: "Superhero / Comic Book",
        twistType: "Ally is helping for the wrong reason",
      },
      () => 0.2,
    );

    expect(output.content).toContain("heir or successor");
    expect(output.content).toContain("lineage");
  });

  it("falls back to the generic template for a non-Superhero genre with the same twist type", () => {
    const output = generatePlotTwistLocal(
      {
        premise:
          "A masked hero just saved the mayor from an assassination attempt.",
        genre: "Classic Fantasy",
        twistType: "Revelation",
      },
      () => 0.2,
    );

    expect(output.content).not.toContain("civilian identity");
    expect(output.content).toContain("the pressure around");
  });
});

describe("generatePlotTwistLocal", () => {
  it("always returns all playability sections and actionable choices", () => {
    const output = generatePlotTwistLocal(
      { premise: "A missing caravan delays the war." },
      () => 0.2,
    );

    expect(output.type).toBe("note");
    expect(output.kind).toBe("plot-twist");
    expect(output.labels).toEqual(
      expect.arrayContaining(["plot-twist", "complication"]),
    );
    for (const heading of [
      "## The Reveal",
      "## What Everyone Believed",
      "## Why It Makes Sense",
      "## Foreshadowing",
      "## Immediate Consequences",
      "## New Choices",
    ]) {
      expect(output.content).toContain(heading);
    }
    expect(output.content.match(/^- /gm)?.length).toBeGreaterThanOrEqual(7);
  });
});

describe("parsePlotTwistResponse", () => {
  it("parses structured JSON and accepts fenced responses", () => {
    const output = parsePlotTwistResponse(
      "```json\n" +
        JSON.stringify({
          title: "The Kindness Tax",
          summary: "The rescue effort is funding the enemy.",
          reveal:
            "The relief convoy is being taxed by a faction inside the alliance.",
          believedAssumption: "The convoy is simply late.",
          rationale:
            "The shortages and the alliance's good intentions remain true.",
          foreshadowing: [
            "Receipts are missing.",
            "The guards refuse to name the collector.",
          ],
          immediateConsequences: ["The next convoy is at risk."],
          newChoices: [
            "Expose the collector.",
            "Pay the tax and follow the money.",
          ],
          lore: "### GM Note\nThe truth creates leverage.",
        }) +
        "\n```",
      { premise: "A relief convoy is late." },
    );

    expect(output.title).toBe("The Kindness Tax");
    expect(output.content).toContain("## New Choices");
  });

  it("falls back to a complete result for malformed or incomplete JSON", () => {
    const output = parsePlotTwistResponse("{not json", {
      premise: "The lighthouse went dark.",
    });
    const incomplete = parsePlotTwistResponse(
      JSON.stringify({ reveal: "Only one field" }),
      { premise: "The lighthouse went dark." },
    );

    expect(output.content).toContain("## Immediate Consequences");
    expect(incomplete.content).toContain("## New Choices");
  });
});
