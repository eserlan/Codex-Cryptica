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

  it("reports the chosen background preset using onNodeBackgroundChange", async () => {
    const onNodeBackgroundChange = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "entity-1",
        targetType: "node",
        onDelete: vi.fn(),
        nodeBackground: "default",
        onNodeBackgroundChange,
        onClose: vi.fn(),
      } as any,
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Set background to primary" }),
    );
    expect(onNodeBackgroundChange).toHaveBeenCalledWith("primary");
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

describe("CanvasContextMenu entity card view", () => {
  it("reports the chosen card view for an entity node", async () => {
    const onEntityCardViewChange = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        entityCardView: "auto",
        onEntityCardViewChange,
        onClose: vi.fn(),
      } as any,
    });

    expect(screen.getByText("Card view")).toBeTruthy();
    const faction = screen.getByRole("menuitemradio", { name: "Faction" });
    expect(faction.getAttribute("aria-checked")).toBe("false");

    await fireEvent.click(faction);
    expect(onEntityCardViewChange).toHaveBeenCalledWith("faction");
  });

  it("marks the active card view as checked", () => {
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        entityCardView: "character",
        onEntityCardViewChange: vi.fn(),
        onClose: vi.fn(),
      } as any,
    });

    expect(
      screen
        .getByRole("menuitemradio", { name: "Character" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("renders and selects the Image only card view option", async () => {
    const onEntityCardViewChange = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        entityCardView: "auto",
        onEntityCardViewChange,
        onClose: vi.fn(),
      } as any,
    });

    const imageOnly = screen.getByRole("menuitemradio", { name: "Image only" });
    expect(imageOnly.getAttribute("aria-checked")).toBe("false");

    await fireEvent.click(imageOnly);
    expect(onEntityCardViewChange).toHaveBeenCalledWith("image_only");
  });

  it("does not show card view controls when unavailable", () => {
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

    expect(screen.queryByText("Card view")).toBeNull();
  });
});

describe("CanvasContextMenu large card", () => {
  it("toggles the large card version for an entity node", async () => {
    const onLargeCardChange = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        entityCardView: "auto",
        onEntityCardViewChange: vi.fn(),
        largeCard: false,
        onLargeCardChange,
        onClose: vi.fn(),
      } as any,
    });

    await fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Large card" }),
    );
    expect(onLargeCardChange).toHaveBeenCalledWith(true);
  });

  it("marks large card as checked when active", () => {
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        entityCardView: "auto",
        onEntityCardViewChange: vi.fn(),
        largeCard: true,
        onLargeCardChange: vi.fn(),
        onClose: vi.fn(),
      } as any,
    });

    expect(
      screen
        .getByRole("menuitemcheckbox", { name: "Large card" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("does not show the large card toggle when unavailable", () => {
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        entityCardView: "auto",
        onEntityCardViewChange: vi.fn(),
        onClose: vi.fn(),
      } as any,
    });

    expect(
      screen.queryByRole("menuitemcheckbox", { name: "Large card" }),
    ).toBeNull();
  });
});

describe("CanvasContextMenu image only view toggle", () => {
  it("toggles image only view from the Card view options", async () => {
    const onEntityCardViewChange = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        entityCardView: "auto",
        onEntityCardViewChange,
        onClose: vi.fn(),
      } as any,
    });

    const option = screen.getByRole("menuitemradio", {
      name: "Image only",
    });
    expect(option.getAttribute("aria-checked")).toBe("false");

    await fireEvent.click(option);
    expect(onEntityCardViewChange).toHaveBeenCalledWith("image_only");
  });

  it("toggles off image only view when clicking it while already active", async () => {
    const onEntityCardViewChange = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "node-1",
        targetType: "node",
        onDelete: vi.fn(),
        entityCardView: "image_only",
        onEntityCardViewChange,
        onClose: vi.fn(),
      } as any,
    });

    const option = screen.getByRole("menuitemradio", {
      name: "Image only",
    });
    expect(option.getAttribute("aria-checked")).toBe("true");

    await fireEvent.click(option);
    expect(onEntityCardViewChange).toHaveBeenCalledWith("auto");
  });

  it("renders 'Switch All to Image Only' on pane and calls onToggleAllImageOnly", async () => {
    const onToggleAllImageOnly = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "pane",
        targetType: "pane",
        onDelete: vi.fn(),
        isAllImageOnly: false,
        onToggleAllImageOnly,
        onClose: vi.fn(),
      } as any,
    });

    const button = screen.getByRole("menuitem", {
      name: "Switch All to Image Only",
    });
    await fireEvent.click(button);
    expect(onToggleAllImageOnly).toHaveBeenCalledOnce();
  });

  it("renders 'Switch All to Card Details' on pane when all are image only", () => {
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "pane",
        targetType: "pane",
        onDelete: vi.fn(),
        isAllImageOnly: true,
        onToggleAllImageOnly: vi.fn(),
        onClose: vi.fn(),
      } as any,
    });

    expect(
      screen.getByRole("menuitem", {
        name: "Switch All to Card Details",
      }),
    ).toBeTruthy();
  });

  it("renders 'Show Labels on Image Cards' on pane and calls onToggleShowImageLabels", async () => {
    const onToggleShowImageLabels = vi.fn();
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "pane",
        targetType: "pane",
        onDelete: vi.fn(),
        showImageLabels: false,
        onToggleShowImageLabels,
        onClose: vi.fn(),
      } as any,
    });

    const button = screen.getByRole("menuitem", {
      name: "Show Labels on Image Cards",
    });
    await fireEvent.click(button);
    expect(onToggleShowImageLabels).toHaveBeenCalledOnce();
  });

  it("renders 'Hide Labels on Image Cards' on pane when showImageLabels is true", () => {
    render(CanvasContextMenu, {
      props: {
        x: 10,
        y: 10,
        targetId: "pane",
        targetType: "pane",
        onDelete: vi.fn(),
        showImageLabels: true,
        onToggleShowImageLabels: vi.fn(),
        onClose: vi.fn(),
      } as any,
    });

    expect(
      screen.getByRole("menuitem", {
        name: "Hide Labels on Image Cards",
      }),
    ).toBeTruthy();
  });
});
