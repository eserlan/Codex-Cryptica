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
