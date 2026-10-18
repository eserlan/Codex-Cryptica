/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TipsOptIn from "./TipsOptIn.svelte";

function setup() {
  const props = { onYes: vi.fn(), onNo: vi.fn() };
  render(TipsOptIn, { props });
  return props;
}

describe("TipsOptIn (spec 176, FR-006)", () => {
  it("asks the one-time question with Yes, No and close", () => {
    setup();
    expect(screen.getByText("Want occasional tips from Cif?")).toBeTruthy();
    expect(screen.getByTestId("tips-opt-in-yes")).toBeTruthy();
    expect(screen.getByTestId("tips-opt-in-no")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("turns tips on only through Yes", () => {
    const props = setup();
    fireEvent.click(screen.getByTestId("tips-opt-in-yes"));
    expect(props.onYes).toHaveBeenCalledTimes(1);
    expect(props.onNo).not.toHaveBeenCalled();
  });

  it("answers No, and closing also answers No (negative paths)", () => {
    const props = setup();
    fireEvent.click(screen.getByTestId("tips-opt-in-no"));
    expect(props.onNo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("tips-opt-in-close"));
    expect(props.onNo).toHaveBeenCalledTimes(2);
    expect(props.onYes).not.toHaveBeenCalled();
  });

  it("makes no request of any kind (FR-017)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    setup();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not take focus from a text field being typed in; it announces instead", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    setup();
    expect(document.activeElement).toBe(input);
    expect(
      document.querySelector('[aria-live="polite"]')?.textContent,
    ).toContain("Want occasional tips from Cif?");
    input.remove();
  });

  it("Escape closes it when focus is inside or nowhere, and leaves other focus alone", async () => {
    const props = setup();
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onNo).toHaveBeenCalledTimes(1);

    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(props.onNo).toHaveBeenCalledTimes(1);
    outside.remove();
  });
});
