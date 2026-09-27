/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MarkdownFormatToolbar from "./MarkdownFormatToolbar.svelte";

describe("MarkdownFormatToolbar", () => {
  it("calls back for each action", async () => {
    const onBold = vi.fn();
    const onItalic = vi.fn();
    const onBullet = vi.fn();
    render(MarkdownFormatToolbar, { onBold, onItalic, onBullet });

    await fireEvent.click(screen.getByTestId("markdown-format-bold"));
    await fireEvent.click(screen.getByTestId("markdown-format-italic"));
    await fireEvent.click(screen.getByTestId("markdown-format-bullet"));

    expect(onBold).toHaveBeenCalledTimes(1);
    expect(onItalic).toHaveBeenCalledTimes(1);
    expect(onBullet).toHaveBeenCalledTimes(1);
  });

  it("is a labelled, keyboard-reachable toolbar", () => {
    render(MarkdownFormatToolbar, {
      onBold: vi.fn(),
      onItalic: vi.fn(),
      onBullet: vi.fn(),
    });

    const toolbar = screen.getByRole("toolbar", { name: "Formatting" });
    expect(toolbar).toBeTruthy();
    for (const button of screen.getAllByRole("button")) {
      expect(button.getAttribute("type")).toBe("button");
      expect(button.hasAttribute("disabled")).toBe(false);
    }
  });

  it("does nothing when disabled", async () => {
    const onBold = vi.fn();
    render(MarkdownFormatToolbar, {
      onBold,
      onItalic: vi.fn(),
      onBullet: vi.fn(),
      disabled: true,
    });

    await fireEvent.click(screen.getByTestId("markdown-format-bold"));

    expect(onBold).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("markdown-format-bold").hasAttribute("disabled"),
    ).toBe(true);
  });
});
