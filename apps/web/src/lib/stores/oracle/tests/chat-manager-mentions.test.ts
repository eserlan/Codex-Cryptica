import { describe, it, expect, beforeEach, vi } from "vitest";
import { OracleChatManager } from "../chat-manager.svelte";
import type { IOracleStore } from "../types";

const elara = {
  id: "e-elara",
  title: "Elara Voss",
  type: "character",
  labels: [],
  content: "The Grand Archmage.",
  connections: [],
};
const spy = {
  id: "e-spy",
  title: "Shadow Spy",
  type: "character",
  labels: ["hidden"],
  content: "Secret.",
  connections: [],
};

describe("OracleChatManager @mentions (#4052)", () => {
  let manager: OracleChatManager;
  let mockStore: any;

  beforeEach(() => {
    mockStore = {
      chatHistoryService: { messages: [], addMessage: vi.fn() },
      discoveryPolicyStore: { aiDisabled: false },
      sessionModeStore: { isGuestMode: false },
      getExecutionContext: vi.fn(() => ({})),
      executor: { execute: vi.fn() },
      notificationStore: { confirm: vi.fn().mockResolvedValue(true) },
      sessionActivity: { clear: vi.fn() },
      textGeneration: { resetConversation: vi.fn() },
      vault: {
        activeVaultId: "v1",
        isGuest: false,
        defaultVisibility: "visible",
        entities: { "e-elara": elara, "e-spy": spy },
        allEntities: [elara, spy],
      },
    };
    manager = new OracleChatManager(mockStore as IOracleStore);
  });

  const executed = () => mockStore.executor.execute.mock.calls[0][0];

  it("attaches a picked mention and pins its entity id on a chat intent", async () => {
    await manager.sendMessage("Who is @Elara Voss?", [
      {
        entityId: "e-elara",
        displayName: "Elara Voss",
        entityType: "character",
        start: 7,
        end: 18,
      },
    ]);

    const intent = executed();
    expect(intent.mentions).toEqual([
      {
        entityId: "e-elara",
        displayName: "Elara Voss",
        entityType: "character",
        start: 7,
        end: 18,
      },
    ]);
    expect(intent.pinnedEntityIds).toEqual(["e-elara"]);
  });

  it("resolves a typed @name that matches one entity without a picker", async () => {
    await manager.sendMessage("Who is @Elara Voss?");
    expect(executed().pinnedEntityIds).toEqual(["e-elara"]);
  });

  it("sends plain text unchanged, with no mention fields", async () => {
    await manager.sendMessage("Tell me about the harbour");
    const intent = executed();
    expect(intent).not.toHaveProperty("mentions");
    expect(intent).not.toHaveProperty("pinnedEntityIds");
  });

  it("treats a pasted mention for a hidden entity as plain text for a guest", async () => {
    mockStore.vault.isGuest = true;
    await manager.sendMessage("Who is @Shadow Spy?", [
      {
        entityId: "e-spy",
        displayName: "Shadow Spy",
        entityType: "character",
        start: 7,
        end: 19,
      },
    ]);
    const intent = executed();
    expect(intent.pinnedEntityIds).toBeUndefined();
    expect(intent.mentions).toBeUndefined();
    expect(intent.query).toContain("Shadow Spy");
  });

  it("treats a pasted mention for an id outside the Vault as plain text", async () => {
    await manager.sendMessage("Who is @Ghost?", [
      {
        entityId: "e-other-vault",
        displayName: "Ghost",
        entityType: "character",
        start: 7,
        end: 13,
      },
    ]);
    expect(executed().pinnedEntityIds).toBeUndefined();
  });

  it("does not pin mentions for drawing, which is detected downstream", async () => {
    await manager.sendMessage("/draw Elara Voss", [
      {
        entityId: "e-elara",
        displayName: "Elara Voss",
        entityType: "character",
        start: 6,
        end: 17,
      },
    ]);
    const intent = executed();
    expect(intent.type).toBe("chat");
    expect(intent).not.toHaveProperty("pinnedEntityIds");
  });

  it("leaves a vault-changing command untouched by mentions", async () => {
    await manager.sendMessage('/create "Elara Voss"', [
      {
        entityId: "e-elara",
        displayName: "Elara Voss",
        entityType: "character",
        start: 9,
        end: 20,
      },
    ]);
    const intent = executed();
    expect(intent.type).toBe("create");
    expect(intent).not.toHaveProperty("pinnedEntityIds");
  });

  it("still blocks vault-changing commands for guests", async () => {
    mockStore.sessionModeStore.isGuestMode = true;
    await manager.sendMessage('/create "Elara"');
    expect(mockStore.executor.execute).not.toHaveBeenCalled();
  });

  it("leaves /connect as a wizard and pins nothing from a mention", async () => {
    await manager.sendMessage("/connect", [
      {
        entityId: "e-elara",
        displayName: "Elara Voss",
        entityType: "character",
        start: 9,
        end: 20,
      },
    ]);
    expect(executed()).not.toHaveProperty("pinnedEntityIds");
  });

  it("keeps Clear History behind its confirmation and clears the stored conversation", async () => {
    mockStore.chatHistoryService.clear = vi.fn().mockResolvedValue(undefined);
    await manager.clearMessages();
    expect(mockStore.notificationStore.confirm).toHaveBeenCalled();
    expect(mockStore.chatHistoryService.clear).toHaveBeenCalled();
  });

  it("does not clear the conversation when the user cancels Clear History", async () => {
    mockStore.chatHistoryService.clear = vi.fn();
    mockStore.notificationStore.confirm = vi.fn().mockResolvedValue(false);
    await manager.clearMessages();
    expect(mockStore.chatHistoryService.clear).not.toHaveBeenCalled();
  });
});
