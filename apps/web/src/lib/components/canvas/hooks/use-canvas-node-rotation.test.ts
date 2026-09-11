/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/svelte";
import { useCanvasNodeRotation } from "./use-canvas-node-rotation.svelte";

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: "node-1",
    type: "delveRoom",
    position: { x: 0, y: 0 },
    data: {},
    ...overrides,
  } as Node;
}

function pointerEvent(
  overrides: Partial<PointerEvent> & { target?: EventTarget | null } = {},
) {
  return {
    pointerType: "touch",
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    button: 0,
    target: null,
    currentTarget: { setPointerCapture: vi.fn() },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides,
  } as unknown as PointerEvent;
}

describe("useCanvasNodeRotation", () => {
  it("ignores non-touch pointers, guests, and drawing/erasing modes for touch rotation", () => {
    const updateNodeRotation = vi.fn();
    const nodes = [makeNode()];
    const rotation = useCanvasNodeRotation(
      { nodes, updateNodeRotation, saveNow: vi.fn() },
      { isGuest: false },
    );

    rotation.beginTouchRotation(
      pointerEvent({ pointerType: "mouse" }),
      false,
      false,
    );
    expect(rotation.isRotatingNode).toBe(false);

    const guestRotation = useCanvasNodeRotation(
      { nodes, updateNodeRotation, saveNow: vi.fn() },
      { isGuest: true },
    );
    guestRotation.beginTouchRotation(pointerEvent(), false, false);
    expect(guestRotation.isRotatingNode).toBe(false);

    rotation.beginTouchRotation(pointerEvent(), true, false);
    expect(rotation.isRotatingNode).toBe(false);
  });

  it("does not allow rotation of locked nodes or delveSectorGroup nodes", () => {
    const lockedNode = makeNode({ id: "locked", data: { locked: true } });
    const groupNode = makeNode({ id: "group", type: "delveSectorGroup" });
    const rotation = useCanvasNodeRotation(
      { nodes: [lockedNode, groupNode], updateNodeRotation: vi.fn(), saveNow: vi.fn() },
      { isGuest: false },
    );

    expect(rotation.canRotateNode("locked")).toBe(false);
    expect(rotation.canRotateNode("group")).toBe(false);
    expect(rotation.canRotateNode("missing")).toBe(false);
  });

  it("accumulates rotation across a two-finger touch gesture", () => {
    const updateNodeRotation = vi.fn();
    const node = makeNode();
    const rotation = useCanvasNodeRotation(
      { nodes: [node], updateNodeRotation, saveNow: vi.fn() },
      { isGuest: false },
    );

    const element = document.createElement("div");
    element.dataset.id = "node-1";
    const child = document.createElement("span");
    element.appendChild(child);
    vi.spyOn(child, "closest").mockReturnValue(element);

    rotation.beginTouchRotation(
      pointerEvent({ pointerId: 1, clientX: 0, clientY: 0, target: child }),
      false,
      false,
    );
    rotation.beginTouchRotation(
      pointerEvent({ pointerId: 2, clientX: 10, clientY: 0, target: child }),
      false,
      false,
    );

    expect(rotation.isRotatingNode).toBe(true);

    rotation.handleRotationPointerMove(
      pointerEvent({ pointerId: 2, clientX: 10, clientY: 10 }),
    );

    expect(updateNodeRotation).toHaveBeenCalledWith("node-1", expect.any(Number));
  });

  it("clears rotation state when a rotating pointer is cancelled", () => {
    const updateNodeRotation = vi.fn();
    const saveNow = vi.fn();
    const node = makeNode();
    const rotation = useCanvasNodeRotation(
      { nodes: [node], updateNodeRotation, saveNow },
      { isGuest: false },
    );

    const element = document.createElement("div");
    element.dataset.id = "node-1";
    const child = document.createElement("span");
    element.appendChild(child);
    vi.spyOn(child, "closest").mockReturnValue(element);

    rotation.beginTouchRotation(
      pointerEvent({ pointerId: 1, clientX: 0, clientY: 0, target: child }),
      false,
      false,
    );
    rotation.beginTouchRotation(
      pointerEvent({ pointerId: 2, clientX: 10, clientY: 0, target: child }),
      false,
      false,
    );
    expect(rotation.isRotatingNode).toBe(true);

    rotation.finishNodeRotation(pointerEvent({ pointerId: 1 }));

    expect(rotation.isRotatingNode).toBe(false);
    expect(saveNow).toHaveBeenCalled();
  });

  it("returns null when the pointer target is not an Element", () => {
    const updateNodeRotation = vi.fn();
    const node = makeNode();
    const rotation = useCanvasNodeRotation(
      { nodes: [node], updateNodeRotation, saveNow: vi.fn() },
      { isGuest: false },
    );

    expect(() =>
      rotation.beginTouchRotation(
        pointerEvent({ target: null }),
        false,
        false,
      ),
    ).not.toThrow();
    expect(rotation.isRotatingNode).toBe(false);
  });

  it("rotates the selected node with the keyboard, respecting shift for larger steps", () => {
    const updateNodeRotation = vi.fn();
    const saveNow = vi.fn();
    const node = makeNode({ data: { rotation: 10 } });
    const rotation = useCanvasNodeRotation(
      { nodes: [node], updateNodeRotation, saveNow },
      { isGuest: false },
    );
    rotation.selectedRotationNodeId = "node-1";

    const event = {
      key: "ArrowRight",
      shiftKey: true,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    rotation.rotateSelectedNodeWithKeyboard(event);

    expect(updateNodeRotation).toHaveBeenCalledWith("node-1", 55);
    expect(saveNow).toHaveBeenCalled();
  });

  it("ignores keyboard rotation for locked nodes and non-arrow keys", () => {
    const updateNodeRotation = vi.fn();
    const lockedNode = makeNode({ id: "locked", data: { locked: true } });
    const rotation = useCanvasNodeRotation(
      { nodes: [lockedNode], updateNodeRotation, saveNow: vi.fn() },
      { isGuest: false },
    );
    rotation.selectedRotationNodeId = "locked";

    rotation.rotateSelectedNodeWithKeyboard({
      key: "ArrowRight",
      shiftKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(updateNodeRotation).not.toHaveBeenCalled();

    rotation.selectedRotationNodeId = null;
    rotation.rotateSelectedNodeWithKeyboard({
      key: "Enter",
      shiftKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(updateNodeRotation).not.toHaveBeenCalled();
  });
});
