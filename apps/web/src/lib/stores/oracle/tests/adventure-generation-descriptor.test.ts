import { describe, expect, it } from "vitest";
import {
  generationDescriptorFor,
  sceneBoundaryResetReason,
} from "../adventure-runtime";
import { generateAcceptedTurn } from "../adventure-turn-retry";
import { createAdventureRuntime, completeProposal } from "./adventure-fixtures";

describe("generationDescriptorFor (#5112)", () => {
  it("classifies a stateless result as a fresh thread", () => {
    expect(
      generationDescriptorFor({
        ...completeProposal,
        generationInfo: { transport: "stateless" },
      }),
    ).toEqual({ transport: "stateless", threadMode: "new" });
  });

  it("classifies an interaction result and carries its reasoning effort", () => {
    expect(
      generationDescriptorFor({
        ...completeProposal,
        generationInfo: { transport: "interaction", reasoningEffort: "high" },
      }),
    ).toEqual({ transport: "interaction", reasoningEffort: "high" });
  });

  it("records a reset with an explicit reason on the retry attempt", () => {
    expect(
      generationDescriptorFor(
        {
          ...completeProposal,
          generationInfo: { transport: "interaction" },
        },
        { resetReason: "rejected-turn" },
      ),
    ).toEqual({
      transport: "interaction",
      threadMode: "reset",
      resetReason: "rejected-turn",
    });
  });

  it("returns no descriptor when there is nothing to record", () => {
    expect(generationDescriptorFor({ ...completeProposal })).toBeUndefined();
  });

  it("prefers an explicit caller model key, resolved at capture time", () => {
    expect(
      generationDescriptorFor(
        { ...completeProposal, generationInfo: { transport: "stateless" } },
        { modelKey: "gemini-flash-lite" },
      )?.modelKey,
    ).toBe("gemini-flash-lite");
  });
});

describe("sceneBoundaryResetReason (#5112)", () => {
  it("detects a declared scene move, and only a declared one", () => {
    const { state } = createAdventureRuntime();
    const session = state.session!;
    session.packageProgress = { sceneId: "entrance", version: 1 };
    const proposal = {
      ...completeProposal,
      visiblePatch: {
        ...completeProposal.visiblePatch,
        packageSceneId: "hall",
      },
    };
    expect(sceneBoundaryResetReason(session, proposal)).toBe("scene-boundary");
    expect(
      sceneBoundaryResetReason(session, {
        ...completeProposal,
        visiblePatch: {
          ...completeProposal.visiblePatch,
          packageSceneId: "entrance",
        },
      }),
    ).toBeUndefined();
    expect(sceneBoundaryResetReason(session, completeProposal)).toBeUndefined();
  });
});

describe("rejected-turn reset on retry (#5112)", () => {
  it("marks the retried turn as reset/rejected-turn, never the first attempt", async () => {
    const { state, runtime } = createAdventureRuntime();
    const session = state.session!;
    const descriptors: Array<string | undefined> = [];
    await generateAcceptedTurn({
      generate: async () => ({
        ...completeProposal,
        generationInfo: { transport: "interaction" as const },
      }),
      apply: (proposal, attempt) => {
        const descriptor = generationDescriptorFor(proposal, {
          resetReason:
            attempt === 2
              ? "rejected-turn"
              : sceneBoundaryResetReason(session, proposal),
        });
        descriptors.push(descriptor?.resetReason);
        if (attempt === 1) throw new Error("refused");
        return runtime.newTurnMetadata("Look", descriptor);
      },
      signal: new AbortController().signal,
      resetProviderContext: () => {},
    });
    expect(descriptors).toEqual([undefined, "rejected-turn"]);
  });
});

describe("newTurnMetadata without a descriptor (#5112)", () => {
  it("stays absent so legacy commit paths are unchanged", () => {
    const { runtime } = createAdventureRuntime();
    expect(runtime.newTurnMetadata("Look").generation).toBeUndefined();
    expect(runtime.rollMetadata("input-1").generation).toBeUndefined();
  });
});
