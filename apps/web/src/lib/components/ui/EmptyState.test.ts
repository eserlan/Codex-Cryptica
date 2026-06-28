/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import EmptyState from "./EmptyState.svelte";

vi.mock("$app/paths", () => ({ base: "" }));

describe("EmptyState", () => {
  it("renders headline", () => {
    render(EmptyState, { headline: "Your graph is empty" });
    expect(screen.getByText("Your graph is empty")).toBeTruthy();
  });

  it("renders primary CTA when provided", () => {
    render(EmptyState, {
      headline: "Your graph is empty",
      cta: "＋ Create your first entity",
      onCta: vi.fn(),
    });
    expect(
      screen.getByRole("button", { name: /create your first entity/i }),
    ).toBeTruthy();
  });

  it("does not render secondary CTA when not provided", () => {
    render(EmptyState, { headline: "Your graph is empty" });
    expect(screen.queryByTestId("empty-state-secondary-cta")).toBeNull();
  });

  it("secondary CTA renders when secondaryCta + onSecondaryCta are provided", () => {
    render(EmptyState, {
      headline: "Your graph is empty",
      secondaryCta: "Populate with a pack",
      onSecondaryCta: vi.fn(),
    });
    expect(screen.getByTestId("empty-state-secondary-cta")).toBeTruthy();
    expect(screen.getByText("Populate with a pack")).toBeTruthy();
  });

  it("secondary CTA is absent when vault has content (not rendered in parent)", async () => {
    // The visibility toggle is controlled by the parent (GraphView shows EmptyState
    // only when hasNoEntities); this test asserts the secondary CTA itself is hidden
    // when secondaryCta prop is not passed — simulating a vault that has content.
    render(EmptyState, {
      headline: "Your graph is empty",
      cta: "＋ Create your first entity",
      onCta: vi.fn(),
      // no secondaryCta prop
    });
    expect(screen.queryByTestId("empty-state-secondary-cta")).toBeNull();
  });

  it("activating secondary CTA fires the navigation intent (onSecondaryCta)", async () => {
    const onSecondaryCta = vi.fn();
    render(EmptyState, {
      headline: "Your graph is empty",
      secondaryCta: "Populate with a pack",
      onSecondaryCta,
    });
    await fireEvent.click(screen.getByTestId("empty-state-secondary-cta"));
    expect(onSecondaryCta).toHaveBeenCalledOnce();
  });
});
