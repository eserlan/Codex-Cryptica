import { describe, expect, it, vi } from "vitest";
import type { AdventureContinuationCandidate } from "@codex/adventure-engine";
import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
import { AdventureFocusCompletion } from "./adventure-focus-completion.svelte.js";

function setup() {
  const manager = {
    readOnly: false,
    phase: "ready",
    session: null,
    acknowledgeCompletion: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    launchContinuation: vi.fn().mockResolvedValue(undefined),
  };
  const notify = vi.fn();
  const restoreFocus = vi.fn();
  const completion = new AdventureFocusCompletion(
    () => manager as unknown as AdventureManager,
    restoreFocus,
    { notify },
  );
  return { manager, completion, notify, restoreFocus };
}

describe("AdventureFocusCompletion", () => {
  it("acknowledges a completion and restores the composer focus", async () => {
    const { completion, manager, restoreFocus } = setup();
    await completion.continueExploring("outcome-1");
    expect(manager.acknowledgeCompletion).toHaveBeenCalledWith("outcome-1");
    expect(restoreFocus).toHaveBeenCalledOnce();
    expect(completion.busy).toBe(false);
    expect(completion.pending).toBeNull();
    expect(completion.continuations).toBeNull();
  });

  it("does not write an acknowledgement in a read-only view", async () => {
    const { completion, manager, restoreFocus } = setup();
    manager.readOnly = true;
    await completion.continueExploring("outcome-1");
    expect(manager.acknowledgeCompletion).not.toHaveBeenCalled();
    expect(restoreFocus).toHaveBeenCalledOnce();
  });

  it.each(["findAnother", "finish"] as const)(
    "%s proceeds after a failed acknowledgement without focusing the composer",
    async (action) => {
      const { completion, manager, notify, restoreFocus } = setup();
      manager.acknowledgeCompletion.mockRejectedValue(new Error("save"));
      await completion[action]("outcome-1");
      expect(
        action === "finish" ? manager.end : manager.close,
      ).toHaveBeenCalledOnce();
      expect(notify).toHaveBeenCalledWith(
        "Dismissed for this view, but the acknowledgement could not be saved.",
        "error",
      );
      expect(restoreFocus).not.toHaveBeenCalled();
      expect(completion.busy).toBe(false);
    },
  );

  it("ignores overlapping completion actions and releases its guard on failure", async () => {
    const { completion, manager, notify } = setup();
    let reject!: (error: Error) => void;
    manager.acknowledgeCompletion.mockReturnValueOnce(
      new Promise<void>((_resolve, rejectPromise) => (reject = rejectPromise)),
    );
    const pending = completion.continueExploring("outcome-1");
    expect(completion.busy).toBe(true);
    await completion.finish("outcome-1");
    expect(manager.end).not.toHaveBeenCalled();
    reject(new Error("save"));
    await pending;
    expect(manager.acknowledgeCompletion).toHaveBeenCalledOnce();
    expect(completion.busy).toBe(false);
    manager.end.mockRejectedValueOnce(new Error("archive"));
    await completion.finish("outcome-1");
    expect(notify).toHaveBeenLastCalledWith(
      "Unable to archive this adventure right now. You can retry or continue exploring.",
      "error",
    );
    expect(completion.busy).toBe(false);
  });

  it("only dismisses completion after a continuation launches successfully", async () => {
    const { completion, manager, notify, restoreFocus } = setup();
    const candidate = {
      id: "story-1",
    } as unknown as AdventureContinuationCandidate;
    manager.launchContinuation.mockRejectedValueOnce(new Error("launch"));
    await completion.launch("outcome-1", candidate);
    expect(manager.acknowledgeCompletion).not.toHaveBeenCalled();
    expect(restoreFocus).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      "Unable to launch that story right now. Please try again.",
      "error",
    );
    await completion.launch("outcome-1", candidate);
    expect(manager.launchContinuation).toHaveBeenLastCalledWith(candidate);
    expect(manager.acknowledgeCompletion).toHaveBeenCalledOnce();
    expect(restoreFocus).toHaveBeenCalledOnce();
  });

  it("reports a failure to leave the adventure", async () => {
    const { completion, manager, notify } = setup();
    manager.close.mockRejectedValueOnce(new Error("close"));
    await completion.findAnother("outcome-1");
    expect(notify).toHaveBeenCalledWith(
      "Unable to leave this adventure right now. Please try again.",
      "error",
    );
    expect(completion.busy).toBe(false);
  });
});
