/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SpatialImageControls from "./SpatialImageControls.svelte";

describe("SpatialImageControls", () => {
  it("uses common actions and reflects a locked image", async () => {
    const onToggleLock = vi.fn();
    const onBringToFront = vi.fn();
    const onSendToBack = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    render(SpatialImageControls, {
      props: {
        locked: true,
        onToggleLock,
        onBringToFront,
        onSendToBack,
        onDuplicate,
        onDelete,
      },
    });

    await fireEvent.click(screen.getByRole("menuitem", { name: "Unlock" }));
    await fireEvent.click(
      screen.getByRole("menuitem", { name: "Bring to Front" }),
    );
    await fireEvent.click(
      screen.getByRole("menuitem", { name: "Send to Back" }),
    );
    await fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    await fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onToggleLock).toHaveBeenCalledOnce();
    expect(onBringToFront).toHaveBeenCalledOnce();
    expect(onSendToBack).toHaveBeenCalledOnce();
    expect(onDuplicate).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
