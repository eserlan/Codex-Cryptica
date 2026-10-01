/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HelpAskButton from "./HelpAskButton.svelte";

describe("HelpAskButton", () => {
  it("toggles the panel and reports its state to assistive technology", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(HelpAskButton, { open: false, onToggle });
    const button = screen.getByRole("button", { name: "Open help assistant" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    await fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    await rerender({ open: true, onToggle });
    expect(
      screen
        .getByRole("button", { name: "Close help assistant" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("stays out of the bottom-right corner used by the create (+) buttons", () => {
    render(HelpAskButton, { open: false, onToggle: vi.fn() });
    const classes = screen.getByTestId("help-assistant-button").className;
    expect(classes).not.toMatch(/(^|\s)(md:)?right-/);
    expect(classes).toMatch(/\bleft-3\b/);
    // Clears the 3.5rem activity rail on wide screens.
    expect(classes).toMatch(/md:left-\[4\.5rem\]/);
  });

  it("stays below the front-page stacking context that contains its call to action", () => {
    render(HelpAskButton, { open: false, onToggle: vi.fn() });
    const match = screen
      .getByTestId("help-assistant-button")
      .className.match(/z-\[(\d+)\]/);
    expect(Number(match?.[1])).toBeLessThan(40);
  });

  it("clears the mobile ActivityBar safe area", () => {
    render(HelpAskButton, { open: false, onToggle: vi.fn() });
    expect(screen.getByTestId("help-assistant-button").className).toContain(
      "bottom-[calc(4rem_+_env(safe-area-inset-bottom,0px))]",
    );
  });
});
