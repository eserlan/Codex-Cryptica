<script lang="ts">
  import "../../app.css";
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { onMount, onDestroy } from "svelte";
  import { preloadCode } from "$app/navigation";

  // Stores
  import { helpStore } from "$lib/stores/help.svelte";
  import { searchStore } from "$lib/stores/search.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { quickNoteStore } from "$lib/stores/quicknote.svelte";
  import { appEventBus, CrossTabBroadcaster } from "@codex/events";
  import { demoService } from "$lib/services/demo";
  import { initGDriveSync } from "$lib/services/gdrive-sync";
  import { HELP_ARTICLES } from "$lib/config/help-content";
  import { VERSION } from "$lib/config";
  import releases from "$lib/content/changelog/releases.json";
  import { THEMES, isEntityVisible } from "schema";

  // Components & Providers
  import AppHeader from "$lib/components/layout/AppHeader.svelte";
  import AppFooter from "$lib/components/layout/AppFooter.svelte";
  import NotificationToast from "$lib/components/layout/NotificationToast.svelte";
  import FatalErrorOverlay from "$lib/components/layout/FatalErrorOverlay.svelte";
  import ActivityBar from "$lib/components/layout/ActivityBar.svelte";
  import SidebarPanelHost from "$lib/components/layout/SidebarPanelHost.svelte";
  import MobileDemoBanner from "$lib/components/layout/MobileDemoBanner.svelte";
  import GlobalModalProvider from "$lib/components/modals/GlobalModalProvider.svelte";
  import GuestSessionBootstrap from "$lib/components/vtt/GuestSessionBootstrap.svelte";
  import QuickNoteScratchpad from "$lib/components/quicknote/QuickNoteScratchpad.svelte";
  import EntityExplorerWorkspace from "$lib/components/layout/EntityExplorerWorkspace.svelte";
  import NavigationShortcuts from "$lib/components/layout/NavigationShortcuts.svelte";

  // Logic & Hooks
  import {
    bootSystem,
    initializeGlobalListeners,
    setupWindowGlobals,
    registerServiceWorker,
  } from "$lib/app/init/app-init";
  import { useGlobalShortcuts } from "$lib/hooks/useGlobalShortcuts.svelte";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";
  import { worldStore } from "$lib/stores/world.svelte";

  let { children } = $props();

  // State
  let isMobileMenuOpen = $state(false);
  let hasBooted = $state(false);
  let lastDemoQueryParam: string | null = null;
  let headerEl = $state<HTMLElement>();
  let globalListenersCleanup: (() => void) | null = null;
  let crossTabBroadcaster: InstanceType<typeof CrossTabBroadcaster> | null =
    null;
  let mapSession = $state<any>(null);
  let VTTSharedImageLightbox = $state<any>(null);

  // Derived
  const isPopup = $derived(
    page.url.pathname === `${base}/oracle` ||
      page.url.pathname === `${base}/help` ||
      page.url.pathname === `${base}/import`,
  );
  const anyModalOpen = $derived(
    modalUIStore.isAnyModalOpen ||
      searchStore.isOpen ||
      notificationStore.confirmationDialog.open ||
      onboardingStore.showChangelog ||
      isMobileMenuOpen,
  );
  const isZenPopout = $derived(
    /\/vault\/[^/]+\/entity\/[^/]+$/.test(page.url.pathname),
  );
  const isVttFullscreen = $derived(
    page.url.pathname.startsWith(`${base}/map`) && !!mapSession?.vttEnabled,
  );
  const isEntityExplorerWorkspace = $derived(
    !isPopup &&
      !isVttFullscreen &&
      !isZenPopout &&
      layoutUIStore.isEntityExplorerWorkspace,
  );

  if (browser) {
    const requestedTheme = page.url.searchParams.get("theme");
    if (requestedTheme && requestedTheme in THEMES) {
      themeStore.currentThemeId = requestedTheme;
    }

    // Strip funnel tracking params — defer so the CF beacon fires first
    const trackingParams = ["ref", "utm_source", "utm_medium", "utm_campaign"];
    if (trackingParams.some((p) => page.url.searchParams.has(p))) {
      const clean = new URL(page.url);
      trackingParams.forEach((p) => clean.searchParams.delete(p));
      requestIdleCallback(
        () => history.replaceState(history.state, "", clean.toString()),
        { timeout: 3000 },
      );
    }
  }

  onDestroy(() => {
    crossTabBroadcaster?.destroy();
    crossTabBroadcaster = null;
  });

  // Set up global listeners BEFORE bootSystem to avoid missing vault-switched events
  $effect(() => {
    if (browser && !globalListenersCleanup) {
      globalListenersCleanup = initializeGlobalListeners();
    }
  });

  $effect(() => {
    if (!browser) return;

    if (
      page.url.pathname.startsWith(`${base}/map`) ||
      sessionModeStore.isGuestMode
    ) {
      import("$lib/stores/map-session.svelte").then((m) => {
        mapSession = m.mapSession;
      });
      import("$lib/components/vtt/VTTSharedImageLightbox.svelte").then((m) => {
        VTTSharedImageLightbox = m.default;
      });
    }
  });

  // Initialization Logic
  $effect(() => {
    // This layout only serves workspace routes — always boot except on landing page
    const isLandingPage = page.url.pathname === `${base}/`;
    const shouldShowLanding = onboardingStore.isLandingPageVisible;

    if (!hasBooted) {
      if (!isLandingPage || !shouldShowLanding || isPopup) {
        hasBooted = bootSystem({
          categories,
          vault,
          sessionModeStore,
        });
      }
    }
  });

  onMount(() => {
    (async () => {
      helpStore.init();
      await themeStore.init();
      void initGDriveSync();

      // Preload heavy route chunks so first navigation is instant
      preloadCode(`${base}/canvas`).catch(() => {});
      preloadCode(`${base}/map`).catch(() => {});

      registerServiceWorker();

      if (browser) {
        crossTabBroadcaster = new CrossTabBroadcaster(appEventBus);
      }

      console.log("[Layout] Calling setupWindowGlobals");
      const featureGlobals = await loadFeatureWindowGlobals();

      setupWindowGlobals({
        searchStore,
        vault,
        vaultRegistry,
        helpStore,
        categories,
        onboardingStore,
        sessionModeStore,
        notificationStore,
        layoutUIStore,
        modalUIStore,
        discoveryPolicyStore,
        connectionModeStore,
        explorerUIStore,
        isEntityVisible,
        eventBus: appEventBus,
        ...featureGlobals,
      });

      if (import.meta.env.DEV || import.meta.env.VITE_STAGING === "true") {
        (window as any).worldStore = worldStore;
        void featureGlobals.oracle?.init();
      }
    })();
  });

  async function loadFeatureWindowGlobals() {
    const isSpecialEnv =
      import.meta.env.DEV || import.meta.env.VITE_STAGING === "true";

    if (!isSpecialEnv) return {};

    const [{ canvasRegistry }, { graph }, { oracle }, { calendarStore }] =
      await Promise.all([
        import("$lib/stores/canvas-registry.svelte"),
        import("$lib/stores/graph.svelte"),
        import("$lib/stores/oracle.svelte"),
        import("$lib/stores/calendar.svelte"),
      ]);

    return { canvasRegistry, graph, oracle, calendarStore };
  }

  // Help Hash Navigation
  $effect(() => {
    if (!helpStore.isInitialized) return;
    const hash = page.url.hash;
    if (hash && hash.startsWith("#help/")) {
      const articleId = hash.replace("#help/", "");
      if (articleId) {
        const exists = HELP_ARTICLES.some(
          (article) => article.id === articleId,
        );
        if (exists) {
          setTimeout(() => {
            helpStore.openHelpToArticle(articleId);
          }, 100);
        }
      }
    }
  });

  // Demo Logic
  $effect(() => {
    const demoTheme = page.url.searchParams.get("demo");
    if (!demoTheme || demoTheme === lastDemoQueryParam) return;
    lastDemoQueryParam = demoTheme;
    if (!sessionModeStore.wasConverted) {
      demoService.startDemo(demoTheme);
    }
  });

  // Header Height CSS Var
  $effect(() => {
    if (!browser) return;

    if (isVttFullscreen || !headerEl) {
      document.documentElement.style.setProperty("--header-height", "0px");
      return;
    }

    if (headerEl) {
      const updateHeight = () => {
        if (!headerEl) return;
        const height = headerEl.getBoundingClientRect().height;
        document.documentElement.style.setProperty(
          "--header-height",
          `${height}px`,
        );
      };
      updateHeight();
      const observer = new ResizeObserver(updateHeight);
      observer.observe(headerEl);
      return () => observer.disconnect();
    }
  });

  // Automatic Tour/Demo Trigger
  $effect(() => {
    if (vault.isInitialized && !onboardingStore.isLandingPageVisible) {
      if (
        !helpStore.hasSeen("initial-onboarding") &&
        !page.url.searchParams.has("demo")
      ) {
        if (
          vault.allEntities.length === 0 &&
          !sessionModeStore.isDemoMode &&
          !onboardingStore.dismissedLandingPage
        ) {
          demoService.startDemo("fantasy");
        } else {
          helpStore.startTour("initial-onboarding");
        }
      }
    }
  });

  // Automatic Release Note Trigger
  $effect(() => {
    if (
      browser &&
      !onboardingStore.showChangelog &&
      !sessionModeStore.isDemoMode &&
      !onboardingStore.isLandingPageVisible
    ) {
      const lastSeenStr = onboardingStore.lastSeenVersion;

      // First-time user: no changelog popup, silently mark latest known release as seen
      if (!lastSeenStr) {
        onboardingStore.markVersionAsSeen(releases[0]?.version ?? VERSION);
        return;
      }

      const currentStoredMinor = parseInt(lastSeenStr.split(".")[1] || "0", 10);
      const hasUnseenMinorRelease = releases.some((r) => {
        const releaseMinor = parseInt(r.version.split(".")[1] || "0", 10);
        return releaseMinor > currentStoredMinor;
      });

      if (hasUnseenMinorRelease) {
        // Delay to not conflict with tour/demo triggers
        const timeout = setTimeout(() => {
          if (
            !helpStore.activeTour &&
            !modalUIStore.showZenMode &&
            !sessionModeStore.isDemoMode &&
            !onboardingStore.showChangelog
          ) {
            onboardingStore.showChangelog = true;
          }
        }, 2000);
        return () => clearTimeout(timeout);
      }
    }
  });

  let lastRestoredVaultId = $state<string | null>(null);

  // Restore state once when vault is initialized and matches the active vault
  $effect(() => {
    const activeVaultId = vault.activeVaultId;
    if (
      browser &&
      vault.isInitialized &&
      activeVaultId &&
      activeVaultId !== lastRestoredVaultId
    ) {
      lastRestoredVaultId = activeVaultId;
      const key = `codex_vault_state_${activeVaultId}`;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const state = JSON.parse(raw);

          // Restore selectedEntityId (if it still exists in the loaded vault's entities)
          if (
            state.selectedEntityId &&
            vault.entities[state.selectedEntityId]
          ) {
            vault.selectedEntityId = state.selectedEntityId;
          } else {
            vault.selectedEntityId = null;
          }

          // Restore Zen Mode state
          if (state.zenModeEntityId && vault.entities[state.zenModeEntityId]) {
            modalUIStore.zenModeEntityId = state.zenModeEntityId;
            modalUIStore.showZenMode = !!state.showZenMode;
            modalUIStore.zenModeActiveTab =
              state.zenModeActiveTab || "overview";
          } else {
            modalUIStore.closeZenMode();
          }
        } else {
          vault.selectedEntityId = null;
          modalUIStore.closeZenMode();
        }
      } catch (e) {
        console.warn(
          `[StateSync] Failed to restore state for vault ${activeVaultId}:`,
          e,
        );
      }
    }
  });

  // Track changes to selectedEntityId or Zen Mode and PERSIST them
  $effect(() => {
    const activeVaultId = vault.activeVaultId;
    if (
      browser &&
      vault.isInitialized &&
      activeVaultId &&
      activeVaultId === lastRestoredVaultId
    ) {
      const selectedEntityId = vault.selectedEntityId;
      const showZenMode = modalUIStore.showZenMode;
      const zenModeEntityId = modalUIStore.zenModeEntityId;
      const zenModeActiveTab = modalUIStore.zenModeActiveTab;

      const key = `codex_vault_state_${activeVaultId}`;
      try {
        const state = {
          selectedEntityId,
          showZenMode,
          zenModeEntityId,
          zenModeActiveTab,
        };
        localStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        console.warn(
          `[StateSync] Failed to persist state for vault ${activeVaultId}:`,
          e,
        );
      }
    }
  });

  // On mobile, show a dedicated bottom sheet instead of opening the drawer.
  $effect(() => {
    if (modalUIStore.pendingCreateEntity && layoutUIStore.isMobile) {
      modalUIStore.pendingCreateEntity = false;
      modalUIStore.showMobileCreateSheet = true;
    }
  });

  // Deferred inert / aria-hidden state to prevent focus-hiding warnings
  let isBackgroundInert = $state(false);
  $effect(() => {
    if (anyModalOpen) {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        activeEl instanceof HTMLElement &&
        activeEl !== document.body
      ) {
        activeEl.blur();
      }
      isBackgroundInert = true;
    } else {
      isBackgroundInert = false;
    }
  });

  // Keyboard Shortcuts
  const handleKeydown = useGlobalShortcuts({
    searchStore,
    modalUIStore,
    quickNoteStore,
  });
</script>

<svelte:window onkeydown={handleKeydown} />
<NavigationShortcuts />

<div
  class="h-[var(--app-viewport-height)] bg-chrome-bg text-chrome-text flex flex-col font-body app-layout"
>
  <!-- Background content — inert when any modal is open so keyboard/AT cannot reach it -->
  <div
    class="contents"
    inert={isBackgroundInert || undefined}
    aria-hidden={isBackgroundInert || undefined}
  >
    <NotificationToast />

    {#if !isPopup && !isVttFullscreen && !isZenPopout}
      <AppHeader bind:isMobileMenuOpen bind:headerEl />
      {#if sessionModeStore.isDemoMode}
        <MobileDemoBanner />
      {/if}
    {/if}

    <div
      class="flex-1 flex flex-col-reverse md:flex-row min-h-0 relative overflow-hidden"
    >
      {#if !isPopup && !isVttFullscreen && !isZenPopout}
        <ActivityBar />
        <SidebarPanelHost />
      {/if}

      <main
        class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <div
          class="min-h-0 min-w-0 flex-1 overflow-y-auto"
          inert={(isEntityExplorerWorkspace &&
            !!layoutUIStore.focusedEntityId) ||
            undefined}
          aria-hidden={(isEntityExplorerWorkspace &&
            !!layoutUIStore.focusedEntityId) ||
            undefined}
          data-testid="layout-route-content"
        >
          {@render children()}
        </div>

        {#if isEntityExplorerWorkspace && layoutUIStore.focusedEntityId}
          <div
            class="absolute inset-0 z-[60] min-h-0 min-w-0 overflow-hidden bg-theme-bg"
            data-testid="entity-explorer-workspace-overlay"
          >
            <EntityExplorerWorkspace entityId={layoutUIStore.focusedEntityId} />
          </div>
        {/if}
      </main>
    </div>

    {#if !isPopup && !isVttFullscreen && !isZenPopout}
      <AppFooter />
    {/if}
  </div>

  <!-- Modals rendered outside the inert wrapper -->
  {#if !isPopup}
    <GlobalModalProvider bind:isMobileMenuOpen />
  {/if}

  {#if !isPopup}
    <QuickNoteScratchpad />
  {/if}

  <GuestSessionBootstrap />
  {#if sessionModeStore.isGuestMode && mapSession && VTTSharedImageLightbox}
    <VTTSharedImageLightbox
      imageState={mapSession.sharedTokenImage}
      onClose={() => mapSession.clearSharedTokenImage()}
    />
  {/if}
</div>

<FatalErrorOverlay />

<style>
  .app-layout {
    font-family: var(--font-body, ui-sans-serif);
  }
</style>
