import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import RoutePage from "./+page.svelte";
import { onboardingStore } from "#lib/stores/ui/onboarding.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { seoImportService } from "#lib/services/seo/import-handler.js";

vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/"), params: {} },
}));
vi.mock("$app/environment", () => ({ browser: true, building: false }));
vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    isInitialized: true,
    activeVaultId: "v1",
    selectedEntityId: null,
    entities: {},
    isGuest: false,
    status: "idle",
  },
}));
vi.mock("#lib/stores/ui/layout-ui.svelte.js", () => ({
  layoutUIStore: { mainViewMode: "graph", focusedEntityId: null },
}));
vi.mock("#lib/stores/ui/navigation.js", () => ({ focusEntity: vi.fn() }));
vi.mock("#lib/stores/theme.svelte.js", () => ({
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
vi.mock("#lib/services/seo/import-handler.js", () => ({
  seoImportService: {
    checkAndHandlePendingImport: vi.fn(),
    discardPendingImport: vi.fn(),
  },
}));
vi.mock("#lib/services/demo.js", () => ({
  demoService: { startDemo: vi.fn() },
}));
vi.mock("#lib/config/index.js", () => ({
  VERSION: "0.0.0-test",
  SCHEMA_ORG: {},
  DISCORD_URL: "https://discord.gg/5UUMCChF2u",
  REDDIT_URL: "https://www.reddit.com/r/codexcryptica/",
  GITHUB_URL: "https://github.com/eserlan/Codex-Cryptica",
  PATREON_URL: "https://patreon.com/EspenE",
}));

// Stub out the lazily-imported heavy components so dynamic imports resolve instantly
vi.mock("../../lib/components/GraphView.svelte", async () => ({
  default: (await import("./__tests__/GraphViewStub.svelte")).default,
}));
vi.mock("../../lib/components/world/FrontPage.svelte", async () => ({
  default: (await import("./__tests__/FrontPageStub.svelte")).default,
}));
vi.mock("#lib/components/world/FrontPage.svelte", async () => ({
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

const check = vi.mocked(seoImportService.checkAndHandlePendingImport);
const discard = vi.mocked(seoImportService.discardPendingImport);
const failed = { status: "failed", message: "disk full" } as const;

describe("root +page.svelte — pending import feedback", () => {
  beforeAll(() => {
    if (!Element.prototype.animate) {
      Element.prototype.animate = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: vi.fn(),
      }) as any;
    }
  });

  beforeEach(() => {
    check.mockReset();
    discard.mockReset();
    notificationStore.notification = null;
    onboardingStore.dismissedWorldPage = false;
    onboardingStore.dismissedLandingPage = false;
    onboardingStore.skipWelcomeScreen = false;
  });

  it("toasts a single imported draft by title and dismisses the landing page", async () => {
    check.mockResolvedValue({
      status: "imported",
      rootId: "e1",
      count: 1,
      vaultName: "Default Vault",
      rootTitle: "Mira",
    });
    render(RoutePage);

    await waitFor(() =>
      expect(notificationStore.notification?.message).toBe(
        'Added "Mira" to Default Vault',
      ),
    );
    expect(onboardingStore.dismissedLandingPage).toBe(true);
    expect(onboardingStore.dismissedWorldPage).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("toasts the entry count for a batch import", async () => {
    check.mockResolvedValue({
      status: "imported",
      rootId: "e1",
      count: 4,
      vaultName: "Default Vault",
      rootTitle: "Crawl",
    });
    render(RoutePage);

    await waitFor(() =>
      expect(notificationStore.notification?.message).toBe(
        "Added 4 entries to Default Vault",
      ),
    );
  });

  it("shows an error toast and no notice for an unreadable draft", async () => {
    check.mockResolvedValue({ status: "invalid" });
    render(RoutePage);

    await waitFor(() =>
      expect(notificationStore.notification).toMatchObject({
        type: "error",
        message: expect.stringContaining("couldn't be read"),
      }),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onboardingStore.dismissedLandingPage).toBe(false);
  });

  it("shows the failure notice, and Retry success clears it", async () => {
    check.mockResolvedValueOnce(failed);
    render(RoutePage);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());

    check.mockResolvedValueOnce({
      status: "imported",
      rootId: "e1",
      count: 1,
      vaultName: "Default Vault",
      rootTitle: "Mira",
    });
    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(notificationStore.notification?.message).toContain("Mira");
  });

  it("keeps the notice when Retry fails again", async () => {
    check.mockResolvedValue(failed);
    render(RoutePage);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());

    await fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(check).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("Discard removes the draft and hides the notice", async () => {
    check.mockResolvedValue(failed);
    render(RoutePage);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());

    await fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(discard).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
