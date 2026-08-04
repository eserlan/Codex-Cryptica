/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { isGuest: false },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { openRevisionDialog: vi.fn() },
}));

import CanvasContextMenu from "./CanvasContextMenu.svelte";

describe("CanvasContextMenu lock toggle", () => {
  it("shows 'Lock in Place' for an unlocked node and calls onToggleLock", async () => {
    const onToggleLock = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        isLocked: false,
        onDelete: vi.fn(),
        onToggleLock,
        onClose: vi.fn(),
      } as any,
    });

    const button = screen.getByRole("menuitem", { name: "Lock in Place" });
    await fireEvent.click(button);

    expect(onToggleLock).toHaveBeenCalled();
  });

  it("shows 'Unlock' for a locked node", () => {
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        isLocked: true,
        onDelete: vi.fn(),
        onToggleLock: vi.fn(),
        onClose: vi.fn(),
      } as any,
    });

    expect(screen.getByRole("menuitem", { name: "Unlock" })).toBeTruthy();
  });

  it("does not show a lock toggle when onToggleLock is not provided", () => {
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        onClose: vi.fn(),
      } as any,
    });

    expect(
      screen.queryByRole("menuitem", { name: "Lock in Place" }),
    ).toBeNull();
  });

  it("does not show a lock toggle for edges or the pane", () => {
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "edge-1",
        targetType: "edge",
        onDelete: vi.fn(),
        onToggleLock: vi.fn(),
        onClose: vi.fn(),
      } as any,
    });

    expect(
      screen.queryByRole("menuitem", { name: "Lock in Place" }),
    ).toBeNull();
  });
});

describe("CanvasContextMenu stacking", () => {
  it("calls onBringToFront and onSendToBack for a node target", async () => {
    const onBringToFront = vi.fn();
    const onSendToBack = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        onBringToFront,
        onSendToBack,
        onClose: vi.fn(),
      } as any,
    });

    await fireEvent.click(
      screen.getByRole("menuitem", { name: "Bring to Front" }),
    );
    expect(onBringToFront).toHaveBeenCalledOnce();

    await fireEvent.click(
      screen.getByRole("menuitem", { name: "Send to Back" }),
    );
    expect(onSendToBack).toHaveBeenCalledOnce();
  });

  it("does not show stacking actions when unavailable", () => {
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        onClose: vi.fn(),
      } as any,
    });

    expect(
      screen.queryByRole("menuitem", { name: "Bring to Front" }),
    ).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Send to Back" })).toBeNull();
  });
});

describe("CanvasContextMenu pane actions", () => {
  it("pastes an image from the clipboard", async () => {
    const onPaste = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetType: "pane",
        onDelete: vi.fn(),
        onPaste,
        onClose: vi.fn(),
      } as any,
    });

    await fireEvent.click(
      screen.getByRole("menuitem", { name: "Paste Image" }),
    );
    expect(onPaste).toHaveBeenCalledOnce();
  });

  it("adds a text note to the canvas", async () => {
    const onAddTextNode = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetType: "pane",
        onDelete: vi.fn(),
        onAddTextNode,
        onClose: vi.fn(),
      } as any,
    });

    await fireEvent.click(
      screen.getByRole("menuitem", { name: "Add Text Note" }),
    );
    expect(onAddTextNode).toHaveBeenCalledOnce();
  });
});

describe("CanvasContextMenu text note styling", () => {
  it("reports the chosen background preset for a text node", async () => {
    const onTextNodeBackgroundChange = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "note-1",
        targetType: "node",
        onDelete: vi.fn(),
        textNodeBackground: "default",
        onTextNodeBackgroundChange,
        onClose: vi.fn(),
      } as any,
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Set background to accent" }),
    );
    expect(onTextNodeBackgroundChange).toHaveBeenCalledWith("accent");
  });

  it("reports the chosen font size for a text node", async () => {
    const onTextNodeFontSizeChange = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "note-1",
        targetType: "node",
        onDelete: vi.fn(),
        textNodeFontSize: 14,
        onTextNodeFontSizeChange,
        onClose: vi.fn(),
      } as any,
    });

    await fireEvent.click(screen.getByRole("menuitemradio", { name: "24" }));
    expect(onTextNodeFontSizeChange).toHaveBeenCalledWith(24);
  });

  it("does not show text note styling controls for a non-text node", () => {
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        onClose: vi.fn(),
      } as any,
    });

    expect(
      screen.queryByRole("button", { name: /Set background to/ }),
    ).toBeNull();
  });
});
