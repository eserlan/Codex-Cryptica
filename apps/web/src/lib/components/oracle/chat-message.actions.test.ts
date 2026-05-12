import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMessageActions } from "./chat-message.actions";

const { regenerationServiceMock } = vi.hoisted(() => ({
  regenerationServiceMock: { pendingDraft: null as any },
}));

vi.mock("$lib/services/RegenerationService.svelte", () => ({
  regenerationService: regenerationServiceMock,
  default: regenerationServiceMock,
}));

describe("ChatMessageActions", () => {
  let actions: ChatMessageActions;
  let vault: any;
  let oracle: any;
  let graph: any;

  beforeEach(() => {
    vi.clearAllMocks();
    regenerationServiceMock.pendingDraft = null;
    vault = {
      entities: {
        target: {
          id: "target",
          title: "Target",
          type: "npc",
          content: "old chronicle",
          lore: "old lore",
        },
      },
      selectedEntityId: null,
      updateEntity: vi.fn().mockResolvedValue(undefined),
      createEntity: vi.fn().mockResolvedValue("new-id"),
      deleteEntity: vi.fn().mockResolvedValue(undefined),
      isGuest: false,
    };
    oracle = {
      pushUndoAction: vi.fn(),
      updateMessageEntity: vi.fn(),
      undo: vi.fn().mockResolvedValue(undefined),
      reconcileSmartApply: vi.fn().mockResolvedValue({
        content: "new chronicle",
        lore: "new lore",
      }),
    };
    graph = {
      requestFit: vi.fn(),
    };

    actions = new ChatMessageActions({
      vault,
      oracle,
      graph,
    } as any);
  });

  it("proposes a smart update draft instead of immediate apply", async () => {
    const setSaved = vi.fn();

    await actions.applySmart({
      message: {
        id: "message-1",
        content: "ignored",
      } as any,
      parsed: {
        chronicle: "new chronicle",
        lore: "new lore",
      },
      activeEntityId: "target",
      setSaved,
    });

    expect(vault.updateEntity).not.toHaveBeenCalled();
    expect(regenerationServiceMock.pendingDraft).toEqual(
      expect.objectContaining({
        entityId: "target",
        messageId: "message-1",
        chronicle: "new chronicle",
        lore: "new lore",
      }),
    );
    expect(setSaved).toHaveBeenCalledWith(true);
    expect(vault.selectedEntityId).toBe("target");
  });

  it("creates a node from parsed chat content with immediate apply and undo", async () => {
    const setSaved = vi.fn();

    await actions.createAsNode({
      message: {
        id: "message-2",
      } as any,
      parsed: {
        title: "New Node",
        type: "character",
        chronicle: "node chronicle",
        lore: "node lore",
        connections: [{ target: "Friend", label: "friend" }],
      },
      setSaved,
    });

    expect(vault.createEntity).toHaveBeenCalledWith(
      "character",
      "New Node",
      expect.objectContaining({
        content: "node chronicle",
        lore: "node lore",
        connections: [
          {
            target: "friend",
            label: "friend",
            type: "related_to",
            strength: 1,
          },
        ],
      }),
    );
    expect(oracle.updateMessageEntity).toHaveBeenCalledWith(
      "message-2",
      "new-id",
    );
    expect(setSaved).toHaveBeenCalledWith(true);
    expect(oracle.pushUndoAction).toHaveBeenCalled();
  });

  it("proposes a chronicle update draft with reconciliation and preserves existing lore", async () => {
    const setSaved = vi.fn();
    oracle.reconcileSmartApply.mockResolvedValue({
      content: "fresh chronicle reconciled",
    });

    await actions.copyToChronicle({
      message: {
        id: "message-3",
        content: "fresh chronicle",
      } as any,
      activeEntityId: "target",
      setSaved,
    });

    expect(oracle.reconcileSmartApply).toHaveBeenCalledWith("target", {
      chronicle: "fresh chronicle",
    });
    expect(regenerationServiceMock.pendingDraft).toEqual(
      expect.objectContaining({
        entityId: "target",
        messageId: "message-3",
        chronicle: "fresh chronicle reconciled",
        lore: "old lore", // Preserved from vault.entities.target
      }),
    );
    expect(setSaved).toHaveBeenCalledWith(true);
  });

  it("proposes a lore update draft with reconciliation and preserves existing chronicle", async () => {
    const setSaved = vi.fn();
    oracle.reconcileSmartApply.mockResolvedValue({
      lore: "fresh lore reconciled",
    });

    await actions.copyToLore({
      message: {
        id: "message-4",
        content: "fresh lore",
      } as any,
      activeEntityId: "target",
      setSaved,
    });

    expect(oracle.reconcileSmartApply).toHaveBeenCalledWith("target", {
      lore: "fresh lore",
    });
    expect(regenerationServiceMock.pendingDraft).toEqual(
      expect.objectContaining({
        entityId: "target",
        messageId: "message-4",
        chronicle: "old chronicle", // Preserved from vault.entities.target
        lore: "fresh lore reconciled",
      }),
    );
    expect(setSaved).toHaveBeenCalledWith(true);
  });

  it("delegates undo to the oracle stack", async () => {
    await actions.undo();
    expect(oracle.undo).toHaveBeenCalled();
  });
});
