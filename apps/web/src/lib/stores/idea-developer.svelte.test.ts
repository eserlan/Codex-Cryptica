// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { MAX_CONVERSATION_TURNS } from "generator-engine";
import type { StorageLike } from "$lib/utils/runtime-deps";
import {
  IDEA_DEVELOPER_SESSION_KEY,
  IdeaDeveloperStore,
} from "./idea-developer.svelte";
import type {
  ContinueResult,
  StartResult,
} from "$lib/services/idea-developer/idea-developer-service";

const development = {
  mode: "develop" as const,
  alreadyInteresting: "a",
  centralQuestion: "b?",
  makeItMove: "c",
  peopleWhoCare: [
    { name: "Mara", role: "Smith", wants: "Scales", conflictsWith: "Warden" },
    { name: "Warden", role: "Guard", wants: "Peace", conflictsWith: "Mara" },
  ],
  playerDirections: [
    { title: "Follow it", description: "Trace it." },
    { title: "Search it", description: "Find it." },
  ],
  consequences: "d",
  creatorQuestions: ["Who?", "Why?"],
  generatorSuggestions: [
    { generatorKey: "npc", reason: "A person." },
    { generatorKey: "faction", reason: "A group." },
  ],
};

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
  };
}

const ok = (
  over: Partial<Extract<StartResult, { status: "ok" }>> = {},
): StartResult => ({
  status: "ok",
  development,
  interactionId: "i-1",
  ideaText: "A town.",
  ...over,
});

function setup(result: StartResult = ok(), storage = memoryStorage()) {
  const service = { start: vi.fn().mockResolvedValue(result) };
  const hubSync = {
    remove: vi.fn(),
    exists: vi.fn().mockReturnValue(true),
  };
  const store = new IdeaDeveloperStore(
    service as never,
    storage,
    hubSync as never,
  );
  return { service, store, storage, hubSync };
}

describe("IdeaDeveloperStore", () => {
  it("starts empty", () => {
    const { store } = setup();
    expect(store.status).toBe("empty");
    expect(store.conversation).toBeNull();
  });

  it("moves between empty and editing as text is typed", () => {
    const { store } = setup();
    store.setIdea("A town.");
    expect(store.status).toBe("editing");
    store.setIdea("   ");
    expect(store.status).toBe("empty");
  });

  it("becomes active with a conversation after a successful submit", async () => {
    const { store, service } = setup();
    store.setIdea("A town.");
    await store.submit();
    expect(store.status).toBe("active");
    expect(store.conversation?.ideaText).toBe("A town.");
    expect(store.conversation?.previousInteractionId).toBe("i-1");
    expect(store.conversation?.latest).toEqual(development);
    expect(store.conversation?.turns).toEqual([
      { kind: "idea", mode: "develop", text: "A town.", status: "done" },
    ]);
    expect(service.start).toHaveBeenCalledWith(
      expect.objectContaining({ idea: "A town.", mode: "develop" }),
    );
  });

  it("passes through submitting while the turn runs", async () => {
    let release!: (value: StartResult) => void;
    const service = {
      start: vi
        .fn()
        .mockReturnValue(new Promise<StartResult>((r) => (release = r))),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage());
    store.setIdea("A town.");
    const pending = store.submit();
    expect(store.status).toBe("submitting");
    release(ok());
    await pending;
    expect(store.status).toBe("active");
  });

  it("ignores a second submit while one is running", async () => {
    let release!: (value: StartResult) => void;
    const service = {
      start: vi
        .fn()
        .mockReturnValue(new Promise<StartResult>((r) => (release = r))),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage());
    store.setIdea("A town.");
    const first = store.submit();
    await store.submit();
    expect(service.start).toHaveBeenCalledTimes(1);
    release(ok());
    await first;
  });

  it("keeps the typed idea and shows the message when a turn fails", async () => {
    const { store } = setup({
      status: "failed",
      ideaText: "A town.",
      failure: { code: "unknown", message: "Something went wrong." },
    });
    store.setIdea("A town.");
    await store.submit();
    expect(store.status).toBe("failed");
    expect(store.ideaDraft).toBe("A town.");
    expect(store.notice).toEqual({
      kind: "error",
      message: "Something went wrong.",
    });
    expect(store.conversation).toBeNull();
  });

  it("records when to try again after a limit", async () => {
    const { store } = setup({
      status: "limited",
      reason: "cooldown",
      retryAt: 9000,
      message: "Try again in a little while.",
    });
    store.setIdea("A town.");
    await store.submit();
    expect(store.status).toBe("failed");
    expect(store.notice).toMatchObject({ kind: "limited", retryAt: 9000 });
  });

  it("keeps the text when input is rejected", async () => {
    const { store } = setup({
      status: "rejected",
      reason: "too-long",
      message: "That is too long.",
    });
    store.setIdea("x");
    await store.submit();
    expect(store.ideaDraft).toBe("x");
    expect(store.notice).toEqual({
      kind: "rejected",
      message: "That is too long.",
    });
  });

  it("asks for an RPG idea without starting a conversation", async () => {
    const { store } = setup({
      status: "needs-rpg-idea",
      message: "Tell me a game idea.",
      interactionId: "i-1",
      ideaText: "hello",
    });
    store.setIdea("hello");
    await store.submit();
    expect(store.status).toBe("failed");
    expect(store.notice).toEqual({
      kind: "needs-rpg-idea",
      message: "Tell me a game idea.",
    });
    expect(store.conversation).toBeNull();
  });

  it("returns to editing when a turn is cancelled", async () => {
    const { store } = setup({ status: "cancelled" });
    store.setIdea("A town.");
    await store.submit();
    expect(store.status).toBe("editing");
    expect(store.ideaDraft).toBe("A town.");
  });

  it("saves the session and restores it in a new store", async () => {
    const { store, storage } = setup();
    store.setIdea("A town.");
    await store.submit();
    expect(storage.data.has(IDEA_DEVELOPER_SESSION_KEY)).toBe(true);

    const restored = new IdeaDeveloperStore(
      { start: vi.fn() } as never,
      storage,
    );
    expect(restored.status).toBe("active");
    expect(restored.conversation?.ideaText).toBe("A town.");
    expect(restored.conversation?.previousInteractionId).toBe("i-1");
    expect(restored.conversation?.latest).toEqual(development);
  });

  it("removes the saved session when cleared", async () => {
    const { store, storage } = setup();
    store.setIdea("A town.");
    await store.submit();
    store.clear();
    expect(storage.data.has(IDEA_DEVELOPER_SESSION_KEY)).toBe(false);
    expect(store.status).toBe("empty");
    expect(store.conversation).toBeNull();
    expect(store.ideaDraft).toBe("");
  });

  it("ignores corrupt or old-version saved data without throwing", () => {
    const storage = memoryStorage();
    storage.data.set(IDEA_DEVELOPER_SESSION_KEY, "{not json");
    expect(
      () => new IdeaDeveloperStore({ start: vi.fn() } as never, storage),
    ).not.toThrow();
    storage.data.set(
      IDEA_DEVELOPER_SESSION_KEY,
      JSON.stringify({ version: 99 }),
    );
    const store = new IdeaDeveloperStore({ start: vi.fn() } as never, storage);
    expect(store.status).toBe("empty");
  });

  it("does not throw when storage is unavailable", async () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
      length: 0,
      key: () => null,
    };
    const store = new IdeaDeveloperStore(
      { start: vi.fn().mockResolvedValue(ok()) } as never,
      throwing,
    );
    store.setIdea("A town.");
    await expect(store.submit()).resolves.not.toThrow();
    expect(store.status).toBe("active");
  });
});

describe("IdeaDeveloperStore and the Session Hub", () => {
  it("records the hub draft id on the conversation", async () => {
    const { store } = setup(ok({ hubDraftId: "hub-1" }));
    store.setIdea("A town.");
    await store.submit();
    expect(store.conversation?.hubDraftId).toBe("hub-1");
  });

  it("removes the hub draft it created when cleared", async () => {
    const { store, hubSync } = setup(ok({ hubDraftId: "hub-1" }));
    store.setIdea("A town.");
    await store.submit();
    store.clear();
    expect(hubSync.remove).toHaveBeenCalledWith("hub-1");
  });

  it("does not try to remove a draft when there was none", () => {
    const { store, hubSync } = setup();
    store.clear();
    expect(hubSync.remove).not.toHaveBeenCalled();
  });

  it("clears its own saved copy when the draft is removed in the hub", async () => {
    const { store, storage, hubSync } = setup(ok({ hubDraftId: "hub-1" }));
    store.setIdea("A town.");
    await store.submit();
    hubSync.exists.mockReturnValue(false);
    store.reconcileHub();
    expect(store.status).toBe("empty");
    expect(store.conversation).toBeNull();
    expect(storage.data.has(IDEA_DEVELOPER_SESSION_KEY)).toBe(false);
  });

  it("keeps the conversation while its draft still exists", async () => {
    const { store } = setup(ok({ hubDraftId: "hub-1" }));
    store.setIdea("A town.");
    await store.submit();
    store.reconcileHub();
    expect(store.status).toBe("active");
  });

  it("leaves a conversation alone that never had a hub draft", async () => {
    const { store } = setup(ok());
    store.setIdea("A town.");
    await store.submit();
    store.reconcileHub();
    expect(store.status).toBe("active");
  });
});

describe("IdeaDeveloperStore continuing a conversation", () => {
  const second = { ...development, whatChanged: "Sharper rivals." };
  const okTurn = (
    over: Partial<Extract<ContinueResult, { status: "ok" }>> = {},
  ): ContinueResult => ({
    status: "ok",
    development: second,
    interactionId: "i-2",
    turn: {
      kind: "answer-questions",
      mode: "develop",
      text: "They left.",
      status: "done",
    },
    ...over,
  });

  async function active(
    next: ContinueResult | Promise<ContinueResult> = okTurn(),
  ) {
    const storage = memoryStorage();
    const service = {
      start: vi.fn().mockResolvedValue(ok({ hubDraftId: "hub-1" })),
      continue: vi.fn().mockResolvedValue(next),
    };
    const hubSync = { remove: vi.fn(), exists: vi.fn().mockReturnValue(true) };
    const store = new IdeaDeveloperStore(
      service as never,
      storage,
      hubSync as never,
    );
    store.setIdea("A town.");
    await store.submit();
    return { store, service, storage, hubSync };
  }

  it("adds the turn, updates the development and interaction id, and clears the box", async () => {
    const { store, service } = await active();
    store.setFollowUp("They left.");
    await store.continueConversation("answer-questions");
    expect(service.continue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "answer-questions",
        text: "They left.",
        mode: "develop",
      }),
    );
    expect(store.conversation?.turns).toHaveLength(2);
    expect(store.conversation?.previousInteractionId).toBe("i-2");
    expect(store.conversation?.latest).toEqual(second);
    expect(store.followUpText).toBe("");
    expect(store.status).toBe("active");
  });

  it("keeps the same hub draft across turns", async () => {
    const { store } = await active();
    store.setFollowUp("x");
    await store.continueConversation("answer-questions");
    expect(store.conversation?.hubDraftId).toBe("hub-1");
  });

  it("saves the turns so a reload can continue the conversation", async () => {
    const { store, storage } = await active();
    store.setFollowUp("x");
    await store.continueConversation("answer-questions");
    const restored = new IdeaDeveloperStore(
      { start: vi.fn(), continue: vi.fn() } as never,
      storage,
      {
        remove: vi.fn(),
        exists: () => true,
      } as never,
    );
    expect(restored.status).toBe("active");
    expect(restored.conversation?.turns).toHaveLength(2);
    expect(restored.conversation?.previousInteractionId).toBe("i-2");
  });

  it("stays active and marks the turn as running, and ignores a second request", async () => {
    let release!: (value: ContinueResult) => void;
    const pending = new Promise<ContinueResult>((r) => (release = r));
    const { store, service } = await active(pending);
    store.setFollowUp("x");
    const first = store.continueConversation("answer-questions");
    expect(store.turnRunning).toBe(true);
    expect(store.status).toBe("active");
    await store.continueConversation("answer-questions");
    expect(service.continue).toHaveBeenCalledTimes(1);
    release(okTurn());
    await first;
    expect(store.turnRunning).toBe(false);
  });

  it("keeps the conversation and the typed text when a turn fails", async () => {
    const { store } = await active({
      status: "failed",
      failure: { code: "unknown", message: "Something went wrong." },
    });
    store.setFollowUp("They left.");
    await store.continueConversation("answer-questions");
    expect(store.conversation?.turns).toHaveLength(1);
    expect(store.conversation?.previousInteractionId).toBe("i-1");
    expect(store.followUpText).toBe("They left.");
    expect(store.notice).toEqual({
      kind: "error",
      message: "Something went wrong.",
    });
    expect(store.status).toBe("active");
  });

  it("records a limit with when to try again", async () => {
    const { store } = await active({
      status: "limited",
      reason: "cooldown",
      retryAt: 9000,
      message: "Try again in a little while.",
    });
    store.setFollowUp("x");
    await store.continueConversation("answer-questions");
    expect(store.notice).toMatchObject({ kind: "limited", retryAt: 9000 });
  });

  it("shows a rejection and keeps the text", async () => {
    const { store } = await active({
      status: "rejected",
      reason: "empty",
      message: "Write your answers first.",
    });
    await store.continueConversation("answer-questions");
    expect(store.notice).toEqual({
      kind: "rejected",
      message: "Write your answers first.",
    });
  });

  it("reports the cap and stops offering follow-ups once it is reached", async () => {
    const { store, service } = await active();
    expect(store.capped).toBe(false);
    for (let i = 0; i < MAX_CONVERSATION_TURNS - 1; i++) {
      store.setFollowUp(`answer ${i}`);
      await store.continueConversation("answer-questions");
    }
    expect(store.conversation?.turns).toHaveLength(MAX_CONVERSATION_TURNS);
    expect(store.capped).toBe(true);
    service.continue.mockClear();
    await store.continueConversation("answer-questions");
    expect(service.continue).not.toHaveBeenCalled();
    expect(store.notice).toMatchObject({ kind: "capped" });
  });

  it("switches mode for the next turn and remembers it", async () => {
    const { store, service } = await active(
      okTurn({
        development: { ...second, mode: "assess" },
        turn: { kind: "switch-mode", mode: "assess", text: "", status: "done" },
      }),
    );
    expect(store.conversationMode).toBe("develop");
    await store.continueConversation("switch-mode", "assess");
    expect(service.continue).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "switch-mode", mode: "assess" }),
    );
    expect(store.conversationMode).toBe("assess");
  });

  it("does not add a turn when the user cancels", async () => {
    const { store } = await active({ status: "cancelled" });
    store.setFollowUp("x");
    await store.continueConversation("answer-questions");
    expect(store.conversation?.turns).toHaveLength(1);
    expect(store.turnRunning).toBe(false);
    expect(store.followUpText).toBe("x");
  });

  it("starts a fresh conversation, with no earlier turns, after clearing", async () => {
    const { store, service } = await active();
    store.setFollowUp("x");
    await store.continueConversation("answer-questions");
    store.clear();
    expect(store.conversation).toBeNull();
    service.start.mockResolvedValue(
      ok({ hubDraftId: "hub-2", interactionId: "i-9" }),
    );
    store.setIdea("Another idea.");
    await store.submit();
    expect(store.conversation?.turns).toHaveLength(1);
    expect(store.conversation?.hubDraftId).toBe("hub-2");
  });

  it("does nothing when there is no conversation", async () => {
    const { store, service } = setup();
    await store.continueConversation("answer-questions");
    expect((service as { continue?: unknown }).continue).toBeUndefined();
    expect(store.status).toBe("empty");
  });
});

describe("IdeaDeveloperStore funnel events", () => {
  const MARKER = "ZZ-SECRET-MARKER-ZZ";
  const suggested = {
    ...development,
    generatorSuggestions: [
      { generatorKey: "npc", reason: "r" },
      { generatorKey: "faction", reason: "r" },
    ],
  };

  function tracked(startResult: StartResult, continueResult?: ContinueResult) {
    const tracker = {
      submitted: vi.fn(),
      turnSubmitted: vi.fn(),
      resultShown: vi.fn(),
    };
    const service = {
      start: vi.fn().mockResolvedValue(startResult),
      continue: vi.fn().mockResolvedValue(continueResult),
    };
    const store = new IdeaDeveloperStore(
      service as never,
      memoryStorage(),
      { remove: vi.fn(), exists: () => true } as never,
      tracker as never,
    );
    return { store, tracker };
  }

  it("records the first turn and the result shown", async () => {
    const { store, tracker } = tracked(ok({ development: suggested }));
    store.setIdea(MARKER);
    await store.submit();
    expect(tracker.submitted).toHaveBeenCalledTimes(1);
    expect(tracker.submitted).toHaveBeenCalledWith({ mode: "develop" });
    expect(tracker.resultShown).toHaveBeenCalledWith({
      mode: "develop",
      turnIndex: 0,
      suggestionCount: 2,
    });
  });

  it("records nothing when the request was never sent", async () => {
    for (const result of [
      { status: "rejected", reason: "empty", message: "x" },
      { status: "limited", reason: "cooldown", retryAt: 1, message: "x" },
    ] as StartResult[]) {
      const { store, tracker } = tracked(result);
      store.setIdea("A town.");
      await store.submit();
      expect(tracker.submitted).not.toHaveBeenCalled();
      expect(tracker.resultShown).not.toHaveBeenCalled();
    }
  });

  it("records a sent turn that fails, without a result shown", async () => {
    const { store, tracker } = tracked({
      status: "failed",
      ideaText: "A town.",
      failure: { code: "unknown", message: "x" },
    });
    store.setIdea("A town.");
    await store.submit();
    expect(tracker.submitted).toHaveBeenCalledTimes(1);
    expect(tracker.resultShown).not.toHaveBeenCalled();
  });

  it("records a later turn and its result", async () => {
    const { store, tracker } = tracked(ok(), {
      status: "ok",
      development: suggested,
      interactionId: "i-2",
      turn: {
        kind: "change-part",
        mode: "develop",
        text: MARKER,
        status: "done",
      },
    });
    store.setIdea("A town.");
    await store.submit();
    store.setFollowUp(MARKER);
    await store.continueConversation("change-part");
    expect(tracker.turnSubmitted).toHaveBeenCalledWith({
      turnKind: "change-part",
      turnIndex: 1,
      mode: "develop",
    });
    expect(tracker.resultShown).toHaveBeenLastCalledWith({
      mode: "develop",
      turnIndex: 1,
      suggestionCount: 2,
    });
  });

  it("records nothing for a later turn that is refused before sending", async () => {
    const { store, tracker } = tracked(ok(), {
      status: "rejected",
      reason: "empty",
      message: "x",
    });
    store.setIdea("A town.");
    await store.submit();
    await store.continueConversation("answer-questions");
    expect(tracker.turnSubmitted).not.toHaveBeenCalled();
  });

  it("never passes idea or turn text to the tracker", async () => {
    const { store, tracker } = tracked(ok({ development: suggested }), {
      status: "ok",
      development: suggested,
      interactionId: "i-2",
      turn: {
        kind: "change-part",
        mode: "develop",
        text: MARKER,
        status: "done",
      },
    });
    store.setIdea(MARKER);
    await store.submit();
    store.setFollowUp(MARKER);
    await store.continueConversation("change-part");
    const everything = JSON.stringify([
      tracker.submitted.mock.calls,
      tracker.turnSubmitted.mock.calls,
      tracker.resultShown.mock.calls,
    ]);
    expect(everything).not.toContain(MARKER);
  });
});

describe("IdeaDeveloperStore when something unexpected goes wrong", () => {
  const boom = () => Promise.reject(new Error("unexpected"));

  it("does not get stuck submitting if the service throws", async () => {
    const service = {
      start: vi.fn().mockImplementation(boom),
      continue: vi.fn(),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    store.setIdea("A town.");
    await store.submit();
    expect(store.status).toBe("failed");
    expect(store.notice).toMatchObject({ kind: "error" });
    expect(store.ideaDraft).toBe("A town.");
    // and the user can try again
    service.start.mockResolvedValue(ok());
    await store.submit();
    expect(store.status).toBe("active");
  });

  it("does not stay marked as running if a later turn throws, and keeps the conversation", async () => {
    const service = {
      start: vi.fn().mockResolvedValue(ok({ hubDraftId: "hub-1" })),
      continue: vi.fn().mockImplementation(boom),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    store.setIdea("A town.");
    await store.submit();
    store.setFollowUp("They left.");
    await store.continueConversation("answer-questions");
    expect(store.turnRunning).toBe(false);
    expect(store.status).toBe("active");
    expect(store.conversation?.turns).toHaveLength(1);
    expect(store.followUpText).toBe("They left.");
    expect(store.notice).toMatchObject({ kind: "error" });
  });
});

describe("IdeaDeveloperStore ignores results that arrive after a clear", () => {
  it("does not bring back a conversation that finished after the user cleared", async () => {
    let release!: (value: StartResult) => void;
    const service = {
      start: vi
        .fn()
        .mockReturnValue(new Promise<StartResult>((r) => (release = r))),
      continue: vi.fn(),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    store.setIdea("A town.");
    const running = store.submit();
    store.clear();
    release(ok());
    await running;
    expect(store.conversation).toBeNull();
    expect(store.status).toBe("empty");
  });

  it("does not add a later turn to a conversation the user cleared", async () => {
    let release!: (value: ContinueResult) => void;
    const service = {
      start: vi.fn().mockResolvedValue(ok({ hubDraftId: "hub-1" })),
      continue: vi
        .fn()
        .mockReturnValue(new Promise<ContinueResult>((r) => (release = r))),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    store.setIdea("A town.");
    await store.submit();
    store.setFollowUp("x");
    const running = store.continueConversation("answer-questions");
    store.clear();
    release({
      status: "ok",
      development: development,
      interactionId: "i-2",
      turn: {
        kind: "answer-questions",
        mode: "develop",
        text: "x",
        status: "done",
      },
    });
    await running;
    expect(store.conversation).toBeNull();
    expect(store.status).toBe("empty");
    expect(store.turnRunning).toBe(false);
  });

  it("does not let an older first turn overwrite a newer one", async () => {
    const releases: Array<(value: StartResult) => void> = [];
    const service = {
      start: vi
        .fn()
        .mockImplementation(
          () => new Promise<StartResult>((r) => releases.push(r)),
        ),
      continue: vi.fn(),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    store.setIdea("First.");
    const first = store.submit();
    store.clear();
    store.setIdea("Second.");
    const second = store.submit();
    releases[1](ok({ ideaText: "Second.", interactionId: "i-second" }));
    await second;
    releases[0](ok({ ideaText: "First.", interactionId: "i-first" }));
    await first;
    expect(store.conversation?.ideaText).toBe("Second.");
    expect(store.conversation?.previousInteractionId).toBe("i-second");
  });
});

describe("IdeaDeveloperStore shows what changed between turns", () => {
  const changedDev = {
    ...development,
    whatChanged: "Looked at it as an assessment.",
    centralQuestion: "Who is quietly buying the parts?",
    consequences: "The Warden loses the town.",
  };

  async function withTurn(next: ContinueResult) {
    const service = {
      start: vi.fn().mockResolvedValue(ok({ hubDraftId: "hub-1" })),
      continue: vi.fn().mockResolvedValue(next),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    store.setIdea("A town.");
    await store.submit();
    return { store, service };
  }

  const okTurn = (dev = changedDev): ContinueResult => ({
    status: "ok",
    development: dev,
    interactionId: "i-2",
    turn: { kind: "switch-mode", mode: "assess", text: "", status: "done" },
  });

  it("has nothing to compare on the first result", async () => {
    const { store } = await withTurn(okTurn());
    expect(store.previous).toBeNull();
    expect(store.changedSections).toBeNull();
  });

  it("keeps the previous result and lists the sections that changed", async () => {
    const { store } = await withTurn(okTurn());
    await store.continueConversation("switch-mode", "assess");
    expect(store.previous).toEqual(development);
    expect(store.changedSections).toEqual(["centralQuestion", "consequences"]);
  });

  it("says nothing changed when the new result matches the old one", async () => {
    const { store } = await withTurn(
      okTurn({ ...development, whatChanged: "Same." }),
    );
    await store.continueConversation("switch-mode", "assess");
    expect(store.changedSections).toEqual([]);
  });

  it("keeps the earlier comparison if a later turn fails", async () => {
    const { store, service } = await withTurn(okTurn());
    await store.continueConversation("switch-mode", "assess");
    service.continue.mockResolvedValue({
      status: "failed",
      failure: { code: "unknown", message: "Nope." },
    });
    store.setFollowUp("x");
    await store.continueConversation("answer-questions");
    expect(store.changedSections).toEqual(["centralQuestion", "consequences"]);
  });

  it("forgets the comparison when the conversation is cleared", async () => {
    const { store } = await withTurn(okTurn());
    await store.continueConversation("switch-mode", "assess");
    store.clear();
    expect(store.previous).toBeNull();
    expect(store.changedSections).toBeNull();
  });
});
