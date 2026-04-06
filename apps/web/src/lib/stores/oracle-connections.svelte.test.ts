import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock environment
vi.mock("$app/environment", () => ({
  browser: true,
}));

// Mock Svelte 5 Runes
vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
  (global as any).$derived = (v: any) => v;
  (global as any).$derived.by = (v: any) => v;
  (global as any).$effect = (v: any) => v;
  (global as any).$effect.root = (v: any) => v();
});

vi.mock("../../lib/services/search", () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

import { OracleStore } from "./oracle.svelte";

describe("OracleStore - /connect parsing", () => {
  let oracle: OracleStore;
  let mockChatHistory: any;
  let mockExecutor: any;
  let mockSettings: any;
  let mockUndoRedo: any;

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

    mockSettings = {
      effectiveApiKey: "test-key",
      isEnabled: true,
      setLoading: vi.fn(),
    };

    mockUndoRedo = {
      pushUndoAction: vi.fn(),
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
      mockSettings,
      mockUndoRedo,
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
    mockExecutor.execute.mockImplementationOnce(async (_intent: any) => {
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
