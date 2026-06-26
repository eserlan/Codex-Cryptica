import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import RoutePage from "./+page.svelte";
import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
import { helpStore } from "$lib/stores/help.svelte";

vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/"), params: {} },
}));
vi.mock("$app/environment", () => ({ browser: true, building: false }));
vi.mock("$app/paths", () => ({ base: "" }));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isInitialized: true,
    activeVaultId: "v1",
    selectedEntityId: null,
    entities: {},
    isGuest: false,
    status: "idle",
  },
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { showSettings: false, showDiceModal: false },
}));
vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: { mainViewMode: "graph", focusedEntityId: null },
}));
vi.mock("$lib/stores/ui/navigation", () => ({ focusEntity: vi.fn() }));
vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    resolveJargon: (k: string) => k,
    activeTheme: {
      tokens: {
        background: "#000000",
        primary: "#ffffff",
        surface: "#111111",
      },
    },
  },
}));
vi.mock("$lib/services/demo", () => ({ demoService: { startDemo: vi.fn() } }));
vi.mock("$lib/config", () => ({ SCHEMA_ORG: {} }));
vi.mock("$lib/stores/help.svelte", () => ({
  helpStore: {
    init: vi.fn(),
    isInitialized: false,
    hasSeen: vi.fn(() => true),
    activeTour: null,
    openHelpToArticle: vi.fn(),
    startTour: vi.fn(),
  },
}));

// Stub out the lazily-imported heavy components so dynamic imports resolve instantly
vi.mock("../../lib/components/GraphView.svelte", async () => ({
  default: (await import("./__tests__/GraphViewStub.svelte")).default,
}));
vi.mock("../../lib/components/world/FrontPage.svelte", async () => ({
  default: (await import("./__tests__/FrontPageStub.svelte")).default,
}));
vi.mock("$lib/components/world/FrontPage.svelte", async () => ({
  default: (await import("./__tests__/FrontPageStub.svelte")).default,
}));
vi.mock("../../lib/components/EntityDetailPanel.svelte", async () => ({
  default: (await import("./__tests__/EntityDetailPanelStub.svelte")).default,
}));
vi.mock("../../lib/components/entity/EmbeddedEntityView.svelte", async () => ({
  default: (await import("./__tests__/EmbeddedEntityViewStub.svelte")).default,
}));
vi.mock("../../lib/components/guest/GuestChatPanel.svelte", async () => ({
  default: (await import("./__tests__/EmbeddedEntityViewStub.svelte")).default, // reusing a stub
}));

describe("root +page.svelte — front page overlay keydown", () => {
  beforeAll(() => {
    // jsdom doesn't implement the Web Animations API used by Svelte transitions
    if (!Element.prototype.animate) {
      Element.prototype.animate = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: vi.fn(),
      }) as any;
    }
  });

  beforeEach(() => {
    onboardingStore.dismissedWorldPage = false;
    onboardingStore.skipWelcomeScreen = true;
    onboardingStore.dismissedLandingPage = true;
  });

  it("presents the root landing page as a private local-first RPG vault", () => {
    onboardingStore.skipWelcomeScreen = false;
    onboardingStore.dismissedLandingPage = false;

    render(RoutePage);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /private rpg lore vault/i,
      }),
    ).toBeTruthy();
    expect(screen.getByText("Welcome to Codex Cryptica")).toBeTruthy();
    expect(screen.getByText(/local-first campaign manager/i)).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: /living lore graph/i }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /see how characters, factions, secrets, and places connect/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /opens a prebuilt sample world instantly\. no setup required\./i,
      ),
    ).toBeTruthy();
    expect(screen.getByText("Local-first vault")).toBeTruthy();
    expect(screen.getByText("Spatial lore graph")).toBeTruthy();
    expect(screen.getByText("Optional AI")).toBeTruthy();
  });

  it("renders the Getting Started guide button and link, and handles click", async () => {
    onboardingStore.skipWelcomeScreen = false;
    onboardingStore.dismissedLandingPage = false;

    render(RoutePage);

    const guideBtn = screen.getByTestId("welcome-guide-button");
    const guideLink = screen.getByTestId("welcome-guide-link");

    expect(guideBtn).toBeTruthy();
    expect(guideLink).toBeTruthy();

    const spy = vi.spyOn(helpStore, "openHelpToArticle");

    await fireEvent.click(guideBtn);
    expect(spy).toHaveBeenCalledWith("intro");

    spy.mockClear();
    await fireEvent.click(guideLink);
    expect(spy).toHaveBeenCalledWith("intro");
  });

  it("sizes the app route shell to its parent instead of recomputing viewport height", () => {
    render(RoutePage);

    const routeShell = screen.getByTestId("app-route-shell");
    expect(routeShell.className).toContain("h-full");
    expect(routeShell.className).toContain("min-h-0");
    expect(routeShell.className).not.toContain("app-content-height");
  });

  it("dismisses the overlay when Space is pressed directly on the overlay", async () => {
    render(RoutePage);
    const overlay = await waitFor(() =>
      screen.getByTestId("front-page-overlay"),
    );
    fireEvent.keyDown(overlay, { key: " " });
    expect(onboardingStore.dismissedWorldPage).toBe(true);
  });

  it("does NOT dismiss when Space is typed inside a textarea", () => {
    render(RoutePage);
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    fireEvent.keyDown(textarea, { key: " " });
    expect(onboardingStore.dismissedWorldPage).toBe(false);
    textarea.remove();
  });

  it("does NOT dismiss when Space is typed inside an input", () => {
    render(RoutePage);
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: " " });
    expect(onboardingStore.dismissedWorldPage).toBe(false);
    input.remove();
  });

  it("does NOT dismiss when Space is typed inside a contenteditable element", () => {
    render(RoutePage);
    const div = document.createElement("div");
    div.contentEditable = "true";
    document.body.appendChild(div);
    fireEvent.keyDown(div, { key: " " });
    expect(onboardingStore.dismissedWorldPage).toBe(false);
    div.remove();
  });

  it("dismisses on Escape via the window keydown handler", () => {
    render(RoutePage);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onboardingStore.dismissedWorldPage).toBe(true);
  });
});
