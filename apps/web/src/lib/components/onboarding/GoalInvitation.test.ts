/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import GoalInvitation from "./GoalInvitation.svelte";

function setup(aiAvailable = true) {
  const props = {
    aiAvailable,
    onChoose: vi.fn(),
    onDismiss: vi.fn(),
    onTour: vi.fn(),
    onClose: vi.fn(),
  };
  const result = render(GoalInvitation, props);
  return { ...props, ...result };
}

describe("GoalInvitation", () => {
  it("offers four choices in order, a close button and the Cif/Oracle line", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: "What would you like to do first?" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Cif shows you how Codex Cryptica works/),
    ).toBeTruthy();
    const dialog = screen.getByTestId("goal-invitation");
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("false");
    const labels = Array.from(dialog.querySelectorAll("button")).map((b) =>
      (b.getAttribute("aria-label") ?? b.textContent)?.trim(),
    );
    expect(labels).toEqual([
      "Close",
      "Build a world",
      "Write a story",
      "Prepare an RPG campaign",
      "Explore on my own",
    ]);
  });

  it("does not promise AI help when AI is off", () => {
    setup(false);
    expect(screen.queryByText(/Oracle/)).toBeNull();
    expect(screen.getByText(/works without AI/)).toBeTruthy();
  });

  it("chooses a goal", async () => {
    const t = setup();
    await fireEvent.click(screen.getByTestId("goal-invitation-story"));
    expect(t.onChoose).toHaveBeenCalledWith("story");
    expect(t.onDismiss).not.toHaveBeenCalled();
  });

  it("explore offers the tour without starting it", async () => {
    const t = setup();
    await fireEvent.click(screen.getByTestId("goal-invitation-explore"));
    expect(t.onChoose).toHaveBeenCalledWith("explore");
    expect(t.onTour).not.toHaveBeenCalled();
    expect(screen.getByText(/Help → Getting Started/)).toBeTruthy();
    await fireEvent.click(screen.getByTestId("goal-invitation-tour"));
    expect(t.onTour).toHaveBeenCalled();
  });

  it("No thanks after exploring closes without a tour", async () => {
    const t = setup();
    await fireEvent.click(screen.getByTestId("goal-invitation-explore"));
    await fireEvent.click(screen.getByTestId("goal-invitation-no-thanks"));
    expect(t.onClose).toHaveBeenCalled();
    expect(t.onTour).not.toHaveBeenCalled();
    expect(t.onDismiss).not.toHaveBeenCalled();
  });

  it("Close and Escape dismiss, and focus goes back", async () => {
    const before = document.createElement("button");
    document.body.appendChild(before);
    before.focus();
    const t = setup();
    // Focus moved into the invitation, so Escape belongs to it.
    expect(document.activeElement?.id).toBe("goal-invitation-heading");
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(t.onDismiss).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(before);
    t.unmount();

    const again = setup();
    await fireEvent.click(screen.getByTestId("goal-invitation-close"));
    expect(again.onDismiss).toHaveBeenCalledTimes(1);
    before.remove();
  });

  it("never takes focus from someone typing, and ignores their Escape", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const t = setup();
    expect(document.activeElement).toBe(input);
    expect(screen.getByText(/Choices are below/)).toBeTruthy();
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(t.onDismiss).not.toHaveBeenCalled();
    input.remove();
  });

  it("uses touch-sized buttons", () => {
    setup();
    for (const b of screen
      .getByTestId("goal-invitation")
      .querySelectorAll("button")) {
      expect(b.className).toContain("min-h-11");
      expect(b.className).toContain("min-w-11");
    }
  });
});
