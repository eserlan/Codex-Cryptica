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
      textGeneration: {
        resetConversation: vi.fn().mockResolvedValue(undefined),
      },
      vault: { activeVaultId: "v1" },
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

  it("resets the model's copy of the chat when history is cleared", async () => {
    await manager.clearMessages();
    expect(mockStore.textGeneration.resetConversation).toHaveBeenCalledWith(
      "oracle:v1:normal",
    );
  });

  it("does not reset the model's chat when the user cancels", async () => {
    mockStore.notificationStore.confirm.mockResolvedValue(false);
    await manager.clearMessages();
    expect(mockChatService.clear).not.toHaveBeenCalled();
    expect(mockStore.textGeneration.resetConversation).not.toHaveBeenCalled();
  });

  it("still clears history when the model reset fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockStore.textGeneration.resetConversation.mockRejectedValue(
      new Error("worker gone"),
    );
    await expect(manager.clearMessages()).resolves.toBeUndefined();
    expect(mockChatService.clear).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("works when the text generation service cannot reset", async () => {
    mockStore.textGeneration = {};
    await expect(manager.clearMessages()).resolves.toBeUndefined();
    expect(mockChatService.clear).toHaveBeenCalled();
  });

  it("resets the model's chat when the store is reset", async () => {
    await manager.reset();
    expect(mockChatService.setMessages).toHaveBeenCalledWith([]);
    expect(mockStore.textGeneration.resetConversation).toHaveBeenCalledWith(
      "oracle:v1:normal",
    );
  });
});
