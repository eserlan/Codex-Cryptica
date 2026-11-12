import { describe, expect, it, vi } from "vitest";
import type { AdventureSession } from "@codex/adventure-engine";
import { AdventureActions } from "../adventure-actions";
import { AdventureLifecycle } from "../adventure-lifecycle";
import {
  completeProposal,
  createAdventureRuntime,
  now,
} from "./adventure-fixtures";

const emptyPatch = () => ({ add: [], update: [], removeIds: [] });

/** An active session holding `count` committed turns, ready to be summarised. */
function sessionWithTurns(base: AdventureSession, count: number) {
  return {
    ...base,
    turns: Array.from({ length: count }, (_, i) => ({
      id: `turn-${i}`,
      sequence: i,
      inputId: `input-${i}`,
      playerAction: `Action ${i}`,
      narration: `Narration ${i}`,
      visiblePatch: {
        objectives: emptyPatch(),
        activeCharacters: emptyPatch(),
        knownFacts: emptyPatch(),
        relationships: emptyPatch(),
      },
      hiddenPatch: { secrets: emptyPatch(), gmThreads: emptyPatch() },
      revealedSecretIds: [],
      sourceRecordIds: [],
      provisionalFactIds: [],
      committedAt: now,
    })),
  } as unknown as AdventureSession;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function harness(turns = 24) {
  const { state, deps, runtime } = createAdventureRuntime();
  state.session = sessionWithTurns(state.session!, turns);
  const summarize = vi.fn(
    async (
      request: { throughSequence: number },
      _options?: { signal?: AbortSignal },
    ) => ({
      text: "The party left town.",
      throughSequence: request.throughSequence,
    }),
  );
  deps.summary = { summarize } as never;
  return {
    state,
    deps,
    runtime,
    summarize,
    summarizer: runtime.summarizer,
  };
}

describe("story summarizer", () => {
  it("asks for nothing while too few turns have left the window", async () => {
    const h = harness(15);
    h.summarizer.schedule(h.state.session!);
    await flush();
    expect(h.summarize).not.toHaveBeenCalled();
  });

  it("summarises once when due and attaches the notes to the next session", async () => {
    const h = harness();
    h.summarizer.schedule(h.state.session!);
    h.summarizer.schedule(h.state.session!);
    expect(h.summarize).toHaveBeenCalledTimes(1);
    await flush();
    const attached = h.summarizer.attach(h.state.session!);
    expect(attached.storySoFar?.text).toBe("The party left town.");
    expect(attached.revision).toBe(h.state.session!.revision);
    expect(h.state.session!.storySoFar).toBeUndefined();
    // The notes are used once.
    expect(h.summarizer.attach(h.state.session!).storySoFar).toBeUndefined();
  });

  it("leaves the session alone when the call fails, and tries again next time", async () => {
    const h = harness();
    h.summarize.mockRejectedValueOnce(new Error("offline"));
    h.summarizer.schedule(h.state.session!);
    await flush();
    expect(h.summarizer.attach(h.state.session!)).toBe(h.state.session);
    h.summarizer.schedule(h.state.session!);
    await flush();
    expect(h.summarize).toHaveBeenCalledTimes(2);
    expect(h.summarizer.attach(h.state.session!).storySoFar).toBeDefined();
  });

  it("drops a result for a session that is no longer open", async () => {
    const h = harness();
    const first = h.state.session!;
    h.summarizer.schedule(first);
    h.state.session = { ...first, id: "another-session" } as AdventureSession;
    await flush();
    expect(h.summarizer.attach(first)).toBe(first);
  });

  it("aborts and invalidates a result when the same session is reopened after close", async () => {
    const h = harness();
    const first = h.state.session!;
    let resolveSummary!: (result: {
      text: string;
      throughSequence: number;
    }) => void;
    let signal: AbortSignal | undefined;
    h.summarize.mockImplementationOnce((_request, options) => {
      signal = options?.signal;
      return new Promise((resolve) => {
        resolveSummary = resolve;
      });
    });
    h.summarizer.schedule(first);

    await new AdventureLifecycle(h.runtime).close();
    h.state.session = first;
    resolveSummary({ text: "Late notes.", throughSequence: 15 });
    await flush();

    expect(signal?.aborted).toBe(true);
    expect(h.summarizer.attach(first)).toBe(first);
  });

  it("aborts a pending result when the adventure ends", async () => {
    const h = harness();
    let signal: AbortSignal | undefined;
    h.summarize.mockImplementationOnce((_request, options) => {
      signal = options?.signal;
      return new Promise(() => {});
    });
    h.summarizer.schedule(h.state.session!);

    await new AdventureLifecycle(h.runtime).end();

    expect(signal?.aborted).toBe(true);
  });

  it("drops notes that no longer fit the session's turns", async () => {
    const h = harness();
    h.summarizer.schedule(h.state.session!);
    await flush();
    const shorter = sessionWithTurns(h.state.session!, 12);
    expect(h.summarizer.attach(shorter)).toBe(shorter);
  });

  it("does nothing in read-only mode or while offline", async () => {
    const h = harness();
    h.state.readOnly = true;
    h.summarizer.schedule(h.state.session!);
    h.state.readOnly = false;
    const online = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      configurable: true,
    });
    try {
      h.summarizer.schedule(h.state.session!);
    } finally {
      if (online) Object.defineProperty(globalThis, "navigator", online);
    }
    await flush();
    expect(h.summarize).not.toHaveBeenCalled();
  });
});

describe("story notes through a real turn", () => {
  it("does not schedule a summary when close happens during turn confirmation", async () => {
    const h = harness();
    h.deps.generation = {
      generate: vi.fn(async () => completeProposal),
    } as never;
    let confirmTurn!: () => void;
    h.deps.confirmGenerationInteraction = vi.fn(
      () => new Promise<void>((resolve) => (confirmTurn = resolve)),
    );

    const turn = new AdventureActions(h.runtime).submitAction("Walk on");
    await flush();
    await new AdventureLifecycle(h.runtime).close();
    confirmTurn();
    await turn;
    await flush();

    expect(h.summarize).not.toHaveBeenCalled();
  });

  it("summarises after a turn saves, then rides on the following turn's save", async () => {
    const h = harness();
    const requests: AdventureSession[] = [];
    h.deps.generation = {
      generate: vi.fn(async (request: { session: AdventureSession }) => {
        requests.push(request.session);
        return completeProposal;
      }),
    } as never;
    const actions = new AdventureActions(h.runtime);
    await actions.submitAction("Walk on");
    expect(requests[0]?.storySoFar).toBeUndefined();
    await flush();
    expect(h.summarize).toHaveBeenCalledTimes(1);
    await actions.submitAction("Keep walking");
    expect(requests[1]?.storySoFar?.text).toBe("The party left town.");
    // Saved with the turn, with no extra revision for the notes themselves.
    expect(h.state.session?.storySoFar?.text).toBe("The party left town.");
    expect(h.state.session?.revision).toBe((requests[0]!.revision ?? 0) + 2);
  });

  it("never fails a turn when the summary call fails", async () => {
    const h = harness();
    h.summarize.mockRejectedValue(new Error("model down"));
    await new AdventureActions(h.runtime).submitAction("Walk on");
    await flush();
    expect(h.state.phase).toBe("ready");
    expect(h.state.errorMessage).toBeNull();
    expect(h.state.session?.turns).toHaveLength(25);
  });
});
