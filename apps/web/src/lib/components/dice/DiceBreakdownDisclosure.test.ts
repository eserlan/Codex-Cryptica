/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DiceBreakdownDisclosure from "./DiceBreakdownDisclosure.svelte";

const keepHighest = [
  {
    type: "dice" as const,
    sides: 6,
    rolls: [6, 5, 3],
    dropped: [1],
    value: 14,
  },
];

describe("DiceBreakdownDisclosure", () => {
  it("starts collapsed and reveals kept and dropped dice on demand", async () => {
    render(DiceBreakdownDisclosure, {
      parts: keepHighest,
      total: 14,
      formula: "4d6kh3",
    });

    const toggle = screen.getByTestId("dice-disclosure-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("dice-breakdown")).toBeNull();

    await fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getAllByTestId("dice-kept").map((el) => el.textContent),
    ).toEqual(["6", "5", "3"]);
    expect(
      screen.getAllByTestId("dice-dropped").map((el) => el.textContent),
    ).toEqual(["1"]);
    expect(screen.getByTestId("dice-breakdown-total").textContent).toBe("14");
    expect(screen.getByTestId("dice-breakdown-formula").textContent).toBe(
      "4d6kh3",
    );
  });

  it("shows modifiers in the expanded breakdown", async () => {
    render(DiceBreakdownDisclosure, {
      parts: [
        { type: "dice", sides: 6, rolls: [4, 2], value: 6 },
        { type: "modifier", value: 3 },
      ],
      total: 9,
      formula: "2d6+3",
    });
    await fireEvent.click(screen.getByTestId("dice-disclosure-toggle"));

    expect(screen.getByTestId("dice-modifier").textContent).toBe("+3");
  });

  it("renders nothing for a lone die or a legacy result with no parts", () => {
    const { unmount } = render(DiceBreakdownDisclosure, {
      parts: [{ type: "dice", sides: 20, rolls: [14], value: 14 }],
      total: 14,
    });
    expect(screen.queryByTestId("dice-disclosure")).toBeNull();
    unmount();

    render(DiceBreakdownDisclosure, { parts: undefined, total: 7 });
    expect(screen.queryByTestId("dice-disclosure")).toBeNull();
  });

  it("collapses again without changing the shown total", async () => {
    render(DiceBreakdownDisclosure, { parts: keepHighest, total: 14 });
    const toggle = screen.getByTestId("dice-disclosure-toggle");

    await fireEvent.click(toggle);
    await fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("dice-breakdown")).toBeNull();
  });
});
