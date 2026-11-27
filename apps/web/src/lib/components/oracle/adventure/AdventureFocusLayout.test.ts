import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { createRawSnippet, type ComponentProps } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
import AdventureFocusControls from "./AdventureFocusControls.svelte";
import AdventureFocusFullscreenButton from "./AdventureFocusFullscreenButton.svelte";
import AdventureFocusHeader from "./AdventureFocusHeader.svelte";
import AdventureFocusTools from "./AdventureFocusTools.svelte";
import AdventureFocusScene from "./AdventureFocusScene.svelte";
import AdventureFocusStory from "./AdventureFocusStory.svelte";
import { AdventureFocusCompletion } from "./adventure-focus-completion.svelte.js";

afterEach(() => vi.unstubAllGlobals());

function manager(overrides: Partial<AdventureManager> = {}): AdventureManager {
  return {
    session: null,
    phase: "ready",
    readOnly: false,
    recap: null,
    rollHistory: [],
    draft: "Wait by the gate",
    suggestedActions: [],
    transcript: null,
    errorMessage: null,
    lastRollResult: null,
    submitAction: vi.fn(),
    cancel: vi.fn(),
    close: vi.fn(),
    dismissDiscoveries: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as AdventureManager;
}

function placement(name: string) {
  return createRawSnippet<[boolean]>((inToolsSheet) => ({
    render: () => `<span data-testid="${name}">${inToolsSheet()}</span>`,
  }));
}

function snippets() {
  return {
    controls: placement("controls"),
    fullscreenControl: placement("fullscreen"),
    management: placement("management"),
  };
}

describe("AdventureFocusHeader", () => {
  function props(phone: boolean): ComponentProps<typeof AdventureFocusHeader> {
    return {
      manager: manager(),
      existingTitles: [],
      phone,
      adventureTitle: "The Drowned March",
      toolsOpen: false,
      onToggleTools: vi.fn(),
      ...snippets(),
    };
  }

  it("renders desktop controls and forwards the leave and tools actions", async () => {
    const options = props(false);
    render(AdventureFocusHeader, options);
    expect(screen.getByTestId("controls").textContent).toBe("false");
    expect(screen.getByTestId("fullscreen").textContent).toBe("false");
    expect(screen.getByTestId("management").textContent).toBe("false");
    await fireEvent.click(
      screen.getByRole("button", { name: "Leave adventure" }),
    );
    expect(options.manager.close).toHaveBeenCalledOnce();
    await fireEvent.click(
      screen.getByRole("button", { name: "Adventure tools" }),
    );
    expect(options.onToggleTools).toHaveBeenCalledOnce();
  });

  it("keeps desktop commands out of the phone header and announces a read-only state", () => {
    const options = props(true);
    options.manager.readOnly = true;
    render(AdventureFocusHeader, options);
    expect(screen.queryByTestId("controls")).toBeNull();
    expect(screen.queryByTestId("fullscreen")).toBeNull();
    expect(screen.queryByTestId("management")).toBeNull();
    expect(screen.getByTestId("adventure-header-status").textContent).toContain(
      "Read-only",
    );
    expect(
      screen
        .getByTestId("adventure-phone-live-status")
        .getAttribute("aria-live"),
    ).toBe("polite");
  });
});

describe("AdventureFocusScene", () => {
  function props(): ComponentProps<typeof AdventureFocusScene> {
    const activeManager = manager({
      session: {} as NonNullable<AdventureManager["session"]>,
      recap: {
        location: { id: "road", text: "The lantern road" },
        situation: { id: "ward", text: "The ward is failing" },
        objectives: [],
        activeCharacters: [],
        knownFacts: [],
        recentTurnSummaries: [],
      } as unknown as NonNullable<AdventureManager["recap"]>,
    });
    return {
      manager: activeManager,
      artwork: { flagEnabled: false, portrait: null } as ComponentProps<
        typeof AdventureFocusScene
      >["artwork"],
    };
  }

  it.each(["strip", "panel"] as const)(
    "shows the scene in the %s slot without artwork",
    (variant) => {
      render(AdventureFocusScene, { ...props(), variant });
      expect(
        screen.getByTestId("adventure-scene-location").textContent,
      ).toContain("The lantern road");
      expect(screen.queryByRole("img")).toBeNull();
      expect(
        screen.getByTestId(
          variant === "strip"
            ? "adventure-scene-strip-wrap"
            : "adventure-artwork-panel",
        ),
      ).toBeTruthy();
    },
  );

  it.each(["session", "recap"] as const)(
    "does not mount a scene when %s is missing",
    (missing) => {
      const options = props();
      options.manager = manager({
        session: options.manager.session,
        recap: options.manager.recap,
        [missing]: null,
      });
      render(AdventureFocusScene, options);
      expect(screen.queryByTestId("adventure-scene-strip-wrap")).toBeNull();
      expect(screen.queryByTestId("adventure-artwork-panel")).toBeNull();
    },
  );
});

describe("AdventureFocusStory", () => {
  function props(
    activeManager: AdventureManager,
  ): ComponentProps<typeof AdventureFocusStory> {
    return {
      manager: activeManager,
      completion: new AdventureFocusCompletion(() => activeManager, vi.fn()),
      phone: false,
      keyboardOpen: false,
    };
  }

  it("follows generation while keeping the composer mounted outside the transcript", async () => {
    const options = props(manager());
    const { rerender } = render(AdventureFocusStory, options);
    const viewport = screen.getByTestId("adventure-play-viewport");
    const composer = screen.getByLabelText("What do you do?");
    const scrollTo = vi.fn();
    Object.defineProperty(viewport, "scrollTo", { value: scrollTo });
    Object.defineProperty(viewport, "scrollHeight", { value: 750 });
    expect(viewport.contains(composer)).toBe(false);
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    scrollTo.mockClear();
    await rerender({
      ...options,
      manager: manager({
        phase: "generating",
        streamedNarration: "Water rises at the gate.",
      }),
    });
    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 750, behavior: "smooth" }),
    );
    expect(screen.getByLabelText("What do you do?")).toBe(composer);
  });

  it("avoids smooth scrolling when reduced motion is requested", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    render(AdventureFocusStory, props(manager()));
    const viewport = screen.getByTestId("adventure-play-viewport");
    const scrollTo = vi.fn();
    Object.defineProperty(viewport, "scrollTo", { value: scrollTo });
    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" }),
    );
  });
});

describe("AdventureFocusFullscreenButton", () => {
  it.each([false, true])(
    "forwards fullscreen requests in sheet placement %s",
    async (inToolsSheet) => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(AdventureFocusFullscreenButton, {
        inToolsSheet,
        active: false,
        busy: false,
        onToggle,
      });
      const button = screen.getByRole("button", { name: "Fullscreen" });
      expect(button.getAttribute("aria-pressed")).toBe("false");
      await fireEvent.click(button);
      expect(onToggle).toHaveBeenCalledOnce();
    },
  );

  it("disables additional requests during a fullscreen transition", async () => {
    const onToggle = vi.fn();
    render(AdventureFocusFullscreenButton, {
      active: true,
      busy: true,
      onToggle,
    });
    const button = screen.getByRole("button", {
      name: "Fullscreen active",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    button.click();
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe("AdventureFocusControls", () => {
  function props(
    readOnly: boolean,
  ): ComponentProps<typeof AdventureFocusControls> {
    const activeManager = manager();
    activeManager.readOnly = readOnly;
    activeManager.session = {
      provisionalFacts: [
        {
          id: "barrow-1",
          kind: "place",
          name: "Sunken Barrow",
          summary: "Flooded crypts.",
          introducedOnTurnId: "t1",
          visibility: "player-visible",
        },
      ],
      dismissedProvisionalFactIds: [],
    } as unknown as NonNullable<AdventureManager["session"]>;
    return {
      manager: activeManager,
      existingTitles: [],
      onAddProvisionalFact: vi.fn(),
      inToolsSheet: true,
    };
  }

  it("forwards an approved discovery to the parent save callback", async () => {
    const options = props(false);
    render(AdventureFocusControls, options);
    await fireEvent.click(
      screen.getByRole("button", { name: "Review 1 adventure discovery" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Add Sunken Barrow to Codex" }),
    );
    expect(options.onAddProvisionalFact).toHaveBeenCalledWith(
      options.manager.session?.provisionalFacts[0],
    );
  });

  it("disables discovery dismissal for a read-only adventure", async () => {
    const options = props(true);
    render(AdventureFocusControls, options);
    await fireEvent.click(
      screen.getByRole("button", { name: "Review 1 adventure discovery" }),
    );
    const dismiss = screen.getByRole("button", {
      name: "Discard Sunken Barrow suggestion",
    }) as HTMLButtonElement;
    expect(dismiss.disabled).toBe(true);
    dismiss.click();
    expect(options.manager.dismissDiscoveries).not.toHaveBeenCalled();
  });
});

describe("AdventureFocusTools", () => {
  function props(phone: boolean): ComponentProps<typeof AdventureFocusTools> {
    return {
      manager: manager(),
      repository: {} as ComponentProps<
        typeof AdventureFocusTools
      >["repository"],
      vaultId: "vault-1",
      onResume: vi.fn(),
      onResumeArchived: vi.fn(),
      listAdventureSessions: vi.fn().mockResolvedValue({ entries: [] }),
      phone,
      adventureTitle: "The Drowned March",
      artwork: { flagEnabled: false, cueSummary: null } as ComponentProps<
        typeof AdventureFocusTools
      >["artwork"],
      onClose: vi.fn(),
      ...snippets(),
    };
  }

  it("includes phone commands in the sheet and closes from either control", async () => {
    const options = props(true);
    render(AdventureFocusTools, options);
    const sheet = screen.getByRole("complementary", {
      name: "Adventure tools",
    });
    expect(within(sheet).getByText("The Drowned March")).toBeTruthy();
    expect(screen.getByTestId("controls").textContent).toBe("true");
    expect(screen.getByTestId("fullscreen").textContent).toBe("true");
    expect(screen.getByTestId("management").textContent).toBe("true");
    for (const button of screen.getAllByRole("button", {
      name: "Close adventure tools",
    })) {
      await fireEvent.click(button);
    }
    expect(options.onClose).toHaveBeenCalledTimes(2);
  });

  it("omits phone-only commands and artwork settings when disabled", () => {
    render(AdventureFocusTools, props(false));
    expect(screen.queryByTestId("adventure-tools-mobile-controls")).toBeNull();
    expect(screen.queryByTestId("controls")).toBeNull();
    expect(screen.queryByLabelText("Illustrations")).toBeNull();
  });
});
