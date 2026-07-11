import { describe, it, expect } from "vitest";
import {
  generateShipLocal,
  buildShipPrompt,
  parseShipResponse,
  shipConfig,
} from "./public-ship";

const seededRng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

describe("generateShipLocal", () => {
  it("returns a valid PublicGeneratorOutput shape", () => {
    const result = generateShipLocal({}, seededRng(42));
    expect(result).toMatchObject({
      type: "location",
      title: expect.any(String),
      summary: expect.any(String),
      content: expect.any(String),
      lore: expect.any(String),
      labels: expect.arrayContaining(["rpg-ship"]),
      status: "active",
    });
  });

  it("uses provided options", () => {
    const result = generateShipLocal(
      {
        genre: "Space Opera",
        role: "Flagship",
        scale: "Capital ship (500–2,000 crew)",
        condition: "Pristine — fresh from the shipyard",
      },
      seededRng(1),
    );
    expect(result.lore).toContain("Flagship");
    expect(result.content).toBeTruthy();
  });

  it("gives Pirate ships a captain and crew culture", () => {
    const result = generateShipLocal(
      { genre: "Pirate / Age of Sail" },
      seededRng(11),
    );

    expect(result.content).toContain("## Captain & Crew");
    expect(result.lore).toContain("**Captain**:");
    expect(result.lore).toContain("**Crew Culture**:");
  });

  it("generates non-empty content sections", () => {
    const result = generateShipLocal({}, seededRng(99));
    expect(result.content).toContain("## Core Concept");
    expect(result.content).toContain("## First Look");
    expect(result.content).toContain("## History");
  });

  it("generates non-empty lore sections", () => {
    const result = generateShipLocal({}, seededRng(7));
    expect(result.lore).toContain("### Ship Profile");
    expect(result.lore).toContain("### Key Zones");
    expect(result.lore).toContain("### Complication");
    expect(result.lore).toContain("### Secret");
    expect(result.lore).toContain("### Adventure Hooks");
  });

  it("covers all supported genres without throwing", () => {
    for (const genre of shipConfig.genres) {
      expect(() => generateShipLocal({ genre }, seededRng(123))).not.toThrow();
    }
  });

  it("produces different results for different seeds", () => {
    const a = generateShipLocal({}, seededRng(1));
    const b = generateShipLocal({}, seededRng(500));
    // At minimum title or summary should differ
    expect(a.title !== b.title || a.summary !== b.summary).toBe(true);
  });
});

describe("buildShipPrompt", () => {
  it("returns systemInstruction, userMessage, and resolved", () => {
    const result = buildShipPrompt({}, "", seededRng(1));
    expect(result).toMatchObject({
      systemInstruction: expect.any(String),
      userMessage: expect.any(String),
      resolved: expect.objectContaining({
        name: expect.any(String),
        genre: expect.any(String),
        role: expect.any(String),
      }),
    });
  });

  it("includes campaignContext in userMessage when provided", () => {
    const result = buildShipPrompt(
      { campaignContext: "near the Vega Rift" },
      "",
      seededRng(1),
    );
    expect(result.userMessage).toContain("Vega Rift");
  });

  it("respects provided options", () => {
    const result = buildShipPrompt(
      { genre: "Cyberpunk", role: "Ghost Ship" },
      "",
      seededRng(1),
    );
    expect(result.userMessage).toContain("Cyberpunk");
    expect(result.userMessage).toContain("Ghost Ship");
  });

  it("asks for Pirate captain and crew details", () => {
    const result = buildShipPrompt(
      { genre: "Pirate / Age of Sail" },
      "",
      seededRng(3),
    );

    expect(result.userMessage).toContain("- Captain:");
    expect(result.userMessage).toContain("- Crew Culture:");
    expect(result.userMessage).toContain("### Captain & Crew");
  });
});

describe("parseShipResponse", () => {
  it("parses a valid AI response", () => {
    const resolved = buildShipPrompt({}, "", seededRng(1)).resolved;
    const aiText = JSON.stringify({
      title: "The Ember Pact",
      summary: "A freighter that has survived by asking no questions.",
      content:
        "## Core Concept\nSomething.\n\n## First Look\nSomething.\n\n## History\nSomething.",
      lore: "### Ship Profile\n- **Class**: Freighter",
      labels: ["rpg-ship", "imported-draft"],
    });
    const result = parseShipResponse(aiText, resolved);
    expect(result.title).toBe("The Ember Pact");
    expect(result.type).toBe("location");
    expect(result.status).toBe("active");
  });

  it("strips markdown fences from AI response", () => {
    const resolved = buildShipPrompt({}, "", seededRng(1)).resolved;
    const aiText =
      "```json\n" +
      JSON.stringify({
        title: "ISS Horizon",
        content: "x",
        lore: "y",
        labels: [],
      }) +
      "\n```";
    const result = parseShipResponse(aiText, resolved);
    expect(result.title).toBe("ISS Horizon");
  });

  it("falls back to resolved name when title is absent", () => {
    const { resolved } = buildShipPrompt({ genre: "Sci-Fi" }, "", seededRng(1));
    const result = parseShipResponse(
      JSON.stringify({ content: "x", lore: "y" }),
      resolved,
    );
    expect(result.title).toBe(resolved.name);
  });
});
