/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TokenHealthBarPopover from "./TokenHealthBarPopover.svelte";

describe("TokenHealthBarPopover", () => {
  it("renders the label and value/max", () => {
    render(TokenHealthBarPopover, {
      x: 100,
      y: 200,
      label: "Total Hit Points",
      value: 8,
      max: 20,
      onAdjust: vi.fn(),
      onClose: vi.fn(),
    });

    expect(screen.getByText("Total Hit Points")).toBeTruthy();
    expect(
      screen.getByTestId("token-health-bar-popover-value").textContent,
    ).toContain("8");
    expect(
      screen.getByTestId("token-health-bar-popover-value").textContent,
    ).toContain("20");
  });

  it("calls onAdjust with the correct direction", async () => {
    const onAdjust = vi.fn();
    render(TokenHealthBarPopover, {
      x: 0,
      y: 0,
      label: "HP",
      value: 8,
      max: 20,
      onAdjust,
      onClose: vi.fn(),
    });

    await fireEvent.click(screen.getByLabelText("Increase HP"));
    expect(onAdjust).toHaveBeenCalledWith(1);

    await fireEvent.click(screen.getByLabelText("Decrease HP"));
    expect(onAdjust).toHaveBeenCalledWith(-1);
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(TokenHealthBarPopover, {
      x: 0,
      y: 0,
      label: "HP",
      value: 8,
      max: 20,
      onAdjust: vi.fn(),
      onClose,
    });

    await fireEvent.click(screen.getByLabelText("Close health bar control"));
    expect(onClose).toHaveBeenCalled();
  });

  it("disables the +/- controls in read-only mode", () => {
    render(TokenHealthBarPopover, {
      x: 0,
      y: 0,
      label: "HP",
      value: 8,
      max: 20,
      readOnly: true,
      onAdjust: vi.fn(),
      onClose: vi.fn(),
    });

    expect(
      (screen.getByLabelText("Increase HP") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Decrease HP") as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
