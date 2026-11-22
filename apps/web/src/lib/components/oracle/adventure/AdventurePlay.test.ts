/** @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventurePlay from "./AdventurePlay.svelte";

function manager(
  phase: "ready" | "generating",
  overrides: Record<string, unknown> = {},
) {
  const state: any = {
    session: {
      title: "The Drowned March",
      turns: [
        {
          id: "turn-1",
          sequence: 0,
          inputId: "in-1",
          playerAction: "",
          narration: "You stand before the flooded causeway.",
          committedAt: "2026-11-20T12:00:00.000Z",
        },
      ],
      pendingRoll: null,
      oocExchanges: [],
    },
    phase,
    composerMode: "play",
    draft: "Cross the flooded causeway",
    oocDraft: "",
    oocGenerating: false,
    oocErrorMessage: null,
    readOnly: false,
    lastRollResult: null,
    transcript: {
      sessionId: "adv-1",
      title: "The Drowned March",
      turns: [
        {
          sequence: 0,
          playerAction: "",
          narration: "You stand before the flooded causeway.",
          committedAt: "2026-11-20T12:00:00.000Z",
        },
      ],
    },
    oocExchanges: [],
    rollHistory: [],
    suggestedActions: [],
    errorMessage: null,
    submitAction: vi.fn(),
    submitOocQuestion: vi.fn(),
    retryOocQuestion: vi.fn(),
    setComposerMode: vi.fn((mode: "play" | "ooc") => {
      state.composerMode = mode;
    }),
    end: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
  };
  return state;
}

describe("AdventurePlay", () => {
  it("shows a pending Oracle status without removing the composer field", () => {
    render(AdventurePlay, { props: { manager: manager("generating") } });

    expect(
      screen.getByTestId("adventure-generating-status").textContent,
    ).toContain("The Oracle traces the threads of consequence…");
    const composer = within(screen.getByTestId("adventure-action-dock"));
    expect(composer.getByRole("status").textContent).toContain(
      "Oracle is responding…",
    );
    expect(composer.getByRole("status").textContent).toContain(
      "Playing: Cross the flooded causeway",
    );
    // The field stays mounted (just hidden) rather than being torn out —
    // removing a focused element from the DOM mid-interaction silently
    // exits native fullscreen in Chrome.
    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("does not show a pending status when the player can act", () => {
    render(AdventurePlay, { props: { manager: manager("ready") } });

    expect(screen.queryByTestId("adventure-generating-status")).toBeNull();
  });

  it("switches between Play and Ask GM while preserving each mode's unsent draft text", async () => {
    const mgr = manager("ready", {
      draft: "Inspect the causeway pilings",
      oocDraft: "How much for each survivor?",
    });
    const { rerender } = render(AdventurePlay, { props: { manager: mgr } });

    const playBtn = screen.getByTestId("adventure-mode-play");
    const oocBtn = screen.getByTestId("adventure-mode-ooc");
    expect(playBtn.getAttribute("aria-pressed")).toBe("true");
    expect(oocBtn.getAttribute("aria-pressed")).toBe("false");

    const playField = screen.getByLabelText(
      "What do you do?",
    ) as HTMLTextAreaElement;
    expect(playField.value).toBe("Inspect the causeway pilings");

    await fireEvent.click(oocBtn);
    await rerender({ manager: { ...mgr, composerMode: "ooc" } });

    expect(mgr.setComposerMode).toHaveBeenCalledWith("ooc");
    expect(screen.getByTestId("adventure-ooc-mode-hint").textContent).toContain(
      "No game time elapsed · No story changes",
    );
    const oocField = screen.getByLabelText(
      "Ask the GM a question (out of character)…",
    ) as HTMLTextAreaElement;
    expect(oocField.value).toBe("How much for each survivor?");
    expect(mgr.draft).toBe("Inspect the causeway pilings");

    // Submit OOC question via the Ask GM submit button
    const askButton = screen.getByRole("button", {
      name: "Submit question to GM",
    });
    await fireEvent.click(askButton);
    expect(mgr.submitOocQuestion).toHaveBeenCalledWith(
      "How much for each survivor?",
    );
    expect(mgr.submitAction).not.toHaveBeenCalled();

    // One-click return to Play mode preserves the Play draft
    await fireEvent.click(screen.getByTestId("adventure-mode-play"));
    await rerender({ manager: { ...mgr, composerMode: "play" } });
    expect(
      (screen.getByLabelText("What do you do?") as HTMLTextAreaElement).value,
    ).toBe("Inspect the causeway pilings");
  });

  it("renders Ask GM · Out of character exchanges inline with distinct badge and retry action on failure", async () => {
    const mgr = manager("ready", {
      oocExchanges: [
        {
          id: "ooc-1",
          kind: "ooc",
          question: "How much for each survivor?",
          answer: "The salvage contract pays 60kcr per survivor.",
          status: "answered",
          afterTurnCount: 1,
          createdAt: "2026-11-20T12:01:00.000Z",
          updatedAt: "2026-11-20T12:01:02.000Z",
        },
        {
          id: "ooc-2",
          kind: "ooc",
          question: "How do Body saves work?",
          status: "failed",
          errorMessage: "offline",
          afterTurnCount: 1,
          createdAt: "2026-11-20T12:02:00.000Z",
          updatedAt: "2026-11-20T12:02:01.000Z",
        },
        {
          id: "ooc-3",
          kind: "ooc",
          question: "Where did the patrol go?",
          status: "pending",
          afterTurnCount: 1,
          createdAt: "2026-11-20T12:03:00.000Z",
          updatedAt: "2026-11-20T12:03:01.000Z",
        },
      ],
    });
    render(AdventurePlay, { props: { manager: mgr } });

    const cards = screen.getAllByTestId("adventure-ooc-exchange");
    expect(cards).toHaveLength(3);
    expect(cards[0]?.textContent).toContain("Ask GM · Out of character");
    expect(cards[0]?.textContent).toContain(
      "No game time elapsed · No story changes",
    );
    expect(cards[0]?.textContent).toContain("How much for each survivor?");
    expect(cards[0]?.textContent).toContain(
      "The salvage contract pays 60kcr per survivor.",
    );

    const retryButtons = screen.getAllByTestId("adventure-ooc-retry");
    expect(retryButtons).toHaveLength(2);
    expect(cards[2]?.textContent).toContain(
      "This question was interrupted. Retry to continue.",
    );
    await fireEvent.click(retryButtons[0]!);
    await fireEvent.click(retryButtons[1]!);
    expect(mgr.retryOocQuestion).toHaveBeenNthCalledWith(1, "ooc-2");
    expect(mgr.retryOocQuestion).toHaveBeenNthCalledWith(2, "ooc-3");
    expect(mgr.submitAction).not.toHaveBeenCalled();
  });
});
