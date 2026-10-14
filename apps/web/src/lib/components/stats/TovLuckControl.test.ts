/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import TovLuckControl from "./TovLuckControl.svelte";

const luck = (value: number, max = 5): StatSheetField => ({
  id: "luck",
  label: "Luck Points",
  type: "counter",
  value,
  min: 0,
  max,
});

describe("TovLuckControl", () => {
  it("gains and spends one point per press", async () => {
    const onChange = vi.fn();
    render(TovLuckControl, { field: luck(2), onChange });
    await fireEvent.click(screen.getByLabelText("Gain 1 Luck Points"));
    expect(onChange).toHaveBeenLastCalledWith(3);
    await fireEvent.click(screen.getByLabelText("Spend 1 Luck Points"));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("disables spend at zero and gain at the cap", () => {
    const { unmount } = render(TovLuckControl, {
      field: luck(0),
      onChange: vi.fn(),
    });
    expect(screen.getByLabelText("Spend 1 Luck Points")).toHaveProperty(
      "disabled",
      true,
    );
    unmount();
    render(TovLuckControl, { field: luck(5), onChange: vi.fn() });
    expect(screen.getByLabelText("Gain 1 Luck Points")).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("makes no changes when read-only", () => {
    render(TovLuckControl, {
      field: luck(2),
      readOnly: true,
      onChange: vi.fn(),
    });
    expect(screen.getByLabelText("Gain 1 Luck Points")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByLabelText("Spend 1 Luck Points")).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("shows value, cap and the rules reference with its source", () => {
    render(TovLuckControl, { field: luck(3), onChange: vi.fn() });
    expect(screen.getByTestId("tov-luck-value").textContent).toMatch(
      /3\s*\/\s*5/,
    );
    expect(screen.getByText(/Source: BFRD/)).toBeTruthy();
  });
});

describe("TovLuckControl without a stored cap", () => {
  it("shows and enforces the BFRD default cap", () => {
    const field: StatSheetField = {
      id: "luck",
      label: "Luck Points",
      type: "counter",
      value: 5,
    };
    render(TovLuckControl, { field, onChange: vi.fn() });
    expect(screen.getByTestId("tov-luck-value").textContent).toMatch(
      /5\s*\/\s*5/,
    );
    expect(screen.getByLabelText("Gain 1 Luck Points")).toHaveProperty(
      "disabled",
      true,
    );
  });
});
