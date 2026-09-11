/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureProvisionalFacts from "./AdventureProvisionalFacts.svelte";

const fact = {
  id: "barrow",
  kind: "place" as const,
  name: "Sunken Barrow",
  summary: "A barrow drowned by the marsh.",
  introducedOnTurnId: "turn-1",
  visibility: "player-visible" as const,
};

describe("AdventureProvisionalFacts", () => {
  async function showDiscoveries(): Promise<void> {
    await fireEvent.click(screen.getByRole("button", { name: "Show" }));
  }

  it("shows a typed player-visible suggestion and adds it on request", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(AdventureProvisionalFacts, {
      props: { facts: [fact], existingTitles: [], onAdd },
    });

    expect(screen.queryByText("Sunken Barrow")).toBeNull();
    await showDiscoveries();
    expect(screen.getByText("Place")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Add Sunken Barrow to Codex" }),
    );

    expect(onAdd).toHaveBeenCalledWith(fact);
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
  });

  it("hides GM-only facts and discards a visible suggestion", async () => {
    render(AdventureProvisionalFacts, {
      props: {
        facts: [
          fact,
          {
            ...fact,
            id: "secret",
            name: "Hidden Crown",
            visibility: "gm-only",
          },
        ],
        existingTitles: [],
        onAdd: vi.fn(),
      },
    });

    expect(screen.queryByText("Hidden Crown")).toBeNull();
    await showDiscoveries();
    await fireEvent.click(
      screen.getByRole("button", { name: "Discard Sunken Barrow suggestion" }),
    );
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
  });

  it("can hide discoveries after opening the section", async () => {
    render(AdventureProvisionalFacts, {
      props: { facts: [fact], existingTitles: [], onAdd: vi.fn() },
    });

    await showDiscoveries();
    expect(screen.getByText("Sunken Barrow")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Hide" }));

    expect(screen.queryByText("Sunken Barrow")).toBeNull();
  });

  it("does not show a suggestion that already exists in Codex", () => {
    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact],
        existingTitles: ["sunken barrow"],
        onAdd: vi.fn(),
      },
    });

    expect(screen.queryByText("Sunken Barrow")).toBeNull();
  });
});
