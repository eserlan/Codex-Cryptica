/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HexGoTo from "./HexGoTo.svelte";

const LABELS = {
  style: "alphanumeric",
  startCol: "A",
  startRow: 1,
  rowPadding: 2,
} as const;

function setup() {
  const onGo = vi.fn();
  render(HexGoTo, { labelConfig: LABELS, orientation: "pointy", onGo });
  const input = screen.getByLabelText("Go to hex") as HTMLInputElement;
  const go = screen.getByRole("button", { name: "Go" });
  return { onGo, input, go };
}

describe("HexGoTo", () => {
  it("centres on a valid label, ignoring case and spaces", async () => {
    const { onGo, input, go } = setup();

    await fireEvent.input(input, { target: { value: "  d04 " } });
    await fireEvent.click(go);

    expect(onGo).toHaveBeenCalledWith({ q: 2, r: 3 });
    expect(screen.queryByRole("status")?.textContent ?? "").toBe("");
  });

  it("says so and opens nothing for an unknown label", async () => {
    const { onGo, input, go } = setup();

    await fireEvent.input(input, { target: { value: "??" } });
    await fireEvent.click(go);

    expect(onGo).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "There is no hex ?? on this map.",
    );
  });

  it("does nothing for empty input", async () => {
    const { onGo, input, go } = setup();

    await fireEvent.input(input, { target: { value: "   " } });
    await fireEvent.click(go);

    expect(onGo).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")?.textContent ?? "").toBe("");
  });
});
