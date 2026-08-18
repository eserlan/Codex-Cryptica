/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdventureFocusPlay from "./AdventureFocusPlay.svelte";

vi.mock("$lib/actions/focusTrap", () => ({
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

    expect(screen.getByText("The lantern road")).toBeTruthy();
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

  it("keeps dice presets and resource trackers inside the collapsed tools panel", async () => {
    render(AdventureFocusPlay, { props: props() });

    expect(screen.getByLabelText("Adventure tools").className).toContain(
      "hidden",
    );
    expect(screen.getByText("Dice presets")).toBeTruthy();
    expect(screen.getByText("Resource trackers")).toBeTruthy();

    await fireEvent.click(
      screen.getByRole("button", { name: "Adventure tools" }),
    );

    expect(screen.getByLabelText("Adventure tools").className).not.toContain(
      "hidden",
    );
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
});
