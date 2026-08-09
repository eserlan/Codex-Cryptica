import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import RoutePage from "./+page.svelte";
import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

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
    modalUIStore.showSettings = false;
    modalUIStore.showDiceModal = false;
    modalUIStore.closeQuickStartModal();
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
    // The "Welcome to Codex Cryptica" eyebrow and the
    // "RPG Campaign Manager & Worldbuilding Tool" subheading were removed: the
    // header wordmark already names the product, and those keywords live in
    // <title> and the meta description rather than needing a third statement
    // on screen.
    expect(screen.queryByText("Welcome to Codex Cryptica")).toBeNull();
    expect(
      screen.queryByRole("heading", {
        name: /rpg campaign manager & worldbuilding tool/i,
      }),
    ).toBeNull();
    expect(screen.getByText(/private markdown notes/i)).toBeTruthy();
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
        /quick start generates a ready-to-explore world in seconds/i,
      ),
    ).toBeTruthy();
    expect(screen.getByText("Local-first vault")).toBeTruthy();
    expect(screen.getByText("Spatial lore graph")).toBeTruthy();
    expect(screen.getByText("Optional AI")).toBeTruthy();
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

  it("opens Quick Start (not the blank vault switcher) from the welcome page's primary create action", async () => {
    onboardingStore.skipWelcomeScreen = false;
    onboardingStore.dismissedLandingPage = false;

    render(RoutePage);

    expect(modalUIStore.showQuickStartModal).toBe(false);
    await fireEvent.click(screen.getByTestId("welcome-quick-start-button"));

    // Quick Start itself is mounted once, globally, via GlobalModalProvider —
    // not by this page — so we assert the shared trigger flag here.
    expect(modalUIStore.showQuickStartModal).toBe(true);
    expect(onboardingStore.dismissedLandingPage).toBe(true);
  });

  it("opens Quick Start from the Living Lore Graph preview card too", async () => {
    onboardingStore.skipWelcomeScreen = false;
    onboardingStore.dismissedLandingPage = false;

    render(RoutePage);

    await fireEvent.click(screen.getByTestId("welcome-preview-button"));

    expect(modalUIStore.showQuickStartModal).toBe(true);
    expect(onboardingStore.dismissedLandingPage).toBe(true);
  });
});
