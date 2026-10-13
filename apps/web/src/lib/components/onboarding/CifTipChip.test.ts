/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CifTipChip from "./CifTipChip.svelte";

function setup() {
  const props = {
    label: "Drop a pin on a map",
    onAct: vi.fn(),
    onDismiss: vi.fn(),
  };
  render(CifTipChip, { props });
  return props;
}

describe("CifTipChip (spec 176, US2 and US3)", () => {
  it("shows the label with a screen-reader prefix and no dialog role", () => {
    setup();
    expect(screen.getByText("Drop a pin on a map")).toBeTruthy();
    expect(
      screen.getByText("Cif has a tip:", { selector: ".sr-only" }),
    ).toBeTruthy();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
  });

  it("announces the tip once, politely, without taking focus", () => {
    setup();
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain("Cif has a tip: Drop a pin on a map");
    expect(document.activeElement).toBe(document.body);
  });

  it("asks Cif only when the label is tapped", () => {
    const props = setup();
    expect(props.onAct).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("cif-tip-act"));
    expect(props.onAct).toHaveBeenCalledTimes(1);
  });

  it("dismisses from its own button with an accessible name", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss tip" }));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
    expect(props.onAct).not.toHaveBeenCalled();
  });

  it("dismisses on Escape while focus is inside the chip", async () => {
    const props = setup();
    screen.getByTestId("cif-tip-act").focus();
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape when focus is elsewhere (negative case)", async () => {
    const props = setup();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onDismiss).not.toHaveBeenCalled();
    outside.remove();
  });

  it("keeps tap targets at least 44px", () => {
    setup();
    const act = screen.getByTestId("cif-tip-act");
    expect(act.className).toContain("min-h-11");
    expect(
      screen.getByRole("button", { name: "Dismiss tip" }).className,
    ).toContain("min-w-11");
  });
});
