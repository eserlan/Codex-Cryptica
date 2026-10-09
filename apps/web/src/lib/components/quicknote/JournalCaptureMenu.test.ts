/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import JournalCaptureMenu from "./JournalCaptureMenu.svelte";

/** Opens the menu the way a player does, through its summary. */
async function openMenu() {
  const details = screen.getByTestId(
    "journal-capture-menu",
  ) as HTMLDetailsElement;
  details.open = true;
  await fireEvent(details, new Event("toggle"));
}

describe("JournalCaptureMenu", () => {
  it("shows one plainly labelled switch per automatic kind, once opened", async () => {
    render(JournalCaptureMenu, { props: { onToggle: vi.fn() } as never });
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    await openMenu();
    const switches = screen.getAllByRole("checkbox", { hidden: true });
    expect(switches).toHaveLength(10);
    expect(screen.getByLabelText("Dice rolls")).toBeTruthy();
    expect(
      screen.getByLabelText("Oracle answers and random events"),
    ).toBeTruthy();
    expect(screen.getByLabelText("Generated results")).toBeTruthy();
  });

  it("shows the saved state: a switched-off kind is unticked, the rest are ticked", async () => {
    render(JournalCaptureMenu, {
      props: { captureOff: ["dice", "scenes"], onToggle: vi.fn() } as never,
    });
    await openMenu();
    expect(
      (screen.getByTestId("capture-dice") as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByTestId("capture-scenes") as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByTestId("capture-tables") as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("treats the older map-move flag as map moves off", async () => {
    render(JournalCaptureMenu, {
      props: { captureMapMoves: false, onToggle: vi.fn() } as never,
    });
    await openMenu();
    expect(
      (screen.getByTestId("capture-map-moves") as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("reports a switch change with the kind and its new state", async () => {
    const onToggle = vi.fn();
    render(JournalCaptureMenu, {
      props: { captureOff: ["dice"], onToggle } as never,
    });
    await openMenu();
    await fireEvent.click(screen.getByTestId("capture-dice"));
    expect(onToggle).toHaveBeenCalledWith("dice", true);
    await fireEvent.click(screen.getByTestId("capture-tables"));
    expect(onToggle).toHaveBeenCalledWith("tables", false);
  });

  it("gives every switch a native checkbox, so it works from the keyboard", async () => {
    render(JournalCaptureMenu, { props: { onToggle: vi.fn() } as never });
    await openMenu();
    const dice = screen.getByTestId("capture-dice") as HTMLInputElement;
    expect(dice.type).toBe("checkbox");
    expect(dice.tabIndex).toBeGreaterThanOrEqual(0);
  });
});
