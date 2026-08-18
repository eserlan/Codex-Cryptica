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
const originalFullscreenElement = Object.getOwnPropertyDescriptor(
  document,
  "fullscreenElement",
);

function props() {
  return {
    manager: manager(),
    existingTitles: [],
    onAddProvisionalFact: vi.fn(),
    repository,
    vaultId: "vault-1",
    onResume: vi.fn(),
    onResumeArchived: vi.fn(),
  };
}

async function enterFocusMode() {
  await fireEvent.click(
    screen.getByRole("button", { name: "Enter Focus Mode" }),
  );
  return screen.getByTestId("adventure-focus-mode");
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
  it("keeps the ordinary adventure layout until the player enters Focus Mode", async () => {
    render(AdventureFocusPlay, {
      props: props(),
    });

    expect(screen.queryByTestId("adventure-focus-mode")).toBeNull();

    await enterFocusMode();

    expect(screen.getByTestId("adventure-focus-mode")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Adventure tools" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("can collapse utility panels without hiding the active play column", async () => {
    render(AdventureFocusPlay, {
      props: props(),
    });

    await enterFocusMode();
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

  it("opens the tools drawer from the ordinary adventure layout", async () => {
    render(AdventureFocusPlay, { props: props() });

    expect(screen.queryByTestId("adventure-tools-drawer")).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: "Tools" }));

    expect(screen.getByTestId("adventure-tools-drawer")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Close adventure tools" }),
    ).toBeTruthy();
  });

  it("keeps Focus Mode open when fullscreen is denied", async () => {
    render(AdventureFocusPlay, { props: props() });
    const focusMode = await enterFocusMode();
    Object.assign(focusMode, {
      requestFullscreen: vi.fn().mockRejectedValue(new Error("denied")),
    });

    await fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));

    await waitFor(() => {
      expect(screen.getByTestId("adventure-focus-mode")).toBeTruthy();
    });
  });

  it("keeps Focus Mode open when Escape exits browser fullscreen", async () => {
    render(AdventureFocusPlay, { props: props() });
    const focusMode = await enterFocusMode();
    let fullscreenElement: Element | null = null;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.assign(focusMode, {
      requestFullscreen: vi.fn().mockImplementation(async () => {
        fullscreenElement = focusMode;
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
      expect(screen.getByTestId("adventure-focus-mode")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Fullscreen" })).toBeTruthy();
    });
  });

  it("ignores repeated fullscreen requests while a transition is pending", async () => {
    render(AdventureFocusPlay, { props: props() });
    const focusMode = await enterFocusMode();
    let resolveFullscreen: (() => void) | undefined;
    const requestFullscreen = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFullscreen = resolve;
        }),
    );
    Object.assign(focusMode, { requestFullscreen });

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
