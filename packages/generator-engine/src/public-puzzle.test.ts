import { describe, expect, it } from "vitest";
import {
  buildPuzzlePrompt,
  generatePuzzleLocal,
  parsePuzzleResponse,
  puzzleConfig,
  resolvePuzzle,
} from "./public-puzzle";
import { factionConfig } from "./public-faction-constants";

describe("Puzzle generator", () => {
  it("uses CC's complete canonical theme vocabulary", () => {
    expect(puzzleConfig.genres).toEqual(factionConfig.themes);
    expect(puzzleConfig.genres).toContain("Lancer");
    expect(puzzleConfig.genres).toContain("Optimistic Exploration Sci-Fi");
  });

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
    expect(output.content).toContain("## Character Spotlight Opportunities");
    expect(output.content).toContain("## Alternate Solutions");
    expect(output.content).toContain("## Failure & Escalation");
    expect(output.content).toContain("## Running the Puzzle");
    expect(output.content).toContain("## Scaling");
    expect(output.content).toContain("## Downstream Consequences");
    expect(output.lore).toContain("### GM-Only Solution");
    expect(output.lore).toContain("### Escalating Hints");
    expect(output.lore).not.toContain("### Alternate Solutions");
    expect(output.lore).toContain("no class, spell, skill");
    expect(output.summary).toContain("A locked mechanism");
    expect(output.summary).toContain("disable the device");
    expect(output.content).toContain("attempt to disable the device");
  });

  it("uses grammatical action text for every puzzle purpose", () => {
    const expectedActions = {
      "Sealed door": "open the sealed door",
      "Retrieve object": "retrieve the object",
      "Disable device": "disable the device",
      "Destroy relic or organ": "destroy the relic or organ",
      Escape: "escape the danger",
      "Cross obstacle": "cross the obstacle",
      "Reveal secret": "reveal the secret",
      "Complete ritual": "complete the ritual",
      "Survive trap": "survive the trap",
    };

    for (const [purpose, action] of Object.entries(expectedActions)) {
      const output = generatePuzzleLocal({ purpose }, () => 0);
      expect(output.summary).toContain(`attempt to ${action}`);
      expect(output.content).toContain(`attempt to ${action}`);
    }
  });

  it("includes capability safety and genre fidelity in the prompt", () => {
    const { userMessage, systemInstruction } = buildPuzzlePrompt({
      genre: "Cyberpunk",
      style: "Mechanical",
      capabilities: "Earth elemental sorcerer",
    });
    expect(userMessage).toContain("Earth elemental sorcerer");
    expect(userMessage).toContain("### Escalating Hints");
    expect(userMessage).toContain("actual setting or obstacle");
    expect(systemInstruction).toContain("Never make progress depend");
    expect(systemInstruction).toContain("Respect the genre");
  });

  it("rejects malformed AI output so the web seam can fall back", () => {
    expect(() =>
      parsePuzzleResponse('{"title":"Missing sections","content":"Nope"}'),
    ).toThrow("missing required");
  });

  it("keeps an AI-written puzzle summary instead of replacing it with boilerplate", () => {
    const output = parsePuzzleResponse(
      JSON.stringify({
        title: "The Five Spurs of Saint Mercy",
        summary:
          "Five iron rails converge on a buried saint's heart beneath a desert chapel. The party must shift their spurs before the bell tolls and stops an entire town's hearts.",
        content:
          "## Player-Facing Setup\nA chapel floor groans.\n\n## Clues\nA spur bears a sun.\n\n## Character Spotlight Opportunities\nAnyone can study the rails.\n\n## Alternate Solutions\nBreak a spur.\n\n## Failure & Escalation\nThe bell rings.\n\n## Running the Puzzle\nDescribe each movement.\n\n## Scaling\nUse three rails.",
        lore: "### At a Glance\n- **Style:** Spatial\n\n### GM-Only Solution\nMove the river spur first.\n\n### Escalating Hints\n1. Follow the mosaic.",
      }),
    );

    expect(output.summary).toContain("Five iron rails converge");
    expect(output.summary).not.toContain("fail-forward play");
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
