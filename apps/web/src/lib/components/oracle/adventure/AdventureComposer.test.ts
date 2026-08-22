/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureComposer from "./AdventureComposer.svelte";

function manager(phase: "ready" | "generating") {
  return {
    phase,
    draft: "Cross the flooded causeway",
    readOnly: false,
    suggestedActions: [],
    errorMessage: null,
    submitAction: vi.fn(),
    submitSuggestedAction: vi.fn(),
    cancel: vi.fn(),
  } as any;
}

describe("AdventureComposer", () => {
  it("shows a Cancel affordance while generating, without removing the form", () => {
    render(AdventureComposer, { props: { manager: manager("generating") } });

    // The field stays mounted (just hidden) so a focused element is never
    // yanked out from under the user — see the comment in the component for
    // why: removing it mid-interaction silently exits native fullscreen.
    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("cancels the pending request", async () => {
    const m = manager("generating");
    render(AdventureComposer, { props: { manager: m } });

    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(m.cancel).toHaveBeenCalledOnce();
  });

  it("shows the action form when the player can act", () => {
    render(AdventureComposer, { props: { manager: manager("ready") } });

    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit action" })).toBeTruthy();
  });

  it("submits the drafted action", async () => {
    const m = manager("ready");
    render(AdventureComposer, { props: { manager: m } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Submit action" }),
    );

    expect(m.submitAction).toHaveBeenCalledWith("Cross the flooded causeway");
  });

  it("renders suggested actions and submits the chosen one", async () => {
    const m = manager("ready");
    m.suggestedActions = ["Search the wreckage"];
    render(AdventureComposer, { props: { manager: m } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Search the wreckage" }),
    );

    expect(m.submitSuggestedAction).toHaveBeenCalledWith("Search the wreckage");
  });

  it("keeps a just-clicked suggested action in the DOM (disabled) once generating starts", async () => {
    const m = manager("ready");
    m.suggestedActions = ["Search the wreckage"];
    const { rerender } = render(AdventureComposer, { props: { manager: m } });

    const button = screen.getByRole("button", { name: "Search the wreckage" });
    button.focus();
    expect(document.activeElement).toBe(button);

    // Simulate the phase flipping to "generating" right after the click, as
    // the real manager does once submitSuggestedAction resolves — the real
    // manager's suggestedActions getter still reflects the prior turn until
    // the new one commits, so it stays populated during generating too.
    const generating = manager("generating");
    generating.suggestedActions = ["Search the wreckage"];
    await rerender({ manager: generating });

    // The button must still exist in the DOM (merely disabled elsewhere),
    // not be torn out — see the component comment for why that matters.
    expect(document.body.contains(button)).toBe(true);
  });
});
