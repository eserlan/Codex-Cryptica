import { describe, expect, it } from "vitest";
import { applyCompletedTurn } from "../src/completed-turn";
import { parseAdventureSession } from "../src";
import { meta, now, proposal, session } from "./reducer-fixtures";
import type { GenerationMetadata } from "../src";

const generation: GenerationMetadata = {
  modelKey: "gemini-flash-lite",
  reasoningEffort: "medium",
  transport: "interaction",
  threadMode: "continued",
  requestChars: 12_345,
  sourceCounts: { anchors: 2, relevant: 5 },
  scenarioIds: ["scenario-1"],
};

describe("generation metadata on committed turns", () => {
  it("stamps the descriptor supplied by the app layer on the committed turn", () => {
    const result = applyCompletedTurn(session(), proposal(), {
      ...meta,
      generation,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const turn = result.value.turns[0]!;
    expect(turn.generation).toMatchObject({
      modelKey: "gemini-flash-lite",
      reasoningEffort: "medium",
      transport: "interaction",
      threadMode: "continued",
      requestChars: 12_345,
      sourceCounts: { anchors: 2, relevant: 5 },
      scenarioIds: ["scenario-1"],
    });
  });

  it("classifies progressCategory with the #5110 vocabulary at commit", () => {
    const result = applyCompletedTurn(session(), proposal(), {
      ...meta,
      generation,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // A caller-supplied category never overrides the in-engine one.
    expect(result.value.turns[0]?.generation?.progressCategory).toEqual(
      expect.any(String),
    );
    expect(result.value.turns[0]?.generation?.progressCategory).not.toBe(
      generation.progressCategory,
    );
  });

  it("copies the descriptor so later caller mutation cannot rewrite the turn", () => {
    const caller = { ...generation, scenarioIds: ["scenario-1"] };
    const result = applyCompletedTurn(session(), proposal(), {
      ...meta,
      generation: caller,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    caller.scenarioIds.push("scenario-2");
    expect(result.value.turns[0]?.generation?.scenarioIds).toEqual([
      "scenario-1",
    ]);
  });

  it("leaves generation absent when no descriptor is supplied", () => {
    const result = applyCompletedTurn(session(), proposal(), meta, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.turns[0]?.generation).toBeUndefined();
  });

  it("round-trips generation metadata through save and reload", () => {
    const result = applyCompletedTurn(session(), proposal(), {
      ...meta,
      generation,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const reloaded = parseAdventureSession(
      JSON.parse(JSON.stringify(result.value)),
    );
    expect(reloaded.turns[0]?.generation).toMatchObject({
      modelKey: "gemini-flash-lite",
      transport: "interaction",
      threadMode: "continued",
      requestChars: 12_345,
    });
    expect(reloaded.turns[0]?.generation?.progressCategory).toEqual(
      result.value.turns[0]?.generation?.progressCategory,
    );
  });

  it("parses and exports a legacy turn that has no generation metadata", () => {
    const result = applyCompletedTurn(session(), proposal(), meta, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const legacy = JSON.parse(JSON.stringify(result.value));
    expect(legacy.turns[0]).not.toHaveProperty("generation");
    const reloaded = parseAdventureSession(legacy);
    expect(reloaded.turns[0]?.generation).toBeUndefined();
    expect(JSON.stringify(reloaded.turns[0])).not.toContain("generation");
  });

  it("rejects an out-of-vocabulary transport on persisted data", () => {
    const result = applyCompletedTurn(session(), proposal(), {
      ...meta,
      generation,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tampered = JSON.parse(JSON.stringify(result.value));
    tampered.turns[0].generation.transport = "telepathy";
    expect(() => parseAdventureSession(tampered)).toThrow();
  });
});
