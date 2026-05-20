import { describe, it, expect, beforeEach, vi } from "vitest";
import { OracleChatManager } from "../chat-manager.svelte";
import type { IOracleStore } from "../types";

describe("OracleChatManager", () => {
  let manager: OracleChatManager;
  let mockStore: any;
  let mockChatService: any;

  beforeEach(() => {
    mockChatService = {
      messages: [{ id: "m1", content: "hello" }],
      init: vi.fn(),
      switchVault: vi.fn(),
      clear: vi.fn(),
      removeMessage: vi.fn(),
      startWizard: vi.fn(),
      setMessages: vi.fn(),
      updateMessage: vi.fn(),
      addProposal: vi.fn(),
      addTestImageMessage: vi.fn(),
    };
    mockStore = {
      chatHistoryService: mockChatService,
      discoveryPolicyStore: { aiDisabled: false },
      getExecutionContext: vi.fn(),
      executor: { execute: vi.fn() },
      notificationStore: { confirm: vi.fn().mockResolvedValue(true) },
      sessionActivity: { clear: vi.fn() },
    };
    manager = new OracleChatManager(mockStore as IOracleStore);
  });

  it("should expose messages", () => {
    expect(manager.messages).toEqual([{ id: "m1", content: "hello" }]);
  });

  it("should clear messages with confirmation", async () => {
    await manager.clearMessages();
    expect(mockStore.notificationStore.confirm).toHaveBeenCalled();
    expect(mockChatService.clear).toHaveBeenCalled();
    expect(mockStore.sessionActivity.clear).toHaveBeenCalled();
  });
});
