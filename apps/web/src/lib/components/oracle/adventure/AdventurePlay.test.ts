/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventurePlay from "./AdventurePlay.svelte";

function manager(phase: "ready" | "generating") {
  return {
    session: { title: "The Drowned March" },
    phase,
    draft: "Cross the flooded causeway",
    readOnly: false,
    lastRollResult: null,
    transcript: null,
    suggestedActions: [],
    errorMessage: null,
    submitAction: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
  } as any;
}

describe("AdventurePlay", () => {
  it("replaces the action composer with a pending Oracle status", () => {
    render(AdventurePlay, { props: { manager: manager("generating") } });

    expect(screen.getByRole("status").textContent).toContain(
      "Oracle is responding to your action…",
    );
    expect(screen.queryByLabelText("What do you do?")).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("does not show a pending status when the player can act", () => {
    render(AdventurePlay, { props: { manager: manager("ready") } });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("offers Focus Mode from the normal adventure header", async () => {
    const onEnterFocus = vi.fn();
    render(AdventurePlay, {
      props: { manager: manager("ready"), onEnterFocus },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Enter Focus Mode" }),
    );

    expect(onEnterFocus).toHaveBeenCalledOnce();
  });
});
