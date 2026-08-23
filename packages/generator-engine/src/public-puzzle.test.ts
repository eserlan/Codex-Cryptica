import { describe, expect, it } from "vitest";
import {
  buildPuzzlePrompt,
  generatePuzzleLocal,
  parsePuzzleResponse,
  resolvePuzzle,
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
    expect(output.content).toContain("## Clues");
    expect(output.content).not.toContain("GM-Only Solution");
    expect(output.lore).toContain("### GM-Only Solution");
    expect(output.lore).toContain("### Alternate Solutions");
    expect(output.lore).toContain("### Downstream Consequences");
    expect(output.lore).toContain("no class, spell, skill");
    expect(output.summary.length).toBeGreaterThan(100);
  });

  it("includes capability safety and genre fidelity in the prompt", () => {
    const { userMessage, systemInstruction } = buildPuzzlePrompt({
      genre: "Cyberpunk",
      style: "Mechanical",
      capabilities: "Earth elemental sorcerer",
    });
    expect(userMessage).toContain("Earth elemental sorcerer");
    expect(userMessage).toContain("### Escalating Hints");
    expect(systemInstruction).toContain("Never make progress depend");
    expect(systemInstruction).toContain("Respect the genre");
  });

  it("rejects malformed AI output so the web seam can fall back", () => {
    expect(() =>
      parsePuzzleResponse('{"title":"Missing sections","content":"Nope"}'),
    ).toThrow("missing required");
  });

  it("rejects AI output that leaves GM-only sections out of the rail", () => {
    expect(() =>
      parsePuzzleResponse(
        '{"content":"## Player-Facing Setup\\nx\\n## Clues\\ny","lore":"### At a Glance\\nx"}',
      ),
    ).toThrow("missing required");
  });

  it("defaults to system-neutral unless the user selects tailoring", () => {
    expect(resolvePuzzle({}).system).toBe("System-neutral");
    expect(resolvePuzzle({ system: "D&D 5e" }).system).toBe("D&D 5e");
  });

  it("only sends level and player count for system-specific tailoring", () => {
    const neutral = buildPuzzlePrompt({ partyLevel: "5", playerCount: "4" });
    const tailored = buildPuzzlePrompt({
      system: "D&D 5e",
      partyLevel: "5",
      playerCount: "4",
    });
    expect(neutral.userMessage).not.toContain("Party level / competence");
    expect(neutral.userMessage).not.toContain("Player count");
    expect(tailored.userMessage).toContain("Party level / competence");
    expect(tailored.userMessage).toContain("Player count");
  });
});
