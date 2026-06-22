/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/state", () => ({
  page: {
    url: new URL("http://localhost/"),
  },
}));
vi.mock("$app/navigation", () => ({
  preloadCode: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("$lib/components/layout/AppHeader.svelte", () => ({
  default: function AppHeaderMock() {
    return { $$render: () => "<div data-testid='app-header'></div>" };
  },
}));
vi.mock("$lib/components/layout/AppFooter.svelte", () => ({
  default: function AppFooterMock() {
    return { $$render: () => "<div data-testid='app-footer'></div>" };
  },
}));
vi.mock("$lib/components/layout/NotificationToast.svelte", () => ({
  default: function NotificationToastMock() {
    return { $$render: () => "" };
  },
}));
vi.mock("$lib/components/layout/FatalErrorOverlay.svelte", () => ({
  default: function FatalErrorOverlayMock() {
    return { $$render: () => "" };
  },
}));
vi.mock("$lib/components/layout/ActivityBar.svelte", () => ({
  default: function ActivityBarMock() {
    return { $$render: () => "<div data-testid='activity-bar'></div>" };
  },
}));
vi.mock("$lib/components/layout/SidebarPanelHost.svelte", () => ({
  default: function SidebarPanelHostMock() {
    return { $$render: () => "<div data-testid='sidebar-host'></div>" };
  },
}));
vi.mock("$lib/components/layout/MobileDemoBanner.svelte", () => ({
  default: function MobileDemoBannerMock() {
    return { $$render: () => "" };
  },
}));
vi.mock("$lib/components/modals/GlobalModalProvider.svelte", () => ({
  default: function GlobalModalProviderMock() {
    return { $$render: () => "" };
  },
}));
vi.mock("$lib/components/vtt/GuestSessionBootstrap.svelte", () => ({
  default: function GuestSessionBootstrapMock() {
    return { $$render: () => "" };
  },
}));
vi.mock("$lib/components/quicknote/QuickNoteScratchpad.svelte", () => ({
  default: function QuickNoteScratchpadMock() {
    return { $$render: () => "" };
  },
}));
vi.mock("$lib/components/layout/EntityExplorerWorkspace.svelte", async () => {
  const mod = await import("./__tests__/EntityExplorerWorkspaceStub.svelte");
  return { default: mod.default };
});
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
vi.mock("$lib/stores/search.svelte", () => ({
  searchStore: { isOpen: false },
}));
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isInitialized: true,
    activeVaultId: "v1",
    selectedEntityId: null,
    entities: {},
    allEntities: [],
    status: "idle",
  },
}));
vi.mock("$lib/stores/vault-registry.svelte", () => ({
  vaultRegistry: {},
}));
vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    init: vi.fn().mockResolvedValue(undefined),
    currentThemeId: "workspace",
  },
}));
vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {},
}));
vi.mock("$lib/stores/quicknote.svelte", () => ({
  quickNoteStore: {},
}));
vi.mock("@codex/events", () => ({
  appEventBus: {},
  CrossTabBroadcaster: class {
    destroy() {}
  },
}));
vi.mock("$lib/services/demo", () => ({
  demoService: {
    startDemo: vi.fn(),
  },
}));
vi.mock("$lib/services/gdrive-sync", () => ({
  initGDriveSync: vi.fn(),
}));
vi.mock("$lib/config/help-content", () => ({
  HELP_ARTICLES: [],
}));
vi.mock("$lib/config", () => ({
  VERSION: "0.0.0",
}));
vi.mock("$lib/content/changelog/releases.json", () => ({
  default: [],
}));
vi.mock("schema", () => ({
  THEMES: {},
  isEntityVisible: vi.fn(),
}));
vi.mock("$lib/app/init/app-init", () => ({
  bootSystem: vi.fn(() => true),
  initializeGlobalListeners: vi.fn(() => () => {}),
  setupWindowGlobals: vi.fn(),
  registerServiceWorker: vi.fn(),
}));
vi.mock("$lib/hooks/useGlobalShortcuts.svelte", () => ({
  useGlobalShortcuts: vi.fn(() => vi.fn()),
}));
vi.mock("$lib/stores/ui/onboarding.svelte", () => ({
  onboardingStore: {
    showChangelog: false,
    isLandingPageVisible: false,
    dismissedLandingPage: true,
    dismissedWorldPage: true,
    skipWelcomeScreen: true,
    lastSeenVersion: "0.0.0",
    markVersionAsSeen: vi.fn(),
  },
}));
vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {
    isGuestMode: false,
    isDemoMode: false,
    wasConverted: false,
  },
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    isAnyModalOpen: false,
    showZenMode: false,
    pendingCreateEntity: false,
    showMobileCreateSheet: false,
    closeZenMode: vi.fn(),
    lightbox: { show: false },
  },
}));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    confirmationDialog: { open: false },
  },
}));
vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  discoveryPolicyStore: {},
}));
vi.mock("$lib/stores/ui/connection-mode.svelte", () => ({
  connectionModeStore: {},
}));
vi.mock("$lib/stores/ui/explorer-ui.svelte", () => ({
  explorerUIStore: {},
}));
vi.mock("$lib/stores/world.svelte", () => ({
  worldStore: {},
}));
vi.mock("$lib/stores/canvas-registry.svelte", () => ({
  canvasRegistry: {},
}));
vi.mock("$lib/stores/graph.svelte", () => ({
  graph: {},
}));
vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    init: vi.fn(),
  },
}));
vi.mock("$lib/stores/calendar.svelte", () => ({
  calendarStore: {},
}));

import LayoutTestHost from "./__tests__/LayoutTestHost.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

describe("+layout.svelte", () => {
  beforeAll(() => {
    if (!Element.prototype.animate) {
      Element.prototype.animate = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: vi.fn(),
      }) as any;
    }
    if (!(globalThis as any).requestIdleCallback) {
      (globalThis as any).requestIdleCallback = (cb: () => void) => {
        cb();
        return 1;
      };
    }
    if (!(globalThis as any).ResizeObserver) {
      (globalThis as any).ResizeObserver = class {
        observe() {}
        disconnect() {}
      };
    }
  });

  beforeEach(() => {
    layoutUIStore.leftSidebarOpen = false;
    layoutUIStore.activeSidebarTool = "none";
    layoutUIStore.isWideViewport = false;
    layoutUIStore.focusedEntityId = null;
  });

  it("keeps route content mounted beneath the app shell", () => {
    render(LayoutTestHost);
    expect(screen.getByTestId("layout-children")).toBeTruthy();
  });

  it("shows the Explorer workspace overlay when the desktop workspace is eligible", async () => {
    layoutUIStore.leftSidebarOpen = true;
    layoutUIStore.activeSidebarTool = "explorer";
    layoutUIStore.isWideViewport = true;
    layoutUIStore.focusedEntityId = "entity-1";

    render(LayoutTestHost);
    await tick();

    expect(screen.getByTestId("entity-explorer-workspace").textContent).toBe(
      "entity-1",
    );
    expect(screen.getByTestId("layout-children")).toBeTruthy();
  });

  it("hides the Explorer workspace overlay when Explorer closes or Oracle becomes active", async () => {
    layoutUIStore.leftSidebarOpen = true;
    layoutUIStore.activeSidebarTool = "explorer";
    layoutUIStore.isWideViewport = true;

    render(LayoutTestHost);
    await tick();
    expect(screen.getByTestId("entity-explorer-workspace")).toBeTruthy();

    layoutUIStore.leftSidebarOpen = false;
    await tick();
    expect(screen.queryByTestId("entity-explorer-workspace")).toBeNull();

    layoutUIStore.leftSidebarOpen = true;
    layoutUIStore.activeSidebarTool = "oracle";
    await tick();
    expect(screen.queryByTestId("entity-explorer-workspace")).toBeNull();
  });

  it("shows or hides the overlay once as the viewport crosses the desktop threshold", async () => {
    layoutUIStore.leftSidebarOpen = true;
    layoutUIStore.activeSidebarTool = "explorer";

    render(LayoutTestHost);
    await tick();
    expect(screen.queryByTestId("entity-explorer-workspace")).toBeNull();

    layoutUIStore.isWideViewport = true;
    await tick();
    expect(screen.getByTestId("entity-explorer-workspace")).toBeTruthy();

    layoutUIStore.isWideViewport = false;
    await tick();
    expect(screen.queryByTestId("entity-explorer-workspace")).toBeNull();
  });
});
