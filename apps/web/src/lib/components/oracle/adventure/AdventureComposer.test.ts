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
  it("replaces the action form with a Cancel affordance while generating", () => {
    render(AdventureComposer, { props: { manager: manager("generating") } });

    expect(screen.queryByLabelText("What do you do?")).toBeNull();
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
});
