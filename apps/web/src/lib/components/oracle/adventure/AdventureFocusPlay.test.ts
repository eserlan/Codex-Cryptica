/** @vitest-environment jsdom */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import type { ComponentProps } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdventureFocusPlay from "./AdventureFocusPlay.svelte";

const artworkMocks = vi.hoisted(() => ({
  summarize: vi.fn(),
}));
vi.mock("#lib/services/adventure/artwork/artwork-cue-summary.js", () => ({
  summarizeArtworkCues: artworkMocks.summarize,
}));
vi.mock("#lib/services/adventure/artwork/default-artwork-catalogue.js", () => ({
  defaultArtworkCatalogue: {
    get: vi.fn().mockResolvedValue([]),
    peek: vi.fn().mockReturnValue([]),
  },
}));
vi.mock("#lib/services/adventure/artwork/create-display-service.js", () => ({
  createDisplayService: () => ({
    display: { load: vi.fn() },
    destroy: vi.fn(),
  }),
}));

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
  overrides: Partial<ComponentProps<typeof AdventureFocusPlay>> = {},
) {
  return {
    manager: manager(),
    existingTitles: [],
    onAddProvisionalFact: vi.fn(),
    onAddAllProvisionalFacts: vi.fn(),
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
  it("places the dock after the story viewport in a shared play column", () => {
    render(AdventureFocusPlay, { props: props() });

    const surface = screen.getByTestId("adventure-play-surface");
    const column = screen.getByTestId("adventure-play-column");
    const viewport = screen.getByTestId("adventure-play-viewport");
    const dock = screen.getByTestId("adventure-action-dock");
    const panel = screen.queryByTestId("adventure-artwork-panel");

    expect(surface.contains(dock)).toBe(true);
    expect(column.contains(dock)).toBe(true);
    expect(column.contains(viewport)).toBe(true);
    expect(viewport.contains(dock)).toBe(false);
    expect(panel?.contains(dock) ?? false).toBe(false);
    expect(panel ? column.contains(panel) : false).toBe(false);
    expect(
      viewport.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("themes the independent scene, transcript, and tools scroll regions", async () => {
    render(AdventureFocusPlay, { props: props() });

    const scenePanel = screen.getByTestId("adventure-artwork-panel");
    const storyViewport = screen.getByTestId("adventure-play-viewport");

    expect(scenePanel.classList.contains("adventure-scrollbar")).toBe(true);
    expect(storyViewport.classList.contains("adventure-scrollbar")).toBe(true);
    expect(scenePanel.classList.contains("@4xl:overflow-y-auto")).toBe(true);
    expect(storyViewport.classList.contains("overflow-y-auto")).toBe(true);
    expect(storyViewport.contains(scenePanel)).toBe(false);

    await fireEvent.click(
      screen.getByRole("button", { name: "Adventure tools" }),
    );
    const tools = screen.getByRole("complementary", {
      name: "Adventure tools",
    });
    expect(tools.classList.contains("adventure-scrollbar")).toBe(true);
    expect(tools.classList.contains("overflow-y-auto")).toBe(true);
  });

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
    expect(
      within(screen.getByTestId("adventure-artwork-panel")).getByText(
        "The ward is failing",
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("adventure-scene-strip")).getByText(
        "The ward is failing",
      ),
    ).toBeTruthy();
  });

  function sceneManager() {
    const m = manager();
    m.recap = {
      ...m.recap,
      objectives: [{ id: "obj-1", text: "Reach the bell-stone" }],
      activeCharacters: [{ id: "char-1", text: "Father Gideon" }],
    };
    return m;
  }

  it("shows a Current scene panel beside the story, outside the transcript", () => {
    render(AdventureFocusPlay, { props: props({ manager: sceneManager() }) });

    const panel = screen.getByTestId("adventure-artwork-panel");
    expect(panel.getAttribute("aria-label")).toBe("Current scene");
    expect(screen.getByRole("complementary", { name: "Current scene" })).toBe(
      panel,
    );
    expect(screen.getByTestId("adventure-play-viewport").contains(panel)).toBe(
      false,
    );
    const inside = within(panel);
    expect(inside.getByText("The lantern road")).toBeTruthy();
    expect(inside.getByText("The ward is failing")).toBeTruthy();
    expect(inside.getByText("Reach the bell-stone")).toBeTruthy();
    expect(inside.getByText("Who's here")).toBeTruthy();
    expect(inside.getByText("Father Gideon")).toBeTruthy();
  });

  it("keeps the panel text without the artwork flag", () => {
    vi.stubEnv("VITE_ADVENTURE_ARTWORK", "false");
    try {
      render(AdventureFocusPlay, { props: props({ manager: sceneManager() }) });
      const panel = screen.getByTestId("adventure-artwork-panel");
      expect(within(panel).getByText("The lantern road")).toBeTruthy();
      expect(within(panel).getByText("The ward is failing")).toBeTruthy();
      expect(panel.querySelector("img, canvas, [data-testid*='artwork']")).toBe(
        null,
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("pins a collapsed Scene details strip above the transcript", () => {
    render(AdventureFocusPlay, { props: props({ manager: sceneManager() }) });

    const strip = screen.getByTestId("adventure-scene-strip");
    const viewport = screen.getByTestId("adventure-play-viewport");
    expect(viewport.contains(strip)).toBe(false);
    expect(
      strip.compareDocumentPosition(viewport) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByTestId("adventure-scene-details")).toHaveProperty(
      "open",
      false,
    );
  });

  it("renders no scene panel or strip without a session", () => {
    const m = manager();
    m.session = null;
    m.recap = null;
    render(AdventureFocusPlay, { props: props({ manager: m }) });

    expect(screen.queryByTestId("adventure-artwork-panel")).toBeNull();
    expect(screen.queryByTestId("adventure-scene-strip")).toBeNull();
  });

  it("switches layout on the surface's own width, not the viewport", () => {
    render(AdventureFocusPlay, { props: props({ manager: sceneManager() }) });

    const surface = screen.getByTestId("adventure-play-surface");
    expect(surface.classList.contains("@container")).toBe(true);
    for (const el of [surface, ...surface.querySelectorAll("[class]")]) {
      for (const token of Array.from(el.classList)) {
        expect(token.startsWith("lg:") || token.startsWith("xl:")).toBe(false);
      }
    }
    const panel = screen.getByTestId("adventure-artwork-panel");
    expect(panel.classList.contains("hidden")).toBe(true);
    expect(panel.classList.contains("@4xl:block")).toBe(true);
    const wrap = screen.getByTestId("adventure-scene-strip").parentElement;
    expect(wrap?.classList.contains("@4xl:hidden")).toBe(true);
  });

  it("mounts the lightbox host outside the container-type surface", () => {
    render(AdventureFocusPlay, { props: props({ manager: sceneManager() }) });

    const surface = screen.getByTestId("adventure-play-surface");
    const host = [...document.body.children].find((el) =>
      el.classList.contains("contents"),
    );
    expect(host).toBeTruthy();
    expect(surface.contains(host!)).toBe(false);
    expect(host!.closest(".\\@container")).toBeNull();
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
    // why: no viewport breakpoints for side-by-side layout; the scene panel
    // uses a container query on the surface's own width.
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

    it("renders a single-row compact header with 44px touch targets and no desktop toolbar controls", () => {
      const m = manager();
      const longTitle =
        "The Endless Chronicles of the Sunken Lantern Marsh and Forgotten Causeway";
      m.session.title = longTitle;
      m.session.provisionalFacts = [
        {
          id: "barrow-1",
          kind: "place",
          name: "Sunken Barrow",
          summary: "Flooded crypts.",
          introducedOnTurnId: "t1",
          visibility: "player-visible",
        },
      ];
      m.session.scenarioCollection = {
        focusedScenarioId: null,
        items: [
          {
            id: "sit-1",
            knowledge: "heard",
            status: "open",
            playerVisible: { rumour: "Bell rings", lead: "Belfry" },
            events: [],
            anchorRefs: [],
          },
        ],
      };

      render(AdventureFocusPlay, { props: props({ manager: m }) });

      const surface = screen.getByTestId("adventure-play-surface");
      const header = surface.querySelector("header")!;
      expect(header.className).toContain("flex-nowrap");

      const heading = within(header).getByRole("heading", { name: longTitle });
      expect(heading.className).toContain("truncate");
      expect(heading.getAttribute("title")).toBe(longTitle);
      expect(heading.getAttribute("aria-label")).toBe(longTitle);

      const leaveBtn = within(header).getByRole("button", {
        name: "Leave adventure",
      });
      const toolsBtn = within(header).getByRole("button", {
        name: "Adventure tools (1 discovery, 1 active situation)",
      });
      expect(leaveBtn.className).toContain("min-h-11");
      expect(leaveBtn.className).toContain("min-w-11");
      expect(toolsBtn.className).toContain("min-h-11");
      expect(toolsBtn.className).toContain("min-w-11");
      expect(within(header).getAllByRole("button")).toHaveLength(2);

      expect(
        within(header).queryByTestId("adventure-management-menu-button"),
      ).toBeNull();
      expect(
        within(header).queryByRole("button", { name: /fullscreen/i }),
      ).toBeNull();
      expect(
        within(header).queryByRole("button", { name: /review \d+ adventure/i }),
      ).toBeNull();
      expect(
        within(header).queryByRole("button", { name: /adventure situations/i }),
      ).toBeNull();
      expect(screen.getByTestId("adventure-tools-badge").textContent).toBe("2");
    });

    it("relocates Discoveries, Situations, Fullscreen, and Management into the tools sheet and portals sub-dialogs", async () => {
      const m = manager();
      const longTitle =
        "The Endless Chronicles of the Sunken Lantern Marsh and Forgotten Causeway";
      m.session.title = longTitle;
      m.session.provisionalFacts = [
        {
          id: "barrow-1",
          kind: "place",
          name: "Sunken Barrow",
          summary: "Flooded crypts.",
          introducedOnTurnId: "t1",
          visibility: "player-visible",
        },
      ];
      m.session.scenarioCollection = {
        focusedScenarioId: "sit-1",
        items: [
          {
            id: "sit-1",
            knowledge: "heard",
            status: "open",
            playerVisible: { rumour: "Bell rings", lead: "Belfry" },
            events: [],
            anchorRefs: [],
          },
        ],
      };
      const repo = {
        list: vi.fn().mockResolvedValue({
          entries: [
            {
              id: "adventure-2",
              title: "Salt Marsh",
              status: "active",
              loadCondition: "normal",
            },
          ],
        }),
      } as any;

      render(AdventureFocusPlay, {
        props: props({ manager: m, repository: repo }),
      });

      await fireEvent.click(
        screen.getByRole("button", {
          name: "Adventure tools (1 discovery, 1 active situation)",
        }),
      );

      const sheet = screen.getByRole("complementary", {
        name: "Adventure tools",
      });
      expect(
        within(sheet).getByTestId("adventure-tools-full-title").textContent,
      ).toBe(longTitle);
      expect(
        within(sheet).getByTestId("adventure-tools-mobile-controls"),
      ).toBeTruthy();
      expect(
        within(sheet).getByRole("button", { name: "Fullscreen" }),
      ).toBeTruthy();
      expect(
        within(sheet).getByRole("button", { name: "End adventure" }),
      ).toBeTruthy();
      expect(
        await within(sheet).findByRole("button", {
          name: "Switch to Salt Marsh",
        }),
      ).toBeTruthy();
      expect(repo.list).toHaveBeenCalledTimes(1);

      // Open Discoveries from sheet -> portaled directly under surface, not trapped in sheet
      const discoveriesTrigger = within(sheet).getByRole("button", {
        name: "Review 1 adventure discovery",
      });
      await fireEvent.click(discoveriesTrigger);

      const surface = screen.getByTestId("adventure-play-surface");
      const discoveryOverlay = screen.getByTestId(
        "adventure-discovery-overlay",
      );
      expect(discoveryOverlay.parentElement).toBe(surface);
      expect(sheet.contains(discoveryOverlay)).toBe(false);
      expect(
        screen.getByRole("dialog", { name: "Review discoveries" }),
      ).toBeTruthy();

      await fireEvent.click(
        screen.getByRole("button", { name: "Close discoveries" }),
      );

      // Open Situations from sheet -> portaled directly under surface
      const situationsTrigger = within(sheet).getByRole("button", {
        name: "Adventure situations (1 active)",
      });
      await fireEvent.click(situationsTrigger);
      const situationsOverlay = screen.getByTestId(
        "adventure-situations-overlay",
      );
      expect(situationsOverlay.parentElement).toBe(surface);
      expect(sheet.contains(situationsOverlay)).toBe(false);
    });

    it("updates badge count, aria-label, and polite live region when discoveries or situations change", async () => {
      const m = manager();
      const { rerender } = render(AdventureFocusPlay, {
        props: props({ manager: m }),
      });

      const live = screen.getByTestId("adventure-phone-live-status");
      expect(live.getAttribute("aria-live")).toBe("polite");
      expect(live.textContent).toBe(
        "No pending discoveries or active situations in Adventure tools.",
      );
      expect(screen.queryByTestId("adventure-tools-badge")).toBeNull();
      expect(
        screen.getByRole("button", { name: "Adventure tools" }),
      ).toBeTruthy();

      const updated = manager();
      updated.session.provisionalFacts = [
        {
          id: "barrow-1",
          kind: "place",
          name: "Sunken Barrow",
          summary: "Flooded crypts.",
          introducedOnTurnId: "t1",
          visibility: "player-visible",
        },
      ];
      updated.session.scenarioCollection = {
        focusedScenarioId: null,
        items: [
          {
            id: "sit-1",
            knowledge: "heard",
            status: "open",
            playerVisible: { rumour: "Bell rings", lead: "Belfry" },
            events: [],
            anchorRefs: [],
          },
        ],
      };

      await rerender(props({ manager: updated }));

      expect(screen.getByTestId("adventure-tools-badge").textContent).toBe("2");
      expect(
        screen.getByRole("button", {
          name: "Adventure tools (1 discovery, 1 active situation)",
        }),
      ).toBeTruthy();
      expect(live.textContent).toBe(
        "1 discovery, 1 active situation in Adventure tools.",
      );

      const cleared = manager();
      cleared.session.provisionalFacts = [];
      cleared.session.scenarioCollection = {
        focusedScenarioId: null,
        items: [],
      };
      await rerender(props({ manager: cleared }));

      expect(live.textContent).toBe(
        "No pending discoveries or active situations in Adventure tools.",
      );
    });

    it("manages focus, wraps Tab inside the open sheet, and enforces Escape precedence for nested dialogs", async () => {
      const m = manager();
      m.session.provisionalFacts = [
        {
          id: "barrow-1",
          kind: "place",
          name: "Sunken Barrow",
          summary: "Flooded crypts.",
          introducedOnTurnId: "t1",
          visibility: "player-visible",
        },
      ];
      render(AdventureFocusPlay, { props: props({ manager: m }) });

      const toolsButton = screen.getByRole("button", {
        name: "Adventure tools (1 discovery)",
      });
      toolsButton.focus();
      await fireEvent.click(toolsButton);

      const sheet = screen.getByRole("complementary", {
        name: "Adventure tools",
      });
      await waitFor(() =>
        expect(sheet.contains(document.activeElement)).toBe(true),
      );

      // Tab wraps inside the open sheet
      const closeBtn = within(sheet).getByRole("button", {
        name: "Close adventure tools",
      });
      closeBtn.focus();
      await fireEvent.keyDown(sheet, { key: "Tab", shiftKey: true });
      expect(sheet.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(closeBtn);

      // Open sub-dialog from sheet -> first Escape closes sub-dialog only
      const discoveriesTrigger = within(sheet).getByRole("button", {
        name: "Review 1 adventure discovery",
      });
      await fireEvent.click(discoveriesTrigger);
      expect(
        screen.getByRole("dialog", { name: "Review discoveries" }),
      ).toBeTruthy();

      await fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "Review discoveries" }),
        ).toBeNull();
        expect(
          screen.getByRole("complementary", { name: "Adventure tools" }),
        ).toBeTruthy();
        expect(document.activeElement).toBe(discoveriesTrigger);
      });

      // Second Escape closes the tools sheet and restores focus to header tools button
      await fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => {
        expect(
          screen.queryByRole("complementary", { name: "Adventure tools" }),
        ).toBeNull();
        expect(document.activeElement).toBe(toolsButton);
      });
    });

    it("keeps compact header stable across phases and surfaces urgent states, 0-count Discoveries, and switch errors safely", async () => {
      const m = manager();
      m.phase = "generating";
      const { rerender } = render(AdventureFocusPlay, {
        props: props({ manager: m }),
      });

      const status = () => screen.getByTestId("adventure-header-status");
      expect(status().textContent).toContain("Generating…");

      const pending = manager();
      pending.session.pendingRoll = { id: "r1", prompt: "Jump" } as any;
      await rerender(props({ manager: pending }));
      expect(status().textContent).toContain("Roll needed");

      const offline = manager();
      offline.phase = "offline";
      await rerender(props({ manager: offline }));
      expect(status().textContent).toContain("Waiting for connection");

      const ro = manager();
      ro.readOnly = true;
      await rerender(props({ manager: ro }));
      expect(status().textContent).toContain("Read-only in this tab");
      expect(screen.getByTestId("adventure-tools-urgent-dot")).toBeTruthy();

      const onResume = vi.fn().mockRejectedValue(new Error("boom"));
      const repo = {
        list: vi.fn().mockResolvedValue({
          entries: [
            {
              id: "adv-2",
              title: "Salt Marsh",
              status: "active",
              loadCondition: "normal",
            },
          ],
        }),
      } as any;
      await rerender(props({ manager: ro, repository: repo, onResume }));

      await fireEvent.click(
        screen.getByRole("button", {
          name: "Adventure tools (read-only recovery available)",
        }),
      );
      const sheet = screen.getByRole("complementary", {
        name: "Adventure tools",
      });
      expect(
        within(sheet).getByRole("button", {
          name: /force end stuck adventure/i,
        }),
      ).toBeTruthy();

      // 0-count Discoveries still opens empty state cleanly and restores focus
      const zeroDiscoveriesBtn = within(sheet).getByRole("button", {
        name: "Adventure discoveries (0 awaiting review)",
      });
      await fireEvent.click(zeroDiscoveriesBtn);
      expect(
        screen.getByText(
          "All discoveries reviewed. You can return to your adventure.",
        ),
      ).toBeTruthy();
      await fireEvent.click(
        screen.getByRole("button", { name: "Close discoveries" }),
      );
      await waitFor(() =>
        expect(document.activeElement).toBe(zeroDiscoveriesBtn),
      );

      // Failed switch closes sheet without crashing
      const switchBtn = await within(sheet).findByRole("button", {
        name: "Switch to Salt Marsh",
      });
      await fireEvent.click(switchBtn);
      expect(onResume).toHaveBeenCalledWith("adv-2");
      expect(
        screen.queryByRole("complementary", { name: "Adventure tools" }),
      ).toBeNull();
    });
  });

  it("is not a dialog and stays in place on wider screens", () => {
    render(AdventureFocusPlay, { props: props() });
    const surface = screen.getByTestId("adventure-play-surface");
    expect(surface.getAttribute("role")).toBeNull();
    expect(surface.parentElement).not.toBe(document.body);
  });

  it("opens provisional discovery review directly from the adventure header", async () => {
    const m = manager();
    (m.session as any).provisionalFacts = [
      {
        id: "barrow-1",
        kind: "place",
        name: "Sunken Barrow",
        summary: "Flooded crypts.",
        introducedOnTurnId: "t1",
        visibility: "player-visible",
      },
    ];
    render(AdventureFocusPlay, { props: props({ manager: m }) });
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: "Review 1 adventure discovery" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Review discoveries" }),
    ).toBeTruthy();
    expect(screen.getByText("Sunken Barrow")).toBeTruthy();
    expect(screen.getByText("1 discovery awaiting review")).toBeTruthy();
  });

  it("opens situations and rumours directly from the adventure header", async () => {
    const m = manager();
    (m.session as any).scenarioCollection = {
      items: [
        {
          id: "sit-1",
          knowledge: "heard",
          status: "open",
          playerVisible: {
            rumour: "The beacon is dark.",
            lead: "The High Beacon",
          },
          events: [],
          anchorRefs: [],
        },
      ],
      focusedScenarioId: "sit-1",
    };
    render(AdventureFocusPlay, { props: props({ manager: m }) });

    const trigger = screen.getByRole("button", {
      name: "Adventure situations (1 active)",
    });
    expect(trigger).toBeTruthy();
    await fireEvent.click(trigger);

    expect(
      screen.getByRole("dialog", { name: "Situations & Rumours" }),
    ).toBeTruthy();
    expect(screen.getAllByText("The High Beacon").length).toBeGreaterThan(0);
  });

  describe("artwork matching details", () => {
    const summary = {
      genre: "fantasy",
      place: { name: "Mill", cues: ["village"], match: "loc-1" },
      npcs: [],
    };
    const indicator = "adventure-artwork-cue-indicator";

    afterEach(() => {
      vi.unstubAllEnvs();
      artworkMocks.summarize.mockReset();
    });

    it("lives in Adventure tools after the illustrations setting", async () => {
      vi.stubEnv("VITE_ADVENTURE_ARTWORK", "true");
      artworkMocks.summarize.mockReturnValue(summary);
      render(AdventureFocusPlay, { props: props({ manager: manager() }) });

      expect(screen.queryByTestId(indicator)).toBeNull();
      await fireEvent.click(
        screen.getByRole("button", { name: "Adventure tools" }),
      );
      const drawer = screen.getByRole("complementary", {
        name: "Adventure tools",
      });
      const details = within(drawer).getByTestId(indicator);
      const checkbox = within(drawer).getByRole("checkbox", {
        name: /Show adventure illustrations/,
      });
      expect(
        checkbox.compareDocumentPosition(details) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      const panel = screen.queryByTestId("adventure-artwork-panel");
      expect(panel?.querySelector(`[data-testid="${indicator}"]`) ?? null).toBe(
        null,
      );
    });

    it("shows nothing when there is no summary", async () => {
      vi.stubEnv("VITE_ADVENTURE_ARTWORK", "true");
      artworkMocks.summarize.mockReturnValue(null);
      render(AdventureFocusPlay, { props: props({ manager: manager() }) });
      await fireEvent.click(
        screen.getByRole("button", { name: "Adventure tools" }),
      );
      expect(screen.queryByTestId(indicator)).toBeNull();
    });

    it("shows nothing when the artwork flag is off", async () => {
      vi.stubEnv("VITE_ADVENTURE_ARTWORK", "false");
      artworkMocks.summarize.mockReturnValue(summary);
      render(AdventureFocusPlay, { props: props({ manager: manager() }) });
      await fireEvent.click(
        screen.getByRole("button", { name: "Adventure tools" }),
      );
      expect(screen.queryByTestId(indicator)).toBeNull();
    });
  });
});
