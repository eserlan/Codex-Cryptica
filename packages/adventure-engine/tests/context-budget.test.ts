import { describe, expect, it } from "bun:test";
import { allocatePromptBudget } from "../src/context-budget";
import { buildAdventurePrompt } from "../src/prompt";
import {
  MAX_GENERATION_INPUT_CHARS,
  MAX_SERIALIZED_STATE_CHARS,
} from "../src/session-budget";
import { session } from "./reducer-fixtures";

describe("allocatePromptBudget", () => {
  it("keeps GM-only lore separate and within its own retrieval budget", () => {
    const result = allocatePromptBudget({
      behavior: "GM",
      state: "{}",
      input: "{}",
      transcript: "[]",
      anchors: [],
      relevant: [
        {
          recordId: "bridge-1",
          displayName: "Flooded Bridge",
          content: "public fact",
          lore: "s".repeat(6_001),
          role: "turn-source",
        },
      ],
    });

    expect(result.relevant[0]).toEqual(
      expect.objectContaining({
        content: "public fact",
        lore: expect.stringMatching(/^s+…$/),
      }),
    );
    expect(JSON.parse(result.serialized).relevant[0].lore).toHaveLength(6_000);
  });
});

describe("current-turn prompt input", () => {
  const longSession = () => ({
    ...session(),
    // The premise must be longer than the old 600-character total input cap.
    premise: "A contested spring lies beneath the city. ".repeat(13),
  });

  it("keeps an exact player action after a long premise", () => {
    const currentSession = longSession();
    const playerAction =
      "Examine the brass seal: read the maker's marks and the inscription. " +
      "Look closely. ".repeat(30);
    const prompt = buildAdventurePrompt({
      session: currentSession,
      phase: "action",
      playerAction,
      anchors: [],
      relevant: [],
    });
    const payload = JSON.parse(prompt.serialized);

    expect(typeof payload.input).toBe("object");
    expect(payload.input).toEqual({
      adventure: {
        title: currentSession.title,
        premise: currentSession.premise,
        playerCharacter: currentSession.playerCharacter,
      },
      phase: "action",
      playerAction,
    });
    expect(prompt.serialized.length).toBeLessThanOrEqual(
      MAX_GENERATION_INPUT_CHARS,
    );
  });

  it("preserves roll outcomes and the opening phase with long premises", () => {
    const currentSession = longSession();
    const rollResolution = {
      kind: "numeric" as const,
      value: 19,
      label: "1d20 = 19",
      parts: [{ type: "dice" as const, value: 19, sides: 20, rolls: [19] }],
    };
    const opening = buildAdventurePrompt({
      session: currentSession,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    const resolution = buildAdventurePrompt({
      session: currentSession,
      phase: "roll-resolution",
      rollResolution,
      anchors: [],
      relevant: [],
    });

    expect(JSON.parse(opening.serialized).input.phase).toBe("opening");
    expect(JSON.parse(opening.serialized).input.adventure.premise).toBe(
      currentSession.premise,
    );
    expect(JSON.parse(resolution.serialized).input).toEqual({
      adventure: {
        title: currentSession.title,
        premise: currentSession.premise,
        playerCharacter: currentSession.playerCharacter,
      },
      phase: "roll-resolution",
      rollResolution,
    });
  });

  it("rejects requests beyond the overall budget rather than trimming actions", () => {
    expect(() =>
      allocatePromptBudget({
        behavior: "GM",
        state: "{}",
        input: JSON.stringify({
          phase: "action",
          playerAction: "x".repeat(MAX_GENERATION_INPUT_CHARS),
        }),
        transcript: "[]",
        anchors: [],
        relevant: [],
      }),
    ).toThrow("generation-budget-exceeded");
  });

  it("bounds oversized durable state sections to MAX_SERIALIZED_STATE_CHARS in prompts without mutating session", () => {
    const currentSession = session();
    currentSession.hiddenState.secrets = Array.from({ length: 30 }, (_, i) => ({
      id: `secret-${i}`,
      text: `Secret ${i}: ${"s".repeat(1_500)}`,
      status: "hidden" as const,
    }));
    currentSession.provisionalFacts = Array.from({ length: 30 }, (_, i) => ({
      id: `prov-${i}`,
      kind: "clue" as const,
      name: `Clue ${i}`,
      summary: "p".repeat(1_500),
      visibility: "player-visible" as const,
    }));
    currentSession.storySoFar = {
      text: "Earlier events. ".repeat(2_000),
      throughSequence: 10,
      updatedAt: currentSession.updatedAt,
    };

    const prompt = buildAdventurePrompt({
      session: currentSession,
      phase: "action",
      playerAction: "Inspect the ledger.",
      anchors: [],
      relevant: [],
    });

    expect(prompt.state.length).toBeLessThanOrEqual(MAX_SERIALIZED_STATE_CHARS);
    expect(prompt.serialized.length).toBeLessThanOrEqual(
      MAX_GENERATION_INPUT_CHARS,
    );
    expect(currentSession.hiddenState.secrets).toHaveLength(30);
    expect(currentSession.provisionalFacts).toHaveLength(30);
  });
});
