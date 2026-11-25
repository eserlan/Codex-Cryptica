import { describe, expect, it, vi } from "vitest";
import { buildAdventurePrompt } from "@codex/adventure-engine";
import { createCaseExecutionState } from "./adventure-evaluation-model";
import {
  evaluationSteps,
  prepareEvaluationStep,
} from "./adventure-evaluation-context";
import { makeCase } from "./adventure-evaluation.fixtures";

describe("adventure evaluation context", () => {
  it("inherits case phases while retaining explicit step overrides", () => {
    const testCase = makeCase({
      phase: "roll-resolution",
      turns: [
        { playerAction: "Resolve." },
        { playerAction: "Start.", phase: "opening" },
      ],
    });
    expect(evaluationSteps(testCase).map((step) => step.phase)).toEqual([
      "roll-resolution",
      "opening",
    ]);
    expect(testCase.turns?.[0]?.phase).toBeUndefined();
    expect(evaluationSteps(makeCase({ turns: [] }))).toEqual([
      expect.objectContaining({
        phase: "action",
        playerAction: "Check the watch ledger.",
      }),
    ]);
  });

  it("honours explicit empty context, QA options, and prompt-size accounting", async () => {
    const testCase = makeCase({
      anchors: [
        {
          recordId: "loc-1",
          displayName: "Market",
          content: "Square",
          role: "anchor",
        },
      ],
    });
    const state = createCaseExecutionState(testCase.session);
    const prepare = vi.fn();
    const clearInteraction = vi.fn();
    const prepared = await prepareEvaluationStep(
      testCase,
      "qa-model",
      { playerAction: "Inspect.", anchors: [] },
      2,
      state,
      {
        generation: { generate: vi.fn(), clearInteraction },
        options: {
          grounding: { prepare },
          directorEnabled: false,
          contextMode: "reconstructed",
          reasoningEffort: "high",
        },
      },
    );

    expect(prepare).not.toHaveBeenCalled();
    expect(clearInteraction).toHaveBeenCalledWith(testCase.session.id);
    expect(prepared.request).toMatchObject({
      anchors: [],
      relevant: [],
      directorEnabled: false,
      contextMode: "reconstructed",
    });
    expect(prepared.generationOptions).toEqual({
      modelName: "qa-model",
      reasoningEffort: "high",
    });
    expect(state.retrievalHydrations).toBe(0);
    const prompt = buildAdventurePrompt({
      session: testCase.session,
      phase: "action",
      playerAction: "Inspect.",
      anchors: [],
      relevant: [],
      directorEnabled: false,
    });
    expect(state.serializedStateChars).toBe(
      JSON.stringify(prompt.state).length,
    );
    expect(state.generationInputChars).toBe(JSON.stringify(prompt).length);
  });

  it.each([false, true])(
    "counts grounded excerpts with hydration counters enabled=%s",
    async (useCounter) => {
      const testCase = makeCase();
      const state = createCaseExecutionState(testCase.session);
      const anchors = [
        {
          recordId: "loc-1",
          displayName: "Market",
          content: "Square",
          role: "anchor" as const,
        },
      ];
      const prepare = vi.fn(async () => ({
        vaultId: "vault-1",
        sessionId: testCase.session.id,
        revision: 0,
        purpose: "opening" as const,
        anchors,
        relevant: [],
      }));
      const counter = vi.fn().mockReturnValueOnce(4).mockReturnValueOnce(7);
      const prepared = await prepareEvaluationStep(
        testCase,
        "qa-model",
        { playerAction: "Start.", phase: "opening" },
        0,
        state,
        {
          generation: { generate: vi.fn() },
          options: {
            grounding: { prepare },
            ...(useCounter ? { getRetrievalHydrations: counter } : {}),
          },
        },
      );

      expect(prepare).toHaveBeenCalledWith({
        purpose: "opening",
        session: testCase.session,
        playerAction: "Start.",
      });
      expect(prepared.anchors).toBe(anchors);
      expect(state.retrievalHydrations).toBe(useCounter ? 3 : 1);
      expect(prepared.request).not.toHaveProperty("directorEnabled");
      expect(prepared.request).not.toHaveProperty("contextMode");
      expect(prepared.generationOptions).toEqual({ modelName: "qa-model" });
    },
  );

  it("propagates grounding failures before recording prompt sizes", async () => {
    const testCase = makeCase();
    const state = createCaseExecutionState(testCase.session);
    const prepare = vi.fn(async () => {
      throw new Error("retrieval failed");
    });
    await expect(
      prepareEvaluationStep(
        testCase,
        "qa-model",
        { playerAction: "Search." },
        0,
        state,
        {
          generation: { generate: vi.fn() },
          options: { grounding: { prepare } },
        },
      ),
    ).rejects.toThrow("retrieval failed");
    expect(state.serializedStateChars).toBe(0);
    expect(state.retrievalHydrations).toBe(0);
  });
});
