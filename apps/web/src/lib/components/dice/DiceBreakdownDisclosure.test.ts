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
    expect(screen.getByText("Kept die 6")).not.toBeNull();
    expect(screen.getByText("Dropped die 1")).not.toBeNull();
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

    expect(screen.getByText("Modifier +3")).not.toBeNull();
  });

  it("shows signed subtotals for subtractive dice parts", async () => {
    render(DiceBreakdownDisclosure, {
      parts: [
        { type: "dice", sides: 20, rolls: [17], value: 17 },
        { type: "dice", sides: 4, rolls: [3], value: -3 },
      ],
      total: 14,
    });
    await fireEvent.click(screen.getByTestId("dice-disclosure-toggle"));

    expect(
      screen.getAllByTestId("dice-part-total").map((el) => el.textContent),
    ).toEqual(["Subtotal 17 = 17", "Subtotal -3 = -3"]);
  });

  it("keeps the large-pool disclosure available to assistive technology", async () => {
    render(DiceBreakdownDisclosure, {
      parts: [
        {
          type: "dice",
          sides: 6,
          rolls: Array.from({ length: 13 }, (_, index) => (index % 6) + 1),
          value: 45,
        },
      ],
      total: 45,
    });
    await fireEvent.click(screen.getByTestId("dice-disclosure-toggle"));

    const moreToggle = screen.getByRole("button", { name: "+1 more" });
    expect(moreToggle.getAttribute("aria-expanded")).toBe("false");
    await fireEvent.click(moreToggle);

    expect(screen.getAllByTestId("dice-kept")).toHaveLength(13);
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
