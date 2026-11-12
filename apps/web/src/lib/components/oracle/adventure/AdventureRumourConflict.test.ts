/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureRumourConflict from "./AdventureRumourConflict.svelte";

describe("AdventureRumourConflict", () => {
  it("offers add, continue, cancel and explicit archive actions", async () => {
    const actions = {
      onAdd: vi.fn(),
      onContinue: vi.fn(),
      onCancel: vi.fn(),
      onArchive: vi.fn(),
    };
    render(AdventureRumourConflict, {
      props: {
        kind: "rumour",
        readOnly: false,
        pendingRoll: false,
        archiving: false,
        error: null,
        ...actions,
      },
    });
    for (const label of [
      "Add to current adventure",
      "Continue current adventure",
      "Cancel",
      "Archive and start rumour",
    ]) {
      await fireEvent.click(screen.getByRole("button", { name: label }));
    }
    expect(actions.onAdd).toHaveBeenCalledOnce();
    expect(actions.onContinue).toHaveBeenCalledOnce();
    expect(actions.onCancel).toHaveBeenCalledOnce();
    expect(actions.onArchive).toHaveBeenCalledOnce();
  });

  it("retains failed-save feedback and blocks add while read-only or a roll is pending", () => {
    render(AdventureRumourConflict, {
      props: {
        kind: "rumour",
        readOnly: false,
        pendingRoll: true,
        archiving: false,
        error: "The rumour was not added.",
        onAdd: vi.fn(),
        onContinue: vi.fn(),
        onCancel: vi.fn(),
        onArchive: vi.fn(),
      },
    });
    expect(
      screen
        .getByRole("button", { name: "Add to current adventure" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("not added");
  });

  it("uses prepared-adventure copy for an adventure handoff", () => {
    render(AdventureRumourConflict, {
      props: {
        kind: "adventure",
        readOnly: false,
        pendingRoll: false,
        archiving: false,
        error: null,
        onAdd: vi.fn(),
        onContinue: vi.fn(),
        onCancel: vi.fn(),
        onArchive: vi.fn(),
      },
    });
    expect(screen.getByText("A prepared adventure is ready")).toBeTruthy();
    expect(screen.getByText(/return to the prepared adventure/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Archive and start adventure" }),
    ).toBeTruthy();
    expect(screen.queryByText(/six rumours/)).toBeNull();
  });
});
