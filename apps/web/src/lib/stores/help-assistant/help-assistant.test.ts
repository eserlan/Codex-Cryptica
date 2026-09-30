import { afterEach, describe, expect, it, vi } from "vitest";
import {
  sanitizeHelpContext,
  type HelpAnswer,
  type HelpContext,
} from "help-engine";
import type {
  AskInput,
  HelpAskResult,
} from "$lib/services/help-assistant/help-client";
import { HelpAssistantStore } from "./help-assistant.svelte";

const screen = (over: Record<string, unknown> = {}): HelpContext =>
  sanitizeHelpContext({
    routeTemplate: "/(app)",
    area: "entity-detail",
    entityKind: "location",
    tab: "connections",
    mode: "view",
    flags: ["connections-editable"],
    availableActions: ["status-tab", "connections-tab"],
    ...over,
  });

const guide = {
  type: "openPanel",
  panel: "status-tab",
  label: "Open the Status tab",
  then: { type: "highlight", target: "add-connection-button", label: "Add" },
} as const;

const answered = (over: Partial<HelpAnswer> = {}): HelpAnswer => ({
  outcome: "answered",
  answer: "Open the Status tab and use Add.",
  sources: [
    {
      id: "connections-tab#0",
      title: "Connections Tab",
      helpId: "connections-tab",
    },
  ],
  action: guide,
  suggestions: [],
  ...over,
});

function setup(
  ask: (input: AskInput) => Promise<HelpAskResult> = async () => ({
    ok: true,
    answer: answered(),
  }),
  initial = screen(),
) {
  let current = initial;
  let sig = "sig-1";
  const client = { ask: vi.fn(ask) };
  const store = new HelpAssistantStore({
    client,
    context: {
      get current() {
        return current;
      },
      get signature() {
        return sig;
      },
    },
    fallback: (error) => ({
      message: `fallback:${error.kind}`,
      topics: [{ helpId: "connections-tab", title: "Connections Tab" }],
      showLibrary: false,
    }),
    helpIds: () => new Set(["connections-tab"]),
  });
  return {
    store,
    client,
    moveTo: (next: HelpContext, nextSig: string) => {
      current = next;
      sig = nextSig;
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("HelpAssistantStore — asking", () => {
  it("moves idle → pending → answered and offers the validated guide", async () => {
    const { store } = setup();
    const done = store.ask("How do I connect the faction?");
    expect(store.status).toBe("pending");
    await done;
    expect(store.status).toBe("answered");
    expect(store.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(store.offer).toEqual(guide);
  });

  it("sends the screen description and the conversation so far", async () => {
    const { store, client } = setup();
    await store.ask("first question");
    await store.ask("and then?");
    const second = client.ask.mock.calls[1][0];
    expect(second.history.map((h) => h.role)).toEqual(["user", "assistant"]);
    expect((second.context as HelpContext).area).toBe("entity-detail");
  });

  it("does not send an empty question", async () => {
    const { store, client } = setup();
    expect(await store.ask("   ")).toBe(false);
    expect(client.ask).not.toHaveBeenCalled();
    expect(store.status).toBe("idle");
  });

  it("shows a plain limit message for an over-long question instead of sending it", async () => {
    const { store, client } = setup();
    expect(await store.ask("x".repeat(501))).toBe(false);
    expect(client.ask).not.toHaveBeenCalled();
    expect(store.notice).toMatch(/500/);
  });

  it("ignores a second question while one is pending", async () => {
    let release!: (r: HelpAskResult) => void;
    const { store, client } = setup(() => new Promise((r) => (release = r)));
    const first = store.ask("one");
    expect(await store.ask("two")).toBe(false);
    expect(client.ask).toHaveBeenCalledTimes(1);
    release({ ok: true, answer: answered() });
    await first;
  });

  it("keeps only the last eight messages on screen", async () => {
    const { store } = setup();
    for (let i = 0; i < 6; i++) await store.ask(`q${i}`);
    expect(store.messages).toHaveLength(8);
    expect(store.messages[0].text).not.toBe("q0");
  });

  it("reports no-match and out-of-scope outcomes without offering a guide", async () => {
    const { store } = setup(async () => ({
      ok: true,
      answer: answered({ outcome: "no-match", action: null, sources: [] }),
    }));
    await store.ask("Can I export to Roll20?");
    expect(store.status).toBe("no-match");
    expect(store.offer).toBeNull();
  });
});

describe("HelpAssistantStore — screens and guides", () => {
  it("labels an answer that arrives after the user changed screen and drops its guide", async () => {
    let release!: (r: HelpAskResult) => void;
    const { store, moveTo } = setup(() => new Promise((r) => (release = r)));
    const pending = store.ask("How do I connect the faction?");
    moveTo(screen({ area: "graph", tab: null, availableActions: [] }), "sig-2");
    release({ ok: true, answer: answered() });
    await pending;
    expect(store.messages.at(-1)?.staleScreen).toBe(true);
    expect(store.offer).toBeNull();
  });

  it("discards a guide that is no longer valid for the current screen", async () => {
    const { store } = setup(
      async () => ({
        ok: true,
        answer: answered({ action: { ...guide, panel: "status-tab" } }),
      }),
      screen({ flags: [] }),
    );
    await store.ask("How do I connect the faction?");
    expect(store.offer).toBeNull();
  });

  it("lets the user dismiss an offered guide", async () => {
    const { store } = setup();
    await store.ask("How do I connect the faction?");
    store.dismissOffer();
    expect(store.offer).toBeNull();
  });
});

describe("HelpAssistantStore — cancel, reset and failure", () => {
  it("returns to idle on cancel and takes the unanswered question off the page", async () => {
    const { store } = setup(
      (input) =>
        new Promise((resolve) => {
          input.signal?.addEventListener("abort", () =>
            resolve({ ok: false, error: { kind: "aborted" } }),
          );
        }),
    );
    const pending = store.ask("slow question");
    store.cancel();
    await pending;
    expect(store.status).toBe("idle");
    expect(store.messages).toEqual([]);
  });

  it("shows static help for the screen when the assistant fails", async () => {
    const { store } = setup(async () => ({
      ok: false,
      error: { kind: "offline" },
    }));
    await store.ask("anything");
    expect(store.status).toBe("fallback");
    expect(store.messages.at(-1)?.fallback?.topics[0].helpId).toBe(
      "connections-tab",
    );
    expect(store.offer).toBeNull();
  });

  it("does not block on a request that never finishes: cancel and reset still work", async () => {
    const { store } = setup(() => new Promise(() => {}));
    void store.ask("hangs forever");
    expect(store.isPending).toBe(true);
    store.reset();
    expect(store.status).toBe("idle");
    expect(store.messages).toEqual([]);
  });

  it("ignores an answer that arrives after a reset", async () => {
    let release!: (r: HelpAskResult) => void;
    const { store } = setup(() => new Promise((r) => (release = r)));
    const pending = store.ask("question");
    store.reset();
    release({ ok: true, answer: answered() });
    await pending;
    expect(store.messages).toEqual([]);
    expect(store.offer).toBeNull();
  });

  it("clears the conversation on reset", async () => {
    const { store } = setup();
    await store.ask("question");
    store.reset();
    expect(store.messages).toEqual([]);
    expect(store.offer).toBeNull();
  });
});

describe("HelpAssistantStore — panel", () => {
  it("opens, closes and toggles without touching the conversation", async () => {
    const { store } = setup();
    await store.ask("question");
    store.open();
    expect(store.isOpen).toBe(true);
    store.close();
    expect(store.isOpen).toBe(false);
    store.toggle();
    expect(store.isOpen).toBe(true);
    expect(store.messages).toHaveLength(2);
  });
});

describe("HelpAssistantStore — privacy", () => {
  it("never writes the conversation to browser storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const idb = vi.spyOn(globalThis, "indexedDB", "get");
    const { store } = setup();
    await store.ask("How do I connect Oakvale to the Red Hand?");
    store.reset();
    expect(setItem).not.toHaveBeenCalled();
    expect(idb).not.toHaveBeenCalled();
  });
});
