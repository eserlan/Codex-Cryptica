import { describe, it, expect, vi, beforeEach } from "vitest";

// Must be hoisted before the handler import so the mocks are in place
vi.mock("comlink", () => ({
  proxy: vi.fn((fn) => ({ __comlinkProxy: true, fn })),
}));

vi.mock("../../oracle-bridge", () => ({
  oracleBridge: { isReady: false },
}));

import { HostCharChatHandler } from "./host-char-chat-handler";
import * as Comlink from "comlink";
import { oracleBridge } from "../../oracle-bridge";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeEntities(overrides: Record<string, any> = {}) {
  return {
    "char-1": {
      id: "char-1",
      title: "Kardos",
      type: "character",
      content: "A wise mentor.",
      lore: "## Personality & Voice\n- Warm and patient.\n\n## Knowledge & Expertise\n- Ancient runes.",
      guestChatConfig: {
        isEnabled: true,
        contextScope: "public",
        extraInstructions: "Warm and patient.",
      },
      connections: [],
    },
    "guest-char": {
      id: "guest-char",
      title: "verfarkas",
      type: "character",
      connections: [
        {
          target: "char-1",
          type: "friendly",
          label: "apprentice",
          strength: 1,
        },
      ],
    },
    ...overrides,
  };
}

function makeOracle(
  executeImpl?: (action: any, ctx: any, onPartial?: any) => Promise<void>,
) {
  const generateResponse = vi.fn().mockResolvedValue(undefined);
  return {
    effectiveApiKey: "test-key",
    modelName: "test-model",
    textGeneration: { generateResponse },
    executor: {
      execute: vi.fn(executeImpl ?? (() => Promise.resolve())),
    },
  };
}

function makeContext(
  oracleOverride?: any,
  entityOverrides?: Record<string, any>,
) {
  return {
    vault: {
      activeVaultId: "vault-1",
      entities: makeEntities(entityOverrides),
      defaultVisibility: "hidden",
    },
    themeStore: { worldThemeId: "fantasy" },
    oracle: oracleOverride !== undefined ? oracleOverride : makeOracle(),
  } as any;
}

function makeConn() {
  return { peer: "guest-peer", send: vi.fn(), close: vi.fn() } as any;
}

function makeRequest(overrides: Partial<any> = {}) {
  return {
    type: "GUEST_CHAR_CHAT_REQUEST" as const,
    requestId: "req-1",
    characterId: "char-1",
    guestUsername: "verfarkas",
    query: "Hello, mentor.",
    history: [{ id: "m1", role: "user", content: "Hello, mentor." }],
    ...overrides,
  };
}

// ─── canHandle ────────────────────────────────────────────────────────────────

describe("HostCharChatHandler.canHandle", () => {
  it("accepts GUEST_CHAR_CHAT_REQUEST only", () => {
    const h = new HostCharChatHandler();
    expect(h.canHandle({ type: "GUEST_CHAR_CHAT_REQUEST" } as any)).toBe(true);
    expect(h.canHandle({ type: "GUEST_CHAR_CHAT_CHUNK" } as any)).toBe(false);
    expect(h.canHandle({ type: "GUEST_CHAR_CHAT_DONE" } as any)).toBe(false);
    expect(h.canHandle({ type: "ENTITY_UPDATE" } as any)).toBe(false);
  });
});

// ─── missing oracle ───────────────────────────────────────────────────────────

describe("HostCharChatHandler — no oracle", () => {
  it("sends DONE with error when oracle is unavailable", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const ctx = makeContext(null);

    await h.handle(makeRequest(), conn, ctx);

    expect(conn.send).toHaveBeenCalledWith({
      type: "GUEST_CHAR_CHAT_DONE",
      requestId: "req-1",
      error: expect.stringContaining("Oracle not available"),
    });
  });
});

// ─── happy path ───────────────────────────────────────────────────────────────

describe("HostCharChatHandler — successful execution", () => {
  beforeEach(() => {
    (oracleBridge as any).isReady = false;
  });

  it("sends DONE on successful execution", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const ctx = makeContext(
      makeOracle(async (_action, _ctx, onPartial) => {
        onPartial?.("Hello!");
      }),
    );

    await h.handle(makeRequest(), conn, ctx);

    expect(conn.send).toHaveBeenCalledWith({
      type: "GUEST_CHAR_CHAT_DONE",
      requestId: "req-1",
    });
  });

  it("sends DONE with error when executor completes without streaming", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const ctx = makeContext(makeOracle());

    await h.handle(makeRequest(), conn, ctx);

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "GUEST_CHAR_CHAT_DONE",
        requestId: "req-1",
        error: expect.any(String),
      }),
    );
  });

  it("streams CHUNK via connection when executor calls onPartial", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();

    const oracle = makeOracle(async (_action, _ctx, onPartial) => {
      onPartial?.("Hello");
      onPartial?.(", world");
    });
    const ctx = makeContext(oracle);

    await h.handle(makeRequest(), conn, ctx);

    expect(conn.send).toHaveBeenCalledWith({
      type: "GUEST_CHAR_CHAT_CHUNK",
      requestId: "req-1",
      partial: "Hello",
    });
    expect(conn.send).toHaveBeenCalledWith({
      type: "GUEST_CHAR_CHAT_CHUNK",
      requestId: "req-1",
      partial: ", world",
    });
  });

  it("resolves guest character by title match", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const oracle = makeOracle();
    const ctx = makeContext(oracle);

    await h.handle(makeRequest({ guestUsername: "verfarkas" }), conn, ctx);

    const [actionArg, ctxArg] = oracle.executor.execute.mock.calls[0];
    expect(actionArg.data?.guestCharacterId).toBe("guest-char");
    expect(ctxArg.vault.guestCharacterId).toBe("guest-char");
  });

  it("resolves guest character by label match (player name ≠ character name)", async () => {
    // Pål logs in as "pål", but Verfarkas has "pål" as a label (player tag)
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const oracle = makeOracle();
    const ctx = makeContext(oracle, {
      "guest-char": {
        id: "guest-char",
        title: "verfarkas",
        type: "character",
        labels: ["pål"],
        connections: [
          {
            target: "char-1",
            type: "friendly",
            label: "apprentice",
            strength: 1,
          },
        ],
      },
    });

    await h.handle(makeRequest({ guestUsername: "pål" }), conn, ctx);

    const [actionArg, ctxArg] = oracle.executor.execute.mock.calls[0];
    expect(actionArg.data?.guestCharacterId).toBe("guest-char");
    expect(ctxArg.vault.guestCharacterId).toBe("guest-char");
  });

  it("resolves guest character by alias match", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const oracle = makeOracle();
    const ctx = makeContext(oracle, {
      "guest-char": {
        id: "guest-char",
        title: "verfarkas",
        type: "character",
        aliases: ["the wolf", "pål"],
        connections: [],
      },
    });

    await h.handle(makeRequest({ guestUsername: "pål" }), conn, ctx);

    const [actionArg] = oracle.executor.execute.mock.calls[0];
    expect(actionArg.data?.guestCharacterId).toBe("guest-char");
  });

  it("passes isGuest=false so executor has full lore access", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const oracle = makeOracle();
    const ctx = makeContext(oracle);

    await h.handle(makeRequest(), conn, ctx);

    const [, ctxArg] = oracle.executor.execute.mock.calls[0];
    expect(ctxArg.vault.isGuest).toBe(false);
  });

  it("propagates theme ID to execution context", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const oracle = makeOracle();
    const ctx = makeContext(oracle);

    await h.handle(makeRequest(), conn, ctx);

    const [, ctxArg] = oracle.executor.execute.mock.calls[0];
    expect(ctxArg.uiStore?.activeThemeId).toBe("fantasy");
  });

  it("passes history snapshot to chatHistory", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const oracle = makeOracle();
    const ctx = makeContext(oracle);
    const history = [
      { id: "m1", role: "user", content: "Who are you?" },
      { id: "m2", role: "assistant", content: "I am Kardos." },
    ];

    await h.handle(makeRequest({ history }), conn, ctx);

    const [, ctxArg] = oracle.executor.execute.mock.calls[0];
    const msgs = await ctxArg.chatHistory.getMessages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toBe("Who are you?");
  });
});

// ─── error path ───────────────────────────────────────────────────────────────

describe("HostCharChatHandler — executor error", () => {
  beforeEach(() => {
    (oracleBridge as any).isReady = false;
  });

  it("sends DONE with error message when executor throws", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const oracle = makeOracle(async () => {
      throw new Error("AI quota exceeded");
    });
    const ctx = makeContext(oracle);

    await h.handle(makeRequest(), conn, ctx);

    expect(conn.send).toHaveBeenCalledWith({
      type: "GUEST_CHAR_CHAT_DONE",
      requestId: "req-1",
      error: "AI quota exceeded",
    });
  });

  it("falls back to generic error when thrown object has no message", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    const oracle = makeOracle(async () => {
      throw {};
    });
    const ctx = makeContext(oracle);

    await h.handle(makeRequest(), conn, ctx);

    expect(conn.send).toHaveBeenCalledWith({
      type: "GUEST_CHAR_CHAT_DONE",
      requestId: "req-1",
      error: "Generation failed.",
    });
  });
});

// ─── Comlink.proxy regression guard ──────────────────────────────────────────
//
// oracle.executor runs in the main thread (direct reference), but
// oracle.textGeneration IS a Comlink proxy to the Web Worker. The executor
// creates an internal streaming callback that captures local closure state
// (assistantMsg, chatHistory). This plain function cannot cross the postMessage
// boundary unless it is wrapped with Comlink.proxy() first.
//
// The handler intercepts textGeneration.generateResponse and wraps the onUpdate
// argument. These tests guard that contract against regression.

describe("HostCharChatHandler — Comlink.proxy regression guard", () => {
  beforeEach(() => {
    vi.mocked(Comlink.proxy).mockClear();
  });

  it("wraps the generateResponse onUpdate callback with Comlink.proxy in worker mode", async () => {
    (oracleBridge as any).isReady = true;

    const h = new HostCharChatHandler();
    const conn = makeConn();

    // Simulate executor calling textGeneration.generateResponse with a callback
    const capturedOnUpdate: any[] = [];
    const oracle = makeOracle(async (_action, ctx) => {
      const fakeOnUpdate = () => {};
      capturedOnUpdate.push(fakeOnUpdate);
      // Call through the shim — this is what the real executor does
      await ctx.textGeneration.generateResponse(
        "key",
        "q",
        [],
        "",
        "model",
        fakeOnUpdate,
      );
    });
    const ctx = makeContext(oracle);

    await h.handle(makeRequest(), conn, ctx);

    // Comlink.proxy must have been called with the onUpdate callback
    expect(Comlink.proxy).toHaveBeenCalled();
    const proxiedArgs = vi.mocked(Comlink.proxy).mock.calls.map(([fn]) => fn);
    expect(proxiedArgs).toContain(capturedOnUpdate[0]);
  });

  it("does NOT call Comlink.proxy on the onUpdate callback when worker is not active", async () => {
    (oracleBridge as any).isReady = false;

    const h = new HostCharChatHandler();
    const conn = makeConn();

    const oracle = makeOracle(async (_action, ctx) => {
      await ctx.textGeneration.generateResponse(
        "key",
        "q",
        [],
        "",
        "model",
        () => {},
      );
    });
    const ctx = makeContext(oracle);

    await h.handle(makeRequest(), conn, ctx);

    expect(Comlink.proxy).not.toHaveBeenCalled();
  });

  it("passes the raw callback (not a proxy) to oracle.textGeneration when not in worker mode", async () => {
    (oracleBridge as any).isReady = false;

    const h = new HostCharChatHandler();
    const conn = makeConn();
    const oracle = makeOracle(async (_action, ctx) => {
      const rawCb = () => {};
      await ctx.textGeneration.generateResponse(
        "key",
        "q",
        [],
        "",
        "model",
        rawCb,
      );
    });
    const ctx = makeContext(oracle);

    await h.handle(makeRequest(), conn, ctx);

    // The callback passed to oracle.textGeneration.generateResponse should be
    // the raw function, not a Comlink.proxy wrapper
    const passedCb = oracle.textGeneration.generateResponse.mock.calls[0][5];
    expect(passedCb).not.toHaveProperty("__comlinkProxy");
    expect(typeof passedCb).toBe("function");
  });
});

// ─── chatHistory mock behaviour ───────────────────────────────────────────────

describe("HostCharChatHandler — mockChatHistory", () => {
  beforeEach(() => {
    (oracleBridge as any).isReady = false;
  });

  it("addMessage appends to messages array", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    let capturedHistory: any;
    const oracle = makeOracle(async (_req, ctx) => {
      capturedHistory = ctx.chatHistory;
    });
    const ctx = makeContext(oracle);

    await h.handle(makeRequest({ history: [] }), conn, ctx);

    await capturedHistory.addMessage({
      id: "new",
      role: "assistant",
      content: "Hi",
    });
    const msgs = await capturedHistory.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("Hi");
  });

  it("updateMessage patches content in place", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    let capturedHistory: any;
    const oracle = makeOracle(async (_req, ctx) => {
      capturedHistory = ctx.chatHistory;
    });
    const ctx = makeContext(oracle);

    await h.handle(
      makeRequest({
        history: [{ id: "m1", role: "assistant", content: "..." }],
      }),
      conn,
      ctx,
    );

    await capturedHistory.updateMessage("m1", { content: "Final answer." });
    const msgs = await capturedHistory.getMessages();
    expect(msgs.find((m: any) => m.id === "m1")?.content).toBe("Final answer.");
  });

  it("setMessages replaces the entire messages array", async () => {
    const h = new HostCharChatHandler();
    const conn = makeConn();
    let capturedHistory: any;
    const oracle = makeOracle(async (_req, ctx) => {
      capturedHistory = ctx.chatHistory;
    });
    const ctx = makeContext(oracle);

    await h.handle(
      makeRequest({ history: [{ id: "old", role: "user", content: "old" }] }),
      conn,
      ctx,
    );

    await capturedHistory.setMessages([
      { id: "new", role: "assistant", content: "new" },
    ]);
    const msgs = await capturedHistory.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].id).toBe("new");
  });
});
