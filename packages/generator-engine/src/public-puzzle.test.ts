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
    expect(output.summary).toContain("A slowly flooding chamber");
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

  it("warns against defaulting to lamps/light fixtures as the puzzle mechanism (#3005)", () => {
    const { userMessage } = buildPuzzlePrompt({ genre: "Fantasy" });
    expect(userMessage).toContain("Avoid defaulting to lamps");
    expect(userMessage).toContain("sconces, torches, or other light fixtures");
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

  it("picks an obstacle that matches the puzzle style", () => {
    const rngs = [() => 0, () => 0.5, () => 0.99];
    const socialSetups = rngs.map(
      (rng) => generatePuzzleLocal({ style: "Social" }, rng).content,
    );
    expect(socialSetups.join("\n")).toMatch(/gatekeeper|guards|keeper/);
    expect(socialSetups.join("\n")).not.toContain("locked mechanism");
    expect(
      generatePuzzleLocal({ style: "Mechanical" }, () => 0).summary,
    ).toContain("A locked mechanism");
  });

  it("uses a neutral obstacle for a custom style and never 'a' before a vowel", () => {
    const custom = generatePuzzleLocal({ style: "Riddle" }, () => 0);
    expect(custom.title).toBe("Riddle Trial: Sealed door");
    expect(custom.content).toContain("a puzzling obstacle");
    for (const style of [...puzzleConfig.styles, "Riddle"]) {
      for (const rng of [() => 0, () => 0.5, () => 0.99]) {
        const output = generatePuzzleLocal({ style }, rng);
        expect(output.summary).not.toMatch(/^A [aeiou]/i);
        expect(output.content).not.toMatch(/finds a [aeiou]/i);
      }
    }
  });

  it("keeps the GM's own option for every select instead of the first choice", () => {
    const resolved = resolvePuzzle({
      purpose: "Open the reliquary",
      complexity: "Brutal",
      style: "Riddle",
      participationStyle: "Everyone at once",
      failurePressure: "Lose a hireling",
      system: "Cypher System",
    });
    expect(resolved).toMatchObject({
      purpose: "Open the reliquary",
      complexity: "Brutal",
      style: "Riddle",
      participationStyle: "Everyone at once",
      failurePressure: "Lose a hireling",
      system: "Cypher System",
    });
    const output = generatePuzzleLocal(resolved, () => 0);
    expect(output.summary).toContain("the party's goal: open the reliquary");
    expect(output.content).toContain(
      "bring in the chosen pressure (lose a hireling)",
    );
    expect(output.content).toContain("everyone at once");
    expect(output.lore).toContain("- **System:** Cypher System");
    expect(output.lore).toContain("- **Purpose:** Open the reliquary");
    expect(output.lore).toContain("- **Style:** Riddle");
    expect(output.lore).toContain("- **Failure pressure:** Lose a hireling");
    expect(
      generatePuzzleLocal({ failurePressure: "NPC ambush" }, () => 0).content,
    ).toContain("(NPC ambush)");
    expect(buildPuzzlePrompt(resolved).userMessage).toContain(
      "Purpose: Open the reliquary",
    );
  });

  it("falls back to defaults for blank options and bounds long custom text", () => {
    const resolved = resolvePuzzle({
      purpose: "   ",
      style: "",
      system: " ",
      complexity: "x".repeat(500),
      failurePressure: 42 as unknown as string,
    });
    expect(resolved.failurePressure).toBe("None");
    expect(resolved.purpose).toBe("Sealed door");
    expect(resolved.style).toBe("Environmental");
    expect(resolved.system).toBe("System-neutral");
    expect(resolved.complexity).toHaveLength(120);
  });

  it("sizes the GM-only solution by complexity", () => {
    const actions = (complexity: string) =>
      generatePuzzleLocal({ complexity }, () => 0).lore;
    expect(actions("Simple")).toContain("pattern of two linked actions");
    expect(actions("Moderate")).toContain("pattern of three linked actions");
    expect(actions("Elaborate")).toContain("pattern of four linked actions");
    expect(actions("Brutal")).toContain("pattern of three linked actions");
  });

  it("writes a grammatical escalation for each failure pressure", () => {
    const expected = {
      Complication: "add a complication",
      "Time pressure": "advance a visible clock",
      Danger: "expose the party to harm",
      Combat: "wake a guardian or bring in hostile reinforcements",
    };
    for (const [failurePressure, phrase] of Object.entries(expected)) {
      const { content } = generatePuzzleLocal({ failurePressure }, () => 0);
      expect(content).toContain(`On a failed attempt, ${phrase}`);
      expect(content).not.toMatch(/apply (danger|combat|complication)/);
    }
    expect(
      generatePuzzleLocal({ failurePressure: "None" }, () => 0).content,
    ).toContain("without adding pressure");
  });

  it("gives each participation style its own spotlight guidance", () => {
    const notes = puzzleConfig.participationStyles.map(
      (participationStyle) =>
        generatePuzzleLocal({ participationStyle }, () => 0).content,
    );
    expect(new Set(notes).size).toBe(puzzleConfig.participationStyles.length);
    expect(notes[1]).toContain("single character's background");
  });

  it("keeps campaign context in the GM notes, not the public text", () => {
    const output = generatePuzzleLocal(
      { campaignContext: "The Ashen Court hunts the party." },
      () => 0,
    );
    expect(output.lore).toContain(
      "### Campaign Context\nThe Ashen Court hunts the party.",
    );
    expect(output.content).not.toContain("Ashen Court");
    expect(output.summary).not.toContain("Ashen Court");
    expect(generatePuzzleLocal({}, () => 0).lore).not.toContain(
      "### Campaign Context",
    );
  });

  it("lists party level and player count only for system tailoring", () => {
    const neutral = generatePuzzleLocal(
      { partyLevel: "5", playerCount: "4" },
      () => 0,
    );
    const tailored = generatePuzzleLocal(
      { system: "D&D 5e", partyLevel: "5", playerCount: "4" },
      () => 0,
    );
    expect(neutral.lore).not.toContain("Party level");
    expect(neutral.lore).not.toContain("**Players:**");
    expect(tailored.lore).toContain("- **Party level:** 5");
    expect(tailored.lore).toContain("- **Players:** 4");
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
