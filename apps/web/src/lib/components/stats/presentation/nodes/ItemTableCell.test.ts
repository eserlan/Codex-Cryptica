import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import type { PresentationRenderContext } from "../types";
import ItemTableCell from "./ItemTableCell.svelte";

const context = { mode: "view", readOnly: false } as PresentationRenderContext;
function cell(
  type: "text" | "number" | "counter" | "money" | "checkbox",
  value: any,
  readOnly = false,
) {
  const onChange = vi.fn();
  const table = document.createElement("table");
  const target = table.insertRow();
  document.body.append(table);
  render(ItemTableCell, {
    target,
    props: {
      row: { name: "Sword", value },
      col: { id: "value", label: "Value", type },
      rIdx: 0,
      context: { ...context, readOnly },
      onChange,
      onRoll: vi.fn(),
    },
  });
  return onChange;
}

describe("ItemTableCell", () => {
  it.each(["text", "number"] as const)(
    "emits edited %s values",
    async (type) => {
      const onChange = cell(type, 2);
      await fireEvent.input(screen.getByLabelText("Value for item 1"), {
        target: { value: "7" },
      });
      expect(onChange).toHaveBeenCalledWith(type === "number" ? 7 : "7");
    },
  );

  it.each(["text", "number"] as const)(
    "uses the shared read-only %s fallback without an editor",
    (type) => {
      cell(type, undefined, true);
      expect(screen.getByText("—")).toBeTruthy();
      expect(screen.queryByLabelText("Value for item 1")).toBeNull();
    },
  );

  it("renders linked numeric zero without offering a local override", () => {
    render(ItemTableCell, {
      props: {
        row: { value: 9 },
        col: { id: "value", label: "Value", type: "number" },
        rIdx: 0,
        context,
        linked: {
          title: "Sword",
          statSheet: { fields: [{ id: "value", value: 0 }] },
        } as Entity,
        onChange: vi.fn(),
        onRoll: vi.fn(),
      },
    });
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("adjusts counters without exceeding their maximum", async () => {
    const onChange = cell("counter", { value: 4, max: 4 });
    await fireEvent.click(
      screen.getByRole("button", { name: "Increase Value for Sword" }),
    );
    expect(onChange).toHaveBeenCalledWith({ value: 4, max: 4 });
    await fireEvent.click(
      screen.getByRole("button", { name: "Decrease Value for Sword" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({ value: 3, max: 4 });
  });

  it("accepts decimal money, ignores invalid money and clears empty amounts", async () => {
    const onChange = cell("money", {
      units: 100,
      precision: 2,
      currency: "gp",
    });
    const input = screen.getByLabelText("Value amount for item 1");
    await fireEvent.change(input, { target: { value: "2.25" } });
    expect(onChange).toHaveBeenCalledWith({
      units: 225,
      precision: 2,
      currency: "gp",
    });
    onChange.mockClear();
    await fireEvent.change(input, { target: { value: "bad" } });
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("emits checkbox changes", async () => {
    const onChange = cell("checkbox", false);
    await fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("disables read-only checkboxes", () => {
    cell("checkbox", true, true);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
