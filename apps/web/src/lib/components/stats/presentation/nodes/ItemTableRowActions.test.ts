import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ItemTableRowActions from "./ItemTableRowActions.svelte";

describe("ItemTableRowActions", () => {
  it("moves and removes a row using its linked label", async () => {
    const onMove = vi.fn(),
      onRemove = vi.fn();
    render(ItemTableRowActions, {
      props: {
        row: {},
        linkedTitle: "Sword",
        rIdx: 1,
        rowCount: 3,
        onMove,
        onRemove,
      },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Move Sword up" }),
    );
    expect(onMove).toHaveBeenLastCalledWith(-1);
    await fireEvent.click(
      screen.getByRole("button", { name: "Move Sword down" }),
    );
    expect(onMove).toHaveBeenLastCalledWith(1);
    // Preserve the original remove label, which uses the saved row name.
    await fireEvent.click(
      screen.getByRole("button", { name: "Remove item 2" }),
    );
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("disables both move directions for the only row", () => {
    const onMove = vi.fn();
    render(ItemTableRowActions, {
      props: {
        row: { name: "Rope" },
        rIdx: 0,
        rowCount: 1,
        onMove,
        onRemove: vi.fn(),
      },
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Move Rope up",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Move Rope down",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(onMove).not.toHaveBeenCalled();
  });
});
