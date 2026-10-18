/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { StatSheetField } from "schema";
import TovDoomControl from "./TovDoomControl.svelte";

const doom = (value: number, max = 10): StatSheetField => ({
  id: "doom",
  label: "Doom Points",
  type: "counter",
  value,
  min: 0,
  max,
});

describe("TovDoomControl", () => {
  it("gains and spends one point per press", async () => {
    const onChange = vi.fn();
    render(TovDoomControl, { field: doom(3), onChange });
    await fireEvent.click(screen.getByLabelText("Gain 1 Doom Points"));
    expect(onChange).toHaveBeenLastCalledWith(4);
    await fireEvent.click(screen.getByLabelText("Spend 1 Doom Points"));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("disables spend at zero and gain at the cap", () => {
    const { unmount } = render(TovDoomControl, {
      field: doom(0),
      onChange: vi.fn(),
    });
    expect(screen.getByLabelText("Spend 1 Doom Points")).toHaveProperty(
      "disabled",
      true,
    );
    unmount();
    render(TovDoomControl, { field: doom(10), onChange: vi.fn() });
    expect(screen.getByLabelText("Gain 1 Doom Points")).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("makes no changes when read-only", () => {
    render(TovDoomControl, {
      field: doom(3),
      readOnly: true,
      onChange: vi.fn(),
    });
    expect(screen.getByLabelText("Gain 1 Doom Points")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByLabelText("Spend 1 Doom Points")).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("shows value, cap, and the rules reference with per-creature allocation guidance", () => {
    render(TovDoomControl, { field: doom(4), onChange: vi.fn() });
    expect(screen.getByTestId("tov-doom-value").textContent).toMatch(
      /4\s*\/\s*10/,
    );
    expect(screen.getByText(/How Doom Points work/i)).toBeTruthy();
    expect(
      screen.getByText(
        /track points allocated to that creature from the encounter's Doom pool/i,
      ),
    ).toBeTruthy();
  });
});
