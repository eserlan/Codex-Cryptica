import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/svelte";
import { useCanvasContextMenu } from "./use-canvas-context-menu.svelte";

function makeNode(
  id: string,
  type: string,
  data: Record<string, unknown> = {},
) {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data,
  } as Node;
}

describe("useCanvasContextMenu", () => {
  it("derives lock, stacking, and target node state from the context menu", () => {
    const logic = {
      contextMenu: { type: "node", id: "locked-node", x: 10, y: 20 },
      nodes: [
        makeNode("locked-node", "text", { locked: true }),
        makeNode("group-node", "delveSectorGroup"),
      ],
    };
    const contextMenu = useCanvasContextMenu(logic, { isGuest: false });

    expect(contextMenu.contextMenuNodeLocked).toBe(true);
    expect(contextMenu.contextMenuNodeStackable).toBe(true);
    expect(contextMenu.contextMenuTextNode?.id).toBe("locked-node");
    expect(contextMenu.contextMenuEntityNode).toBeUndefined();

    const groupMenu = useCanvasContextMenu(
      {
        contextMenu: { type: "node", id: "group-node", x: 0, y: 0 },
        nodes: logic.nodes,
      },
      { isGuest: false },
    );
    expect(groupMenu.contextMenuNodeStackable).toBe(false);
    expect(groupMenu.contextMenuTextNode).toBeUndefined();
  });

  it("records pointer coordinates for node and edge context menus", () => {
    const logic = { contextMenu: null as unknown, nodes: [] as Node[] };
    const contextMenu = useCanvasContextMenu(logic, { isGuest: false });
    const event = {
      clientX: 31,
      clientY: 47,
      preventDefault: vi.fn(),
    } as unknown as MouseEvent;

    contextMenu.onNodeContextMenu({ event, node: { id: "node-1" } });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(logic.contextMenu).toEqual({
      x: 31,
      y: 47,
      type: "node",
      id: "node-1",
    });

    contextMenu.onEdgeContextMenu({ event, edge: { id: "edge-1" } });
    expect(logic.contextMenu).toEqual({
      x: 31,
      y: 47,
      type: "edge",
      id: "edge-1",
    });
  });

  it("suppresses pane menus for guests and opens them for editable vaults", () => {
    const guestLogic = { contextMenu: null as unknown, nodes: [] as Node[] };
    const guestMenu = useCanvasContextMenu(guestLogic, { isGuest: true });
    const guestEvent = {
      clientX: 10,
      clientY: 20,
      preventDefault: vi.fn(),
    } as unknown as MouseEvent;

    guestMenu.handlePaneContextMenu({ event: guestEvent });
    expect(guestEvent.preventDefault).not.toHaveBeenCalled();
    expect(guestLogic.contextMenu).toBeNull();

    const localLogic = { contextMenu: null as unknown, nodes: [] as Node[] };
    const localMenu = useCanvasContextMenu(localLogic, { isGuest: false });
    const localEvent = {
      clientX: 10,
      clientY: 20,
      preventDefault: vi.fn(),
    } as unknown as MouseEvent;

    localMenu.handlePaneContextMenu({ event: localEvent });
    expect(localEvent.preventDefault).toHaveBeenCalledOnce();
    expect(localLogic.contextMenu).toEqual({
      x: 10,
      y: 20,
      type: "pane",
      id: "pane",
    });
  });
});
