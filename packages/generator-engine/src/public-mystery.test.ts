import { describe, expect, it } from "vitest";
import { factionConfig } from "./public-faction-constants";
import {
  buildMysteryPrompt,
  extractMysteryNames,
  generateMysteryLocal,
  mysteryConfig,
  parseMysteryResponse,
  resolveMystery,
} from "./public-mystery";

describe("Mystery & Investigation generator", () => {
  it("offers the complete shared theme catalogue as mystery genres", () => {
    expect(mysteryConfig.genres).toEqual(factionConfig.themes);
  });

  it("resolves suspect counts from the selected complexity", () => {
    expect(
      resolveMystery({ complexity: mysteryConfig.complexities[0] })
        .suspectCount,
    ).toBe(3);
    expect(
      resolveMystery({ complexity: mysteryConfig.complexities[1] })
        .suspectCount,
    ).toBe(4);
    expect(
      resolveMystery({ complexity: mysteryConfig.complexities[2] })
        .suspectCount,
    ).toBe(5);
  });

  it("builds a fixed-truth prompt with selected options, context and name exclusions", () => {
    const prompt = buildMysteryPrompt(
      {
        genre: "Science Fiction",
        mysteryType: "Conspiracy",
        campaignContext: "The orbiting city of Meridian",
        avoidNames: ["Rook", "Meridian"],
      },
      "Recent case: Rook disappeared.",
    );
    expect(prompt.resolved.genre).toBe("Science Fiction");
    expect(prompt.userMessage).toContain('"mysteryType":"Conspiracy"');
    expect(prompt.userMessage).toContain("The orbiting city of Meridian");
    expect(prompt.userMessage).toContain("Recent case: Rook disappeared.");
    expect(prompt.userMessage).toContain("Rook");
    expect(prompt.userMessage).not.toContain(
      "Already created or used this session — do NOT reuse these names or generate duplicate concepts: Meridian",
    );
    expect(prompt.userMessage).toContain("two independent paths");
    expect(prompt.userMessage).toContain("player-facing text");
    expect(prompt.userMessage).toMatch(/return only JSON/i);
  });

  it("creates a deterministic local draft and keeps GM truth in Lore", () => {
    const options = {
      genre: "Detective / Noir",
      campaignContext: "GM secret: Mara is responsible",
    };
    const first = generateMysteryLocal(options, () => 0);
    const second = generateMysteryLocal(options, () => 0);
    expect(first).toEqual(second);
    expect(first.type).toBe("note");
    expect(first.content).not.toContain("GM secret");
    expect(first.content).toContain("Evidence");
    expect(first.lore).toContain("GM-Only Fixed Truth");
    expect(first.lore).not.toBe(first.content);
    const names = [...first.content.matchAll(/\*\*([^*]+) —/g)].map(
      (match) => match[1],
    );
    expect(new Set(names).size).toBe(names.length);
  });

  it("fails after bounded name selection when every fallback is banned", () => {
    expect(() =>
      generateMysteryLocal({ avoidNames: ["Case Witness"] }, () => 0),
    ).toThrow("Could not generate a mystery name");
  });

  it("rejects malformed or incomplete one-pass model output for fallback", () => {
    expect(parseMysteryResponse("not JSON")).toBeNull();
    expect(
      parseMysteryResponse('{"title":"Incomplete","content":"Player text"}'),
    ).toBeNull();
    expect(
      parseMysteryResponse(
        JSON.stringify({
          title: "Complete",
          summary: "Summary",
          content: "Player case",
          lore: "GM truth",
        }),
      ),
    ).toMatchObject({
      type: "note",
      title: "Complete",
      content: "Player case",
      lore: "GM truth",
      status: "draft",
    });
  });

  it("strips remote Markdown and HTML images from one-pass model output", () => {
    const result = parseMysteryResponse(
      JSON.stringify({
        title: "Complete",
        summary: "Summary",
        playerContent: "Clue ![x](https://tracker.example/pixel)",
        gmTruth: 'Truth <img src="https://tracker.example/pixel">',
      }),
    );
    expect(result?.content).toBe("Clue x");
    expect(result?.lore).toBe("Truth ");
  });
});

describe("buildMysteryPrompt concept block", () => {
  it("includes a rolled concept in the one-pass prompt", () => {
    const prompt = buildMysteryPrompt({ genre: "Pirate", tone: "Tense" });
    expect(prompt.userMessage).toContain("Concept constraints for this case");
  });

  it("keeps the caller's session context in the prompt", () => {
    const prompt = buildMysteryPrompt(
      { genre: "Pirate", tone: "Tense" },
      "SESSION NOTE: keep it short",
    );
    expect(prompt.userMessage).toContain("SESSION NOTE: keep it short");
    expect(prompt.userMessage).toContain("Concept constraints for this case");
  });
});

describe("buildMysteryPrompt context", () => {
  it("keeps the one-pass concept out of the context the staged route uses", () => {
    const prompt = buildMysteryPrompt(
      { genre: "Pirate", tone: "Tense" },
      "SESSION NOTE: keep it short",
    );
    expect(prompt.context).toContain("SESSION NOTE: keep it short");
    expect(prompt.context).not.toContain("Concept constraints for this case");
    expect(prompt.userMessage).toContain("Concept constraints for this case");
  });
});

describe("extractMysteryNames", () => {
  it("extracts person node labels from the mystery graph", () => {
    const names = extractMysteryNames({
      mysteryGraph: {
        nodes: [
          { kind: "person", label: "Orsik Pell" },
          { kind: "person", label: "Mara Vane" },
          { kind: "location", label: "Old Archive" },
          { kind: "item", label: "Ledger" },
        ],
      },
    });
    expect(names).toEqual(["Orsik Pell", "Mara Vane"]);
  });

  it("extracts culprit from lore when graph nodes are absent", () => {
    const names = extractMysteryNames({
      lore: "## GM Truth\n**Responsible party:** Valen Cross\nTheir motive was desperate debt.",
    });
    expect(names).toContain("Valen Cross");
  });

  it("extracts suspect names from content bullet lists", () => {
    const names = extractMysteryNames({
      content:
        "## People to Question\n- **Kaelen Voss — Keeper:** Present at the watch.\n- **Elora Dane — Courier:** Delivered the dispatch.",
    });
    expect(names).toEqual(["Kaelen Voss", "Elora Dane"]);
  });

  it("returns an empty array when no person names are found", () => {
    expect(extractMysteryNames({})).toEqual([]);
    expect(extractMysteryNames({ content: "No names here" })).toEqual([]);
  });
});
