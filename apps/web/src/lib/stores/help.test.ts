import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
}));

import { HelpStore } from "./help.svelte";
import { HELP_ARTICLES } from "#lib/config/help-articles.js";
import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";

describe("HelpStore", () => {
  let mockStorage: any;
  let helpStore: HelpStore;

  beforeEach(async () => {
    mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    helpStore = new HelpStore(undefined, undefined, undefined, mockStorage);
    await helpStore.init();
    await helpStore.ensureArticles();
    helpStore.reset();
  });

  it("loads article data only when Help asks for it", async () => {
    const loader = vi.fn().mockResolvedValue(HELP_ARTICLES);
    const store = new HelpStore(
      undefined,
      undefined,
      undefined,
      mockStorage,
      loader,
    );
    await store.init();

    expect(loader).not.toHaveBeenCalled();
    await store.ensureArticles();
    await store.ensureArticles();
    expect(loader).toHaveBeenCalledOnce();
  });

  it("allows article loading to retry after a failed lazy import", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("Help chunk unavailable"))
      .mockResolvedValueOnce(HELP_ARTICLES);
    const store = new HelpStore(
      undefined,
      undefined,
      undefined,
      mockStorage,
      loader,
    );

    await expect(store.ensureArticles()).rejects.toThrow(
      "Help chunk unavailable",
    );
    await expect(store.ensureArticles()).resolves.toBe(HELP_ARTICLES);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("selects a known article immediately while its body chunk loads", async () => {
    let resolveArticles!: (articles: typeof HELP_ARTICLES) => void;
    const loader = vi.fn(
      () =>
        new Promise<typeof HELP_ARTICLES>((resolve) => {
          resolveArticles = resolve;
        }),
    );
    const store = new HelpStore(
      undefined,
      undefined,
      undefined,
      mockStorage,
      loader,
    );

    const selection = store.selectArticle("intro");
    expect(store.articlesLoading).toBe(true);
    expect(selection).toBe(true);
    expect(store.expandedId).toBe("intro");
    resolveArticles(HELP_ARTICLES);

    await store.ensureArticles();
    expect(store.expandedId).toBe("intro");
    expect(store.articlesError).toBeNull();
  });

  it("keeps known direct selection open when article loading fails and retries", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("Help chunk unavailable"))
      .mockResolvedValueOnce(HELP_ARTICLES);
    const store = new HelpStore(
      undefined,
      undefined,
      undefined,
      mockStorage,
      loader,
    );

    expect(store.selectArticle("intro")).toBe(true);
    expect(store.expandedId).toBe("intro");
    await expect(store.ensureArticles()).rejects.toThrow(
      "Help chunk unavailable",
    );
    expect(store.articlesError).toBe("Help chunk unavailable");
    await expect(store.ensureArticles()).resolves.toBe(HELP_ARTICLES);
    expect(store.articlesError).toBeNull();
  });

  it("should support constructor injection for UI, Search, and Storage stores", () => {
    const mockOnboardingStore = {
      dismissedLandingPage: false,
    } as any;
    const mockModalUIStore = { closeSettings: vi.fn() } as any;
    const mockSearchStore = { open: vi.fn() } as any;
    const customMockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as any;

    const store = new HelpStore(
      mockOnboardingStore,
      mockModalUIStore,
      mockSearchStore,
      customMockStorage,
    );

    // Test that it uses the injected UI store
    store.startTour("initial-onboarding");
    expect(mockOnboardingStore.dismissedLandingPage).toBe(true);
    expect(mockModalUIStore.closeSettings).toHaveBeenCalled();

    // Test that it uses the injected storage
    store.completeTour();
    expect(customMockStorage.setItem).toHaveBeenCalledWith(
      "codex-cryptica-help-state",
      expect.stringContaining("initial-onboarding"),
    );
  });

  it("should initialize with all help articles", () => {
    expect(helpStore.searchResults).toHaveLength(HELP_ARTICLES.length);
  });

  it("should search articles by title", () => {
    helpStore.setSearchQuery("Graph");
    expect(helpStore.searchResults.some((a) => a.title.includes("Graph"))).toBe(
      true,
    );
  });

  it("should search articles by a word prefix", () => {
    helpStore.setSearchQuery("fam");
    expect(helpStore.searchResults.some((a) => a.id === "family-tree")).toBe(
      true,
    );
  });

  it("should search articles by content", () => {
    helpStore.setSearchQuery("sovereignty");
    expect(helpStore.searchResults.some((a) => a.id === "intro")).toBe(true);
  });

  it("should return empty array for no matches", () => {
    helpStore.setSearchQuery("nonexistent-protocol");
    expect(helpStore.searchResults).toHaveLength(0);
  });

  it("should manage tour lifecycle (next, prev, skip, complete)", () => {
    // The tour prunes steps whose target is missing from the DOM (#1778), so
    // mount the ActivityBar targets the onboarding tour points at.
    const ids = [
      "graph-empty-state-cta",
      "activity-bar-graph",
      "activity-bar-oracle",
    ];
    ids.forEach((id) => {
      const el = document.createElement("div");
      el.setAttribute("data-testid", id);
      document.body.appendChild(el);
    });

    try {
      helpStore.startTour("initial-onboarding");
      expect(helpStore.activeTour).toBeDefined();
      expect(helpStore.activeTour?.currentStepIndex).toBe(0);

      helpStore.nextStep();
      expect(helpStore.activeTour?.currentStepIndex).toBe(1);

      helpStore.prevStep();
      expect(helpStore.activeTour?.currentStepIndex).toBe(0);

      helpStore.skipTour();
      expect(helpStore.activeTour).toBeNull();
      expect(helpStore.hasSeen("initial-onboarding")).toBe(true);
    } finally {
      ids.forEach((id) =>
        document.querySelector(`[data-testid="${id}"]`)?.remove(),
      );
    }
  });

  it("pruneStepsToDom keeps body steps and drops steps with missing targets (#1778)", () => {
    const steps = [
      { id: "welcome", targetSelector: "body" } as any,
      { id: "present", targetSelector: '[data-testid="present-el"]' } as any,
      { id: "absent", targetSelector: '[data-testid="absent-el"]' } as any,
    ];
    const doc = {
      querySelector: (sel: string) =>
        sel === '[data-testid="present-el"]' ? ({} as Element) : null,
    };

    const pruned = helpStore.pruneStepsToDom(steps, doc);
    expect(pruned.map((s) => s.id)).toEqual(["welcome", "present"]);
  });

  it("startTour marks the tour seen and does not start when no steps resolve (#1778)", () => {
    // No ActivityBar targets are mounted, so only the body 'welcome' step would
    // normally survive — force an all-missing scenario by pruning against an
    // empty document to prove the empty-tour guard.
    vi.spyOn(helpStore, "pruneStepsToDom").mockReturnValue([]);
    helpStore.startTour("initial-onboarding");
    expect(helpStore.activeTour).toBeNull();
    expect(helpStore.hasSeen("initial-onboarding")).toBe(true);
  });

  it("should handle persistence and initialization from injected storage", async () => {
    const savedState = JSON.stringify({
      completedTours: ["test-tour"],
      lastSeenVersion: "0.0.1",
    });
    mockStorage.getItem.mockReturnValue(savedState);

    const store = new HelpStore(undefined, undefined, undefined, mockStorage);
    await store.init();
    expect(store.hasSeen("test-tour")).toBe(true);
  });

  it("should handle help center operations", async () => {
    helpStore.toggleArticle("intro");
    expect((helpStore as any).expandedId).toBe("intro");

    helpStore.toggleArticle("intro");
    expect((helpStore as any).expandedId).toBeNull();

    modalUIStore.openSettings = vi.fn();
    await helpStore.openHelpToArticle("intro");
    expect((helpStore as any).expandedId).toBe("intro");
    expect(modalUIStore.openSettings).toHaveBeenCalledWith("help");
  });

  it("should safely reject an unknown direct Help article", async () => {
    await helpStore.selectArticle("intro");
    expect(helpStore.selectArticle("missing-article")).toBe(false);
    expect((helpStore as any).expandedId).toBeNull();
  });

  it("should open help window", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    helpStore.openHelpWindow();
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.mock.calls[0][0]).toContain("/help");
  });

  it("should copy share link", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText: writeTextSpy },
    });

    await helpStore.copyShareLink("intro");
    expect(writeTextSpy).toHaveBeenCalled();
    expect(writeTextSpy.mock.calls[0][0]).toContain("#help/intro");
  });

  it("should force rebuild index", async () => {
    await helpStore.buildIndex(true);
    // Verify no crash, internal count updated
    expect((helpStore as any).indexedCount).toBe(HELP_ARTICLES.length);
  });

  // T060: in-app generators help article is registered (US5)
  it("in-app-generators help article explains holiday calendar generation", () => {
    const article = HELP_ARTICLES.find((a) => a.id === "in-app-generators");
    expect(article).toBeDefined();
    expect(article!.content).toContain("Holiday & Festival");
    expect(article!.content).toContain("calendar size");
    expect(article!.content).toContain("important people or events");
  });

  it("in-app-generators article is discoverable by search", () => {
    helpStore.setSearchQuery("generator");
    expect(
      helpStore.searchResults.some((a) => a.id === "in-app-generators"),
    ).toBe(true);
  });

  it("vtt-session help article is present in HELP_ARTICLES", () => {
    expect(HELP_ARTICLES.some((a) => a.id === "vtt-session")).toBe(true);
  });

  it("vtt-session article is discoverable by search", () => {
    helpStore.setSearchQuery("vtt session");
    expect(helpStore.searchResults.some((a) => a.id === "vtt-session")).toBe(
      true,
    );
  });
});
