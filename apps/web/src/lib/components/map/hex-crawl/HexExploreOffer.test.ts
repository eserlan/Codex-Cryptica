/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HexExploreOffer from "./HexExploreOffer.svelte";

describe("HexExploreOffer", () => {
  it("offers to explore and runs the action only when asked", async () => {
    const onExplore = vi.fn();
    const onDismiss = vi.fn();
    render(HexExploreOffer, { onExplore, onDismiss });

    expect(
      screen.getByRole("region", { name: "Explore this hex" }),
    ).toBeTruthy();
    expect(onExplore).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole("button", { name: "Explore" }));
    expect(onExplore).toHaveBeenCalledTimes(1);
    expect(onExplore).toHaveBeenCalledWith(
      screen.getByRole("button", { name: "Explore" }),
    );
  });

  it("goes away on Not now without exploring", async () => {
    const onExplore = vi.fn();
    const onDismiss = vi.fn();
    render(HexExploreOffer, { onExplore, onDismiss });

    await fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onExplore).not.toHaveBeenCalled();
  });
});
