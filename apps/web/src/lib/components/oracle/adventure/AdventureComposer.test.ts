/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureComposer from "./AdventureComposer.svelte";

function manager(
  phase: "ready" | "generating" | "awaiting-roll" | "ready-to-resolve",
) {
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
  it("keeps free action visible below a collapsible suggestion menu", () => {
    const m = manager("ready");
    m.suggestedActions = [
      "Steady the shutter as Sela lifts it.",
      "Ask Sela something before helping.",
      "Decline or turn your attention elsewhere.",
    ];
    render(AdventureComposer, { props: { manager: m } });

    const suggestions = screen.getByTestId("adventure-suggested-actions");
    expect(suggestions.tagName).toBe("DETAILS");
    expect(suggestions.querySelector("summary")?.textContent).toContain("Suggested actions (3)");
    expect(suggestions.querySelectorAll("button")).toHaveLength(3);
    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit action" })).toBeTruthy();
    expect(screen.getByTestId("adventure-action-dock")).toBeTruthy();
  });

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

    const details = screen.getByTestId("adventure-suggested-actions") as HTMLDetailsElement;
    details.open = true;
    await fireEvent.click(
      screen.getByRole("button", { name: "Search the wreckage" }),
    );

    expect(m.submitSuggestedAction).toHaveBeenCalledWith("Search the wreckage");
  });

  it("shows a control retry without allowing read-only actions", async () => {
    const m = manager("ready");
    m.readOnly = true;
    m.session = { status: "active" };
    m.suggestedActions = ["Steady the shutter"];
    m.tryTakeControl = vi.fn().mockResolvedValue(true);
    render(AdventureComposer, { props: { manager: m } });

    expect(screen.getByText(/Another tab may be controlling this adventure/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit action" }).hasAttribute("disabled")).toBe(true);
    const suggested = screen.getByTestId("adventure-suggested-actions");
    expect((suggested.querySelector("button") as HTMLButtonElement).disabled).toBe(true);

    await fireEvent.click(screen.getByRole("button", { name: "Try to take control" }));
    expect(m.tryTakeControl).toHaveBeenCalledOnce();
    expect(m.submitSuggestedAction).not.toHaveBeenCalled();
  });

  it.each(["awaiting-roll", "ready-to-resolve"] as const)(
    "hides competing action controls while a roll is %s",
    (phase) => {
      const m = manager(phase);
      m.suggestedActions = ["Hold the sea wall"];
      render(AdventureComposer, { props: { manager: m } });

      expect(screen.getByTestId("adventure-suggested-actions").className).toBe(
        "hidden",
      );
      expect(screen.getByTestId("adventure-free-action").className).toBe(
        "hidden",
      );
    },
  );

  it("keeps a just-clicked suggested action in the DOM (disabled) once generating starts", async () => {
    const m = manager("ready");
    m.suggestedActions = ["Search the wreckage"];
    const { rerender } = render(AdventureComposer, { props: { manager: m } });

    const details = screen.getByTestId("adventure-suggested-actions") as HTMLDetailsElement;
    details.open = true;
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
