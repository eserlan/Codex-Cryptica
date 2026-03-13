import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/services/search", () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

// Mock Svelte 5 Runes
vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (v: any) => v;
  (global as any).$effect = (v: any) => v;
});

import { OracleStore } from "./oracle.svelte";

describe("OracleStore - /connect parsing", () => {
  let oracle: OracleStore;
  let mockChatHistory: any;
  let mockExecutor: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChatHistory = {
      messages: [],
      addMessage: vi.fn().mockImplementation((m) => {
        mockChatHistory.messages.push(m);
        return Promise.resolve();
      }),
      setMessages: vi.fn().mockImplementation((ms) => {
        mockChatHistory.messages = ms;
      }),
      clearMessages: vi.fn(),
    };

    mockExecutor = {
      execute: vi
        .fn()
        .mockImplementation(async (intent, _context, onUpdate) => {
          if (intent.type === "connect-ai" || intent.type === "connect") {
            const content = "✅ Connected **Eldrin** to **Tower**";
            await mockChatHistory.addMessage({ role: "assistant", content });
            if (onUpdate) onUpdate(content);
          } else if (intent.type === "error") {
            await mockChatHistory.addMessage({
              role: "system",
              content: intent.message,
            });
          }
        }),
    };

    oracle = new OracleStore(
      mockChatHistory,
      undefined,
      undefined,
      mockExecutor,
    );
  });

  it("should handle direct /connect command", async () => {
    await oracle.ask("/connect Eldrin is the master of Tower");

    const assistantMsg = mockChatHistory.messages.find(
      (m: any) => m.role === "assistant",
    );
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.content).toContain("Connected **Eldrin** to **Tower**");
    expect(mockExecutor.execute).toHaveBeenCalled();
  });

  it("should show error if entities cannot be resolved", async () => {
    // Force an error intent from parser by being in lite mode or similar,
    // but here we just mock the executor's response to an error intent
    mockExecutor.execute.mockImplementationOnce(async (_intent) => {
      await mockChatHistory.addMessage({
        role: "system",
        content: '❌ Could not find source entity: "Unknown"',
      });
    });

    await oracle.ask("/connect Unknown to Tower");

    const errorMsg = mockChatHistory.messages.find(
      (m: any) => m.role === "system",
    );
    expect(errorMsg).toBeDefined();
    expect(errorMsg.content).toContain(
      'Could not find source entity: "Unknown"',
    );
  });
});
