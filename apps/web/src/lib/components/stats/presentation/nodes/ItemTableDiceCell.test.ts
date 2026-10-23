import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { PresentationRenderContext } from "../types";
import ItemTableDiceCell from "./ItemTableDiceCell.svelte";

function props() {
  return {
    row: { name: "Sword", damage: "2d6" },
    col: {
      id: "damage",
      label: "Damage",
      type: "dice" as const,
      formula: "1d6",
    },
    rIdx: 0,
    context: { mode: "view", readOnly: false } as PresentationRenderContext,
    onChange: vi.fn(),
    onRoll: vi.fn(),
  };
}

describe("ItemTableDiceCell", () => {
  it("rolls the row formula and clears it to follow the column default", async () => {
    const p = props();
    render(ItemTableDiceCell, { props: p });
    await fireEvent.click(
      screen.getByRole("button", { name: "Roll 2d6 for Sword" }),
    );
    expect(p.onRoll).toHaveBeenCalledWith("2d6");
    await fireEvent.change(screen.getByLabelText("Damage formula for Sword"), {
      target: { value: "  " },
    });
    expect(p.onChange).toHaveBeenCalledWith("");
  });

  it("shows roll errors and disables rolling while pending", async () => {
    const p = props();
    const { rerender } = render(ItemTableDiceCell, {
      props: { ...p, rollState: { rolling: true } },
    });
    expect(screen.getByRole("button")).toBeDisabled();
    await rerender({
      ...p,
      rollState: { rolling: false, isError: true, text: "Error" },
    });
    expect(screen.getByText("(Error)")).toHaveClass("text-red-400");
  });

  it("offers rolls but hides the formula editor in read-only view", () => {
    const p = props();
    p.context.readOnly = true;
    render(ItemTableDiceCell, { props: p });
    expect(
      screen.getByRole("button", { name: "Roll 2d6 for Sword" }),
    ).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("renders a formula without a roll button in read-only preview", () => {
    const p = props();
    p.context = { ...p.context, mode: "preview", readOnly: true };
    render(ItemTableDiceCell, { props: p });
    expect(screen.getByText("2d6")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("uses the column default for an empty row formula in editable preview", async () => {
    const p = props();
    p.context.mode = "preview";
    p.row.damage = "";
    render(ItemTableDiceCell, { props: p });
    const input = screen.getByLabelText("Damage formula for item 1");
    expect(input).toHaveValue("1d6");
    await fireEvent.input(input, { target: { value: "3d6" } });
    expect(p.onChange).toHaveBeenCalledWith("3d6");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
