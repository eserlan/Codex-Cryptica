/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureFocusPlay from "./AdventureFocusPlay.svelte";

function manager() {
  return {
    session: {
      id: "adventure-1",
      title: "The Drowned March",
      visibleState: {
        location: undefined,
        situation: undefined,
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        relationships: [],
      },
      pendingRoll: undefined,
      provisionalFacts: [],
      resourceCounters: [],
      dicePresets: [],
    },
    phase: "ready",
    draft: "Cross the flooded causeway",
    readOnly: false,
    lastRollResult: null,
    transcript: null,
    suggestedActions: [],
    errorMessage: null,
    recap: null,
    rollHistory: [],
    submitAction: vi.fn(),
    submitCorrection: vi.fn(),
    addDicePreset: vi.fn(),
    removeDicePreset: vi.fn(),
    addResourceCounter: vi.fn(),
    adjustResourceCounter: vi.fn(),
    removeResourceCounter: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
  } as any;
}

const repository = {
  list: vi.fn().mockResolvedValue({ entries: [] }),
} as any;

describe("AdventureFocusPlay", () => {
  it("keeps the ordinary adventure layout until the player enters Focus Mode", async () => {
    render(AdventureFocusPlay, {
      props: {
        manager: manager(),
        existingTitles: [],
        onAddProvisionalFact: vi.fn(),
        repository,
        vaultId: "vault-1",
        onResume: vi.fn(),
        onResumeArchived: vi.fn(),
      },
    });

    expect(screen.queryByTestId("adventure-focus-mode")).toBeNull();

    await fireEvent.click(
      screen.getByRole("button", { name: "Enter Focus Mode" }),
    );

    expect(screen.getByTestId("adventure-focus-mode")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Adventure tools" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("can collapse utility panels without hiding the active play column", async () => {
    render(AdventureFocusPlay, {
      props: {
        manager: manager(),
        existingTitles: [],
        onAddProvisionalFact: vi.fn(),
        repository,
        vaultId: "vault-1",
        onResume: vi.fn(),
        onResumeArchived: vi.fn(),
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Enter Focus Mode" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Adventure tools" }),
    );

    expect(
      screen
        .getByRole("button", { name: "Adventure tools" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
  });
});
