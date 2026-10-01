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

  it("is styled as a standard Activity Bar item", () => {
    render(HelpAskButton, { open: false, onToggle: vi.fn() });
    const classes = screen.getByTestId("help-assistant-button").className;
    expect(classes).toContain("shrink-0");
    expect(classes).toContain("w-11");
    expect(classes).toContain("md:w-10");
    expect(classes).toContain("rounded-md");
    expect(classes).not.toContain("fixed");
  });

  it("renders active indicator bar when open", () => {
    const { rerender } = render(HelpAskButton, {
      open: false,
      onToggle: vi.fn(),
    });
    const button = screen.getByTestId("help-assistant-button");
    expect(button.querySelector(".bg-chrome-accent")).toBeNull();

    rerender({ open: true, onToggle: vi.fn() });
    expect(button.querySelector(".bg-chrome-accent")).not.toBeNull();
  });

  it("provides accessible title and label", () => {
    render(HelpAskButton, { open: false, onToggle: vi.fn() });
    const button = screen.getByTestId("help-assistant-button");
    expect(button.getAttribute("title")).toBe("Open help assistant");
    expect(button.getAttribute("aria-label")).toBe("Open help assistant");
  });
});
