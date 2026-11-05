/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdventureFocusPlay from "./AdventureFocusPlay.svelte";

vi.mock("#lib/actions/focusTrap.js", () => ({
  focusTrap: () => ({ destroy() {} }),
}));

beforeEach(() => {
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(
      () =>
        ({
          finished: Promise.resolve(),
          cancel: vi.fn(),
          play: vi.fn(),
        }) as unknown as Animation,
    );
  }
});

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
      turns: [],
      pendingRoll: null,
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
    recap: {
      location: { id: "loc-1", text: "The lantern road" },
      situation: { id: "sit-1", text: "The ward is failing" },
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      recentTurnSummaries: [],
    },
    rollHistory: [],
    submitAction: vi.fn(),
    submitCorrection: vi.fn(),
    addDicePreset: vi.fn(),
    removeDicePreset: vi.fn(),
    addResourceCounter: vi.fn(),
    adjustResourceCounter: vi.fn(),
    removeResourceCounter: vi.fn(),
    end: vi.fn(),
    close: vi.fn(),
    cancel: vi.fn(),
  } as any;
}

const repository = {
  list: vi.fn().mockResolvedValue({ entries: [] }),
} as any;
const originalFullscreenElement = Object.getOwnPropertyDescriptor(
  document,
  "fullscreenElement",
);

function props(
  overrides: Partial<{ manager: ReturnType<typeof manager> }> = {},
) {
  return {
    manager: manager(),
    existingTitles: [],
    onAddProvisionalFact: vi.fn(),
    repository,
    vaultId: "vault-1",
    onResume: vi.fn(),
    onResumeArchived: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalFullscreenElement) {
    Object.defineProperty(
      document,
      "fullscreenElement",
      originalFullscreenElement,
    );
  } else {
    Reflect.deleteProperty(document, "fullscreenElement");
  }
});

describe("AdventureFocusPlay", () => {
  it("uses a compact mobile shell with the action dock outside the narrative scroll", () => {
    render(AdventureFocusPlay, { props: props() });

    const surface = screen.getByTestId("adventure-play-surface");
    const viewport = screen.getByTestId("adventure-play-viewport");
    const dock = screen.getByTestId("adventure-action-dock");
    const title = screen.getByRole("heading", { name: "The Drowned March" });

    expect(surface.className).toContain("h-[100dvh]");
    expect(surface.className).toContain("fixed");
    expect(title.className).toContain("truncate");
    expect(title.getAttribute("title")).toBe("The Drowned March");
    expect(viewport.contains(dock)).toBe(false);
    expect(surface.contains(dock)).toBe(true);
    expect(
      screen.getByRole("button", { name: "Adventure tools" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit action" })).toBeTruthy();
  });

  it("follows newly generated adventure events to the bottom", async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
    const initial = manager();
    const { rerender } = render(AdventureFocusPlay, {
      props: props({ manager: initial }),
    });
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    scrollTo.mockClear();

    await rerender({
      ...props({
        manager: {
          ...initial,
          phase: "generating",
          transcript: {
            sessionId: "adventure-1",
            title: "The Drowned March",
            turns: [
              {
                sequence: 0,
                playerAction: "Cross the causeway",
                narration: "The water rises.",
                committedAt: "2026-08-22T00:00:00.000Z",
              },
            ],
          },
        },
      }),
    });

    await waitFor(() =>
      expect(scrollTo).toHaveBeenLastCalledWith(
        expect.objectContaining({ behavior: "smooth" }),
      ),
    );
  });

  it("can end the adventure from the management menu", async () => {
    const m = manager();
    render(AdventureFocusPlay, { props: props({ manager: m }) });

    await fireEvent.click(
      screen.getByTestId("adventure-management-menu-button"),
    );
    await fireEvent.click(
      screen.getByRole("menuitem", { name: /end adventure/i }),
    );

    expect(m.end).toHaveBeenCalledOnce();
  });

  it("shows the current situation without opening the tools panel", () => {
    render(AdventureFocusPlay, { props: props() });

    expect(screen.getAllByText("The lantern road").length).toBeGreaterThan(0);
    expect(screen.getByText("The ward is failing")).toBeTruthy();
  });

  it("keeps the tools panel collapsed by default and can expand it without hiding the play column", async () => {
    render(AdventureFocusPlay, { props: props() });

    expect(
      screen
        .getByRole("button", { name: "Adventure tools" })
        .getAttribute("aria-expanded"),
    ).toBe("false");

    await fireEvent.click(
      screen.getByRole("button", { name: "Adventure tools" }),
    );

    expect(
      screen
        .getByRole("button", { name: "Adventure tools" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
  });

  it("keeps dice presets and resource trackers out of the DOM until the tools sheet opens", async () => {
    render(AdventureFocusPlay, { props: props() });

    // The tools sheet is a bottom sheet mounted only while open, not a
    // side-by-side panel hidden via class — see the component comment for
    // why: a lg: viewport breakpoint still fires even when this surface is
    // hosted in the app's own narrow sidebar, so it can never rely on an
    // actual side-by-side split reading as usable.
    expect(
      screen.queryByRole("complementary", { name: "Adventure tools" }),
    ).toBeNull();
    expect(screen.queryByText("Dice presets")).toBeNull();
    expect(screen.queryByText("Resource trackers")).toBeNull();

    await fireEvent.click(
      screen.getByRole("button", { name: "Adventure tools" }),
    );

    expect(
      screen.getByRole("complementary", { name: "Adventure tools" }),
    ).toBeTruthy();
    expect(screen.getByText("Dice presets")).toBeTruthy();
    expect(screen.getByText("Resource trackers")).toBeTruthy();
  });

  it("closes the tools sheet via the backdrop, the close button, or Escape", async () => {
    render(AdventureFocusPlay, { props: props() });

    await fireEvent.click(
      screen.getByRole("button", { name: "Adventure tools" }),
    );
    expect(
      screen.getByRole("complementary", { name: "Adventure tools" }),
    ).toBeTruthy();

    await fireEvent.click(screen.getAllByLabelText("Close adventure tools")[0]);
    expect(
      screen.queryByRole("complementary", { name: "Adventure tools" }),
    ).toBeNull();

    await fireEvent.click(
      screen.getByRole("button", { name: "Adventure tools" }),
    );
    expect(
      screen.getByRole("complementary", { name: "Adventure tools" }),
    ).toBeTruthy();

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("complementary", { name: "Adventure tools" }),
    ).toBeNull();
  });

  it("keeps the adventure surface visible when fullscreen is denied", async () => {
    render(AdventureFocusPlay, { props: props() });
    const surface = screen.getByTestId("adventure-play-surface");
    Object.assign(surface, {
      requestFullscreen: vi.fn().mockRejectedValue(new Error("denied")),
    });

    await fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));

    await waitFor(() => {
      expect(screen.getByTestId("adventure-play-surface")).toBeTruthy();
    });
  });

  it("keeps the adventure surface visible when Escape exits browser fullscreen", async () => {
    render(AdventureFocusPlay, { props: props() });
    const surface = screen.getByTestId("adventure-play-surface");
    let fullscreenElement: Element | null = null;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.assign(surface, {
      requestFullscreen: vi.fn().mockImplementation(async () => {
        fullscreenElement = surface;
        document.dispatchEvent(new Event("fullscreenchange"));
      }),
    });

    await fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));
    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Fullscreen active" })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    });

    fullscreenElement = null;
    document.dispatchEvent(new Event("fullscreenchange"));

    await waitFor(() => {
      expect(screen.getByTestId("adventure-play-surface")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Fullscreen" })).toBeTruthy();
    });
  });

  it("ignores repeated fullscreen requests while a transition is pending", async () => {
    render(AdventureFocusPlay, { props: props() });
    const surface = screen.getByTestId("adventure-play-surface");
    let resolveFullscreen: (() => void) | undefined;
    const requestFullscreen = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFullscreen = resolve;
        }),
    );
    Object.assign(surface, { requestFullscreen });

    const fullscreenButton = screen.getByRole("button", {
      name: "Fullscreen",
    });
    await fireEvent.click(fullscreenButton);
    await fireEvent.click(fullscreenButton);

    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(fullscreenButton).toHaveProperty("disabled", true);

    resolveFullscreen?.();
    await waitFor(() => {
      expect(fullscreenButton).toHaveProperty("disabled", false);
    });
  });

  it("allows leaving the adventure from the header button", async () => {
    const m = manager();
    render(AdventureFocusPlay, { props: props({ manager: m }) });

    const leaveButton = screen.getByRole("button", { name: "Leave adventure" });
    await fireEvent.click(leaveButton);

    expect(m.close).toHaveBeenCalledOnce();
  });

  it("lists situation controls in Adventure tools, not the main window", async () => {
    const m = manager();
    m.session.scenarioCollection = {
      focusedScenarioId: null,
      items: [
        {
          id: "lead-1",
          knowledge: "heard",
          status: "open",
          playerVisible: { rumour: "A drowned bell", lead: "The quay" },
          events: [],
        },
      ],
    };
    render(AdventureFocusPlay, { props: props({ manager: m }) });
    expect(screen.queryByTestId("adventure-situation-settings")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Mark as concluded" }),
    ).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: "Adventure tools" }),
    );
    expect(screen.getByTestId("adventure-situation-settings")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Mark as concluded" }),
    ).toBeTruthy();
  });

  it("shows suggested actions as chips above phone width", () => {
    const m = manager();
    m.suggestedActions = ["Search the wreckage"];
    render(AdventureFocusPlay, { props: props({ manager: m }) });
    const suggestions = screen.getByTestId("adventure-suggested-actions");
    expect(suggestions.tagName).toBe("DIV");
    expect(suggestions.querySelector("summary")).toBeNull();
  });

  describe("at phone width", () => {
    let viewport: EventTarget & { height: number; offsetTop: number };
    const originalMatchMedia = window.matchMedia;
    const originalViewport = Object.getOwnPropertyDescriptor(
      window,
      "visualViewport",
    );

    beforeEach(() => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("639px"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })) as any;
      viewport = Object.assign(new EventTarget(), {
        height: window.innerHeight,
        offsetTop: 0,
      });
      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: viewport,
      });
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      if (originalViewport) {
        Object.defineProperty(window, "visualViewport", originalViewport);
      } else {
        Reflect.deleteProperty(window, "visualViewport");
      }
    });

    it("keeps suggested actions in the collapsed list", () => {
      const m = manager();
      m.suggestedActions = ["Search the wreckage"];
      render(AdventureFocusPlay, { props: props({ manager: m }) });
      expect(screen.getByTestId("adventure-suggested-actions").tagName).toBe(
        "DETAILS",
      );
    });

    it("renders as a modal dialog outside any transformed host and takes focus", async () => {
      const outside = document.createElement("button");
      document.body.appendChild(outside);
      outside.focus();
      const { unmount } = render(AdventureFocusPlay, { props: props() });
      const surface = screen.getByTestId("adventure-play-surface");
      expect(surface.parentElement).toBe(document.body);
      expect(surface.getAttribute("role")).toBe("dialog");
      expect(surface.getAttribute("aria-modal")).toBe("true");
      await waitFor(() =>
        expect(surface.contains(document.activeElement)).toBe(true),
      );
      unmount();
      expect(document.activeElement).toBe(outside);
      outside.remove();
    });

    it("uses visualViewport height even when the change is too small for keyboard detection", async () => {
      render(AdventureFocusPlay, { props: props() });
      const surface = screen.getByTestId("adventure-play-surface");
      viewport.height = window.innerHeight - 80;
      viewport.offsetTop = 12;
      viewport.dispatchEvent(new Event("resize"));
      await waitFor(() => {
        expect(surface.style.top).toBe("12px");
        expect(surface.style.height).toBe(window.innerHeight - 80 + "px");
      });
    });

    it("leaves sizing to the browser when it resizes the page for the keyboard", async () => {
      render(AdventureFocusPlay, { props: props() });
      const surface = screen.getByTestId("adventure-play-surface");
      // interactive-widget=resizes-content: layout and visual viewports shrink
      // together, so there is no gap and no measured height to apply.
      const original = Object.getOwnPropertyDescriptor(window, "innerHeight");
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: 400,
      });
      try {
        viewport.height = 400;
        viewport.offsetTop = 0;
        viewport.dispatchEvent(new Event("resize"));
        await waitFor(() =>
          expect(surface.getAttribute("style") ?? "").toBe(""),
        );
      } finally {
        if (original) Object.defineProperty(window, "innerHeight", original);
      }
    });

    it("drops the pinned height once the keyboard gap closes", async () => {
      render(AdventureFocusPlay, { props: props() });
      const surface = screen.getByTestId("adventure-play-surface");
      viewport.height = window.innerHeight - 300;
      viewport.dispatchEvent(new Event("resize"));
      await waitFor(() =>
        expect(surface.style.height).toBe(window.innerHeight - 300 + "px"),
      );
      viewport.height = window.innerHeight;
      viewport.dispatchEvent(new Event("resize"));
      await waitFor(() => expect(surface.style.height).toBe(""));
    });

    it("pins to the visible viewport when the keyboard reduces it", async () => {
      render(AdventureFocusPlay, { props: props() });
      const surface = screen.getByTestId("adventure-play-surface");
      viewport.height = window.innerHeight - 300;
      viewport.offsetTop = 40;
      viewport.dispatchEvent(new Event("resize"));
      await waitFor(() => {
        expect(surface.style.top).toBe("40px");
        expect(surface.style.height).toBe(window.innerHeight - 300 + "px");
      });
    });
  });

  it("is not a dialog and stays in place on wider screens", () => {
    render(AdventureFocusPlay, { props: props() });
    const surface = screen.getByTestId("adventure-play-surface");
    expect(surface.getAttribute("role")).toBeNull();
    expect(surface.parentElement).not.toBe(document.body);
  });
});
