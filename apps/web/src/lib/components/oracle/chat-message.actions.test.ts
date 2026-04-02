import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMessageActions } from "./chat-message.actions";

describe("ChatMessageActions", () => {
  let actions: ChatMessageActions;
  let vault: any;
  let oracle: any;
  let graph: any;

  beforeEach(() => {
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

  it("applies smart updates with undo support", async () => {
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

    expect(vault.updateEntity).toHaveBeenCalledWith("target", {
      content: "new chronicle",
      lore: "new lore",
    });
    expect(setSaved).toHaveBeenCalledWith(true);
    expect(oracle.pushUndoAction).toHaveBeenCalled();
  });

  it("snapshots the entity before cloning during undo capture", async () => {
    const setSaved = vi.fn();
    const entityRef = vault.entities.target;
    const structuredCloneSpy = vi
      .spyOn(globalThis, "structuredClone")
      .mockImplementation((value) => value as any);

    await actions.copyToChronicle({
      message: {
        id: "message-chronicle",
        content: "fresh chronicle",
      } as any,
      activeEntityId: "target",
      setSaved,
    });

    expect(structuredCloneSpy).toHaveBeenCalledTimes(1);
    expect(structuredCloneSpy.mock.calls[0][0]).not.toBe(entityRef);
  });

  it("creates a node from parsed chat content", async () => {
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
    expect(graph.requestFit).toHaveBeenCalled();
    expect(setSaved).toHaveBeenCalledWith(true);
    expect(oracle.pushUndoAction).toHaveBeenCalled();
  });

  it("skips blank connections when creating a node", async () => {
    const setSaved = vi.fn();

    await actions.createAsNode({
      message: {
        id: "message-blank-connections",
      } as any,
      parsed: {
        title: "Blank Connection Node",
        connections: [
          { target: "Friend", label: "friend" },
          { target: "   ", label: "ignored" },
          "",
        ],
      },
      setSaved,
    });

    expect(vault.createEntity).toHaveBeenCalledWith(
      "character",
      "Blank Connection Node",
      expect.objectContaining({
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
  });

  it("updates chronicle content with undo support", async () => {
    const setSaved = vi.fn();

    await actions.copyToChronicle({
      message: {
        id: "message-3",
        content: "fresh chronicle",
      } as any,
      activeEntityId: "target",
      setSaved,
    });

    expect(vault.updateEntity).toHaveBeenCalledWith("target", {
      content: "fresh chronicle",
    });
    expect(setSaved).toHaveBeenCalledWith(true);
    expect(oracle.pushUndoAction).toHaveBeenCalled();
  });

  it("updates lore content with undo support", async () => {
    const setSaved = vi.fn();

    await actions.copyToLore({
      message: {
        id: "message-4",
        content: "fresh lore",
      } as any,
      activeEntityId: "target",
      setSaved,
    });

    expect(vault.updateEntity).toHaveBeenCalledWith("target", {
      lore: "fresh lore",
    });
    expect(setSaved).toHaveBeenCalledWith(true);
    expect(oracle.pushUndoAction).toHaveBeenCalled();

    const undo = oracle.pushUndoAction.mock.calls.at(-1)?.[1];
    await undo?.();

    expect(vault.updateEntity).toHaveBeenCalledWith("target", {
      lore: "old lore",
    });
    expect(setSaved).toHaveBeenCalledWith(false);
  });

  it("delegates undo to the oracle stack", async () => {
    await actions.undo();
    expect(oracle.undo).toHaveBeenCalled();
  });
});
