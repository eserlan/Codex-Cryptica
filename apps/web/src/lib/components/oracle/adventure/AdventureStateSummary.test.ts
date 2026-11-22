/** @vitest-environment jsdom */

import { createRawSnippet } from "svelte";
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AdventureStateSummary from "./AdventureStateSummary.svelte";

function manager(recap: any) {
  return {
    session: { title: "The Drowned March" },
    recap,
  } as any;
}

describe("AdventureStateSummary", () => {
  it("collapses situation details behind a single-line location strip", () => {
    render(AdventureStateSummary, {
      manager: manager({
        location: {
          id: "loc-1",
          text: "Tiny village in the high slopes of nombe",
        },
        situation: { id: "sit-1", text: "Sela is fixing a shutter." },
        elapsedTimeLabel: "45m",
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
    });
    const details = screen.getByTestId(
      "adventure-scene-details",
    ) as HTMLDetailsElement;
    const summary = details.querySelector("summary")!;
    const body = screen.getByTestId("adventure-scene-details-body");

    expect(details.open).toBe(false);
    expect(summary.className).toContain("flex");
    expect(summary.className).toContain("touch-target");
    expect(summary.getAttribute("aria-label")).toBe(
      "Scene details: Tiny village in the high slopes of nombe",
    );
    expect(summary.getAttribute("title")).toBe(
      "Tiny village in the high slopes of nombe",
    );
    expect(summary.textContent).toContain(
      "Tiny village in the high slopes of nombe",
    );
    expect(summary.textContent).not.toContain("Scene details");
    expect(summary.textContent).not.toContain("45m");
    expect(summary.querySelector(".truncate")).toBeTruthy();

    expect(
      within(body).getByTestId("adventure-scene-elapsed").textContent,
    ).toContain("45m");
    expect(within(body).getByText("Sela is fixing a shutter.")).toBeTruthy();
  });

  it("toggles disclosure on click and collapses on Escape with focus restoration", async () => {
    render(AdventureStateSummary, {
      manager: manager({
        location: { id: "loc-1", text: "The lantern road" },
        situation: { id: "sit-1", text: "The ward is failing" },
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
    });

    const details = screen.getByTestId(
      "adventure-scene-details",
    ) as HTMLDetailsElement;
    const summary = details.querySelector("summary")!;
    const body = screen.getByTestId("adventure-scene-details-body");

    // Escape while collapsed does nothing
    const collapsedEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    details.dispatchEvent(collapsedEvent);
    expect(collapsedEvent.defaultPrevented).toBe(false);
    expect(details.open).toBe(false);

    // Click opens details; Escape collapses it and restores focus to summary
    await fireEvent.click(summary);
    expect(details.open).toBe(true);

    const openEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    body.dispatchEvent(openEvent);
    expect(openEvent.defaultPrevented).toBe(true);
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it("falls back to 'Current situation' when location is missing or blank and shows empty body state", async () => {
    const { rerender } = render(AdventureStateSummary, {
      manager: manager({
        location: { id: "loc-1", text: "   " },
        situation: undefined,
        elapsedTimeLabel: "   ",
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
    });

    const details = screen.getByTestId("adventure-scene-details");
    const summary = details.querySelector("summary")!;
    expect(summary.textContent).toContain("Current situation");
    expect(summary.getAttribute("aria-label")).toBe(
      "Scene details: Current situation",
    );
    expect(summary.getAttribute("title")).toBe("Current situation");
    expect(screen.queryByTestId("adventure-scene-location")).toBeNull();
    expect(screen.queryByTestId("adventure-scene-elapsed")).toBeNull();
    expect(screen.getByTestId("adventure-scene-empty").textContent).toContain(
      "No additional scene details yet.",
    );

    await rerender({
      manager: manager({
        location: undefined,
        situation: undefined,
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
    });
    expect(summary.textContent).toContain("Current situation");
    expect(screen.getByTestId("adventure-scene-empty")).toBeTruthy();
  });

  it("bounds expanded body scroll height and applies optional maxExpandedHeightPx", async () => {
    const { rerender } = render(AdventureStateSummary, {
      manager: manager({
        location: { id: "loc-1", text: "The lantern road" },
        situation: { id: "sit-1", text: "The ward is failing" },
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
    });

    const body = screen.getByTestId("adventure-scene-details-body");
    expect(body.className).toContain("overflow-y-auto");
    expect(body.className).toContain("overscroll-contain");
    expect(body.className).toContain("max-h-[min(32dvh,16rem)]");
    expect(body.style.maxHeight).toBe("");

    await rerender({
      manager: manager({
        location: { id: "loc-1", text: "The lantern road" },
        situation: { id: "sit-1", text: "The ward is failing" },
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
      maxExpandedHeightPx: 140,
    });
    expect(body.style.maxHeight).toBe("140px");
  });

  it("renders nothing when there is no active session", () => {
    render(AdventureStateSummary, {
      manager: { session: null, recap: null } as any,
    });
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders location, situation, objectives, characters, and known facts", () => {
    render(AdventureStateSummary, {
      manager: manager({
        location: { id: "loc-1", text: "The lantern road" },
        situation: { id: "sit-1", text: "The ward is failing" },
        objectives: [{ id: "obj-1", text: "Reach the bell-stone" }],
        activeCharacters: [{ id: "char-1", text: "Father Gideon" }],
        knownFacts: [{ id: "fact-1", text: "The gate is breached" }],
        recentTurnSummaries: [],
      }),
    });

    // Once in the compact summary line and once, untruncated, in the details.
    expect(screen.getAllByText("The lantern road")).toHaveLength(2);
    expect(screen.getByText("The ward is failing")).toBeTruthy();
    expect(screen.getByText("Reach the bell-stone")).toBeTruthy();
    expect(screen.getByText("Father Gideon")).toBeTruthy();
    expect(screen.getByText("The gate is breached")).toBeTruthy();
  });

  it("shows a recap of recent turns only when there are any", () => {
    render(AdventureStateSummary, {
      manager: manager({
        location: undefined,
        situation: undefined,
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: ["The gate holds against the flood."],
      }),
    });

    expect(screen.getByText("Recap: what just happened")).toBeTruthy();
    expect(screen.getByText("The gate holds against the flood.")).toBeTruthy();
  });

  it("never renders a field sourced from hidden state", () => {
    const { container } = render(AdventureStateSummary, {
      manager: manager({
        location: { id: "loc-1", text: "The lantern road" },
        situation: undefined,
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
    });

    expect(container.textContent).not.toContain("secret");
    expect(container.textContent).not.toContain("hidden");
  });

  it("shows the full location in the expanded details, not only the truncated line", () => {
    const long =
      "The flooded undercroft beneath the old lantern-keepers' hall at the edge of town";
    render(AdventureStateSummary, {
      manager: manager({
        location: { id: "loc-1", text: long },
        situation: undefined,
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      }),
    });
    const summary = screen
      .getByTestId("adventure-scene-details")
      .querySelector("summary")!;
    const truncated = summary.querySelector(".truncate");
    expect(truncated).toBeTruthy();
    expect(truncated?.className).toContain("min-w-0");
    expect(truncated?.className).toContain("flex-1");
    expect(summary.getAttribute("title")).toBe(long);
    expect(summary.getAttribute("aria-label")).toBe(`Scene details: ${long}`);

    const full = screen.getByTestId("adventure-scene-location");
    expect(full.textContent).toContain(long);
    expect(full.className).toContain("break-words");
    expect(full.querySelector(".truncate")).toBeNull();
  });

  it("shows elapsed fictional time and known leads summary when available in recap", () => {
    render(AdventureStateSummary, {
      manager: manager({
        location: { id: "loc-1", text: "The crossroad" },
        situation: undefined,
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
        elapsedTimeLabel: "3h 15m",
        knownLeads: [
          {
            id: "lead-1",
            lead: "The missing wagon",
            status: "open",
            focused: true,
            lastUpdate: "Tracks lead north",
          },
          {
            id: "lead-2",
            lead: "The miller's debt",
            status: "resolved",
            focused: false,
          },
        ],
      }),
    });

    expect(screen.getByText("3h 15m")).toBeTruthy();
    expect(screen.getByText("Known leads")).toBeTruthy();
    expect(
      screen.getByText(
        "The missing wagon (Open, following) — Tracks lead north",
      ),
    ).toBeTruthy();
    expect(screen.getByText("The miller's debt (Resolved)")).toBeTruthy();
  });

  describe("panel variant", () => {
    const recap = {
      location: { id: "loc-1", text: "The lantern road" },
      situation: { id: "sit-1", text: "The ward is failing" },
      objectives: [{ id: "obj-1", text: "Reach the bell-stone" }],
      activeCharacters: [],
      knownFacts: [],
      recentTurnSummaries: [],
    };

    it("renders everything expanded without a details element", () => {
      const { container } = render(AdventureStateSummary, {
        manager: manager(recap),
        variant: "panel",
      });
      expect(screen.getByTestId("adventure-scene-panel")).toBeTruthy();
      expect(
        screen.getByRole("heading", { name: "Current scene" }),
      ).toBeTruthy();
      expect(screen.getByText("The lantern road")).toBeTruthy();
      expect(screen.getByText("The ward is failing")).toBeTruthy();
      expect(screen.getByText("Reach the bell-stone")).toBeTruthy();
      expect(container.querySelector("details")).toBeNull();
      expect(screen.queryByText("Who's here")).toBeNull();
    });

    it("renders the media snippet between location and situation", () => {
      const media = createRawSnippet(() => ({
        render: () => '<div data-testid="media">art</div>',
      }));
      render(AdventureStateSummary, {
        manager: manager(recap),
        variant: "panel",
        media,
      });
      const location = screen.getByText("The lantern road");
      const art = screen.getByTestId("media");
      const situation = screen.getByText("The ward is failing");
      expect(
        location.compareDocumentPosition(art) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        art.compareDocumentPosition(situation) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("renders nothing without a session", () => {
      render(AdventureStateSummary, {
        manager: { session: null, recap: null } as any,
        variant: "panel",
      });
      expect(screen.queryByTestId("adventure-scene-panel")).toBeNull();
    });

    it("gives two instances distinct heading ids", () => {
      render(AdventureStateSummary, { manager: manager(recap) });
      render(AdventureStateSummary, {
        manager: manager(recap),
        variant: "panel",
      });
      const ids = screen
        .getAllByRole("heading", { level: 3, hidden: true })
        .map((h) => h.id);
      expect(ids).toHaveLength(2);
      expect(new Set(ids).size).toBe(2);
    });
  });
});
