import { describe, expect, it } from "vitest";
import {
  buildPuzzlePrompt,
  generatePuzzleLocal,
  parsePuzzleResponse,
} from "./public-puzzle";

describe("Puzzle generator", () => {
  it("creates a table-ready, non-gated local puzzle", () => {
    const output = generatePuzzleLocal(
      {
        genre: "Sci-Fi",
        purpose: "Disable device",
        capabilities: "stealth and arcane analysis",
        downstreamConsequence: "The boss loses its shield.",
      },
      () => 0,
    );
    expect(output.content).toContain("## Player-Facing Setup");
    expect(output.content).toContain("## GM-Only Solution");
    expect(output.content).toContain("## Alternate Solutions");
    expect(output.content).toContain("## Downstream Consequences");
    expect(output.content).toContain("no class, spell, skill");
  });

  it("includes capability safety and genre fidelity in the prompt", () => {
    const { userMessage, systemInstruction } = buildPuzzlePrompt({
      genre: "Cyberpunk",
      style: "Mechanical",
      capabilities: "Earth elemental sorcerer",
    });
    expect(userMessage).toContain("Earth elemental sorcerer");
    expect(userMessage).toContain("## Escalating Hints");
    expect(systemInstruction).toContain("Never make progress depend");
    expect(systemInstruction).toContain("Respect the genre");
  });

  it("rejects malformed AI output so the web seam can fall back", () => {
    expect(() =>
      parsePuzzleResponse('{"title":"Missing sections","content":"Nope"}'),
    ).toThrow("missing required");
  });
});
