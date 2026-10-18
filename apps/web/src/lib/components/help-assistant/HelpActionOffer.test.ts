/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { GuidanceAction } from "help-engine";
import HelpActionOffer from "./HelpActionOffer.svelte";

const guide: GuidanceAction = {
  type: "openPanel",
  panel: "status-tab",
  label: "Open the Status tab",
  then: {
    type: "highlight",
    target: "add-connection-button",
    label: "Add a connection",
  },
};

describe("HelpActionOffer", () => {
  it("describes the whole guide and says it will not change the vault", () => {
    render(HelpActionOffer, {
      action: guide,
      onAccept: vi.fn(),
      onDismiss: vi.fn(),
    });
    expect(
      screen.getByText(/Open the Status tab, then Add a connection/),
    ).toBeTruthy();
    expect(
      screen.getByText(/won't change anything in your vault/),
    ).toBeTruthy();
  });

  it("runs nothing until Show me is pressed", async () => {
    const onAccept = vi.fn();
    render(HelpActionOffer, { action: guide, onAccept, onDismiss: vi.fn() });
    expect(onAccept).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole("button", { name: "Show me" }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("can be dismissed without running anything", async () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();
    render(HelpActionOffer, { action: guide, onAccept, onDismiss });
    await fireEvent.click(screen.getByRole("button", { name: "No thanks" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("uses real buttons, so keyboard and assistive tech can operate it", () => {
    render(HelpActionOffer, {
      action: guide,
      onAccept: vi.fn(),
      onDismiss: vi.fn(),
    });
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    for (const button of buttons)
      expect(button.getAttribute("type")).toBe("button");
  });
});
