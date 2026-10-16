import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import HexExploreControls from "./HexExploreControls.svelte";

function setup(
  props: Partial<{
    draftPending: boolean;
    explored: boolean;
    generating: boolean;
  }> = {},
) {
  const handlers = { onReview: vi.fn(), onExplore: vi.fn(), onCancel: vi.fn() };
  render(HexExploreControls, {
    draftPending: false,
    explored: false,
    generating: false,
    ...props,
    ...handlers,
  });
  return handlers;
}

describe("HexExploreControls", () => {
  it("offers Explore for an unexplored hex and starts it on click", async () => {
    const handlers = setup();
    await fireEvent.click(screen.getByRole("button", { name: "Explore" }));
    expect(handlers.onExplore).toHaveBeenCalledTimes(1);
  });

  it("offers Review discovery when a draft is pending, not Explore", async () => {
    const handlers = setup({ draftPending: true });
    expect(screen.queryByRole("button", { name: "Explore" })).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: "Review discovery" }),
    );
    expect(handlers.onReview).toHaveBeenCalledTimes(1);
  });

  it("disables Explore while drafting and shows Cancel, which aborts (negative path)", async () => {
    const handlers = setup({ generating: true });
    expect(
      (screen.getByRole("button", { name: "Explore" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("Drafting");
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
  });

  it("hides Cancel when nothing is being drafted", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });
});
