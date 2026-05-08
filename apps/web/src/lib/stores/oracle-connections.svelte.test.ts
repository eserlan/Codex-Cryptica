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

// Mock Oracle Engine classes
vi.mock("@codex/oracle-engine", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    OracleCommandParser: {
      parse: vi.fn().mockImplementation((query) => {
        if (query.startsWith("/connect")) {
          return {
            type: "connect",
            sourceName: "Eldrin",
            targetName: "Tower",
            label: "master of",
          };
        }
        return { type: "chat", query };
      }),
    },
  };
});

vi.mock("../../lib/services/search", () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("./vault.svelte", () => ({
  vault: {
    activeVaultId: "test-vault",
    entities: {},
  },
}));

vi.mock("./ui.svelte", () => {
  const uiStore = {
    aiDisabled: false,
    isDemoMode: false,
    confirm: vi.fn().mockResolvedValue(true),
    notify: vi.fn(),
  };
  return {
    uiStore,
    ui: uiStore,
  };
});

import { OracleStore } from "./oracle.svelte";
import { OracleActionExecutor } from "@codex/oracle-engine";
import { vault as mockVault } from "./vault.svelte";
import { uiStore as mockUiStore } from "./ui.svelte";

describe("OracleStore - /connect parsing", () => {
  let oracle: OracleStore;
  let mockChatHistory: any;
  let executor: OracleActionExecutor;
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
      init: vi.fn().mockResolvedValue(undefined),
    };

    mockSettings = {
      effectiveApiKey: "test-key",
      isEnabled: true,
      setLoading: vi.fn(),
      settings: {
        apiKey: "test-key",
        tier: "advanced",
        modelName: "test-model",
        connectionMode: "custom-key",
      },
      init: vi.fn().mockResolvedValue(undefined),
    };

    mockUndoRedo = {
      pushUndoAction: vi.fn(),
      undoStack: [],
      redoStack: [],
    };

    executor = new OracleActionExecutor();

    oracle = new OracleStore({
      vault: mockVault as any,
      uiStore: mockUiStore as any,
      chatHistoryService: mockChatHistory,
      settingsService: mockSettings,
      undoRedo: mockUndoRedo,
      executor: executor,
    });

    (oracle as any).isInitialized = true;
  });

  it("should handle direct /connect command", async () => {
    // Mock the internal executeConnect to avoid deep dependencies
    const executeConnectSpy = vi
      .spyOn(executor as any, "executeConnect")
      .mockImplementation(async (source: any, label: any, target: any) => {
        await mockChatHistory.addMessage({
          role: "assistant",
          content: `✅ Connected **${source}** to **${target}**`,
        });
      });

    await oracle.ask("/connect Eldrin is the master of Tower");

    const assistantMsg = mockChatHistory.messages.find(
      (m: any) => m.role === "assistant",
    );
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.content).toContain("Connected **Eldrin** to **Tower**");
    expect(executeConnectSpy).toHaveBeenCalled();
  });

  it("should show error if entities cannot be resolved", async () => {
    vi.spyOn(executor as any, "executeConnect").mockImplementationOnce(
      async (_source: any, _label: any, _target: any) => {
        await mockChatHistory.addMessage({
          role: "system",
          content: '❌ Could not find source entity: "Unknown"',
        });
      },
    );

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
