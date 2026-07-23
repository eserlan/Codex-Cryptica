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
  import { configureGDriveSync, initGDriveSync } from "@codex/gdrive-sync";
  import { getDB, DB_NAME, DB_VERSION } from "$lib/utils/idb";
  import { HELP_ARTICLES } from "$lib/config/help-content";
  import { getHelpArticleIdFromHash } from "$lib/components/help/help-direct-link";
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
  import {
    decideFirstRunAction,
    hasUnseenMinorRelease,
  } from "$lib/app/onboarding/onboarding-orchestrator";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";
  import { vaultThemePromptStore } from "$lib/stores/ui/vault-theme-prompt.svelte";
  import { worldStore } from "$lib/stores/world.svelte";
  import { initAudioEngine } from "@codex/audio-engine";
  import { debugStore } from "$lib/stores/debug.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { oracleBridge } from "$lib/cloud-bridge/oracle-bridge";
  import { aiClientManager } from "@codex/ai-engine";
  import { writeOpfsFile, deleteOpfsEntry } from "$lib/utils/opfs";

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
  let isDocumentVisible = $state(true);

  // Derived
  const isPopup = $derived(
    page.url.pathname === `${base}/oracle` ||
      page.url.pathname === `${base}/help` ||
      page.url.pathname.startsWith(`${base}/help/`) ||
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
    vaultThemePromptStore.stopTracking();
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
    initAudioEngine({
      vault,
      oracle,
      debugStore,
      oracleBridge,
      aiClientManager,
      writeOpfsFile,
      deleteOpfsEntry,
    });

    (async () => {
      isDocumentVisible = !document.hidden;
      helpStore.init();
      await themeStore.init();
      configureGDriveSync({
        getDB,
        dbName: DB_NAME,
        dbVersion: DB_VERSION,
        appEventBus,
        vault: {
          get activeVaultId() {
            return vault.activeVaultId;
          },
          get activeVaultRecord() {
            return vault.activeVaultRecord ?? null;
          },
          createVault: (name) => vault.createVault(name),
          switchVault: (id) => vault.switchVault(id),
          getActiveVaultHandle: async () =>
            (await vault.getActiveVaultHandle()) ?? null,
          getSpecificVaultHandle: async (id) =>
            (await vault.getSpecificVaultHandle(id)) ?? null,
        },
        listVaults: () => vaultRegistry.listVaults(),
      });
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

  const shouldConsiderVaultThemePrompt = (
    activeVaultId: string,
    hasCompletedInitialGuide: boolean,
  ) =>
    browser &&
    vault.isInitialized &&
    isDocumentVisible &&
    !!activeVaultId &&
    !sessionModeStore.isDemoMode &&
    !sessionModeStore.isGuestMode &&
    !onboardingStore.isLandingPageVisible &&
    onboardingStore.dismissedWorldPage &&
    !onboardingStore.showChangelog &&
    hasCompletedInitialGuide &&
    !helpStore.activeTour &&
    !modalUIStore.isAnyModalOpen;

  $effect(() => {
    const activeVaultId = vault.activeVaultId;

    if (
      !browser ||
      !vault.isInitialized ||
      !activeVaultId ||
      sessionModeStore.isDemoMode ||
      sessionModeStore.isGuestMode
    ) {
      vaultThemePromptStore.stopTracking();
      return;
    }

    if (!isDocumentVisible) {
      vaultThemePromptStore.pauseTracking();
      return;
    }

    vaultThemePromptStore.startTracking(activeVaultId);
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
    if (!helpStore.isInitialized || isPopup) return;
    const articleId = getHelpArticleIdFromHash(page.url.hash);
    if (
      articleId &&
      HELP_ARTICLES.some((article) => article.id === articleId)
    ) {
      setTimeout(() => {
        helpStore.openHelpToArticle(articleId);
      }, 100);
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

  // First-time user: silently record the latest release as seen so brand-new
  // users never get a changelog popup on their very first launch.
  $effect(() => {
    if (
      browser &&
      vault.isInitialized &&
      !sessionModeStore.isDemoMode &&
      !onboardingStore.isLandingPageVisible &&
      !onboardingStore.lastSeenVersion
    ) {
      onboardingStore.markVersionAsSeen(releases[0]?.version ?? VERSION);
    }
  });

  // Unified first-run orchestrator (#1780). One decision function owns what a
  // first-time user sees first, so the tour, guided empty state, and changelog
  // never stack or compete. See onboarding-orchestrator.ts.
  $effect(() => {
    if (!browser) return;

    const action = decideFirstRunAction({
      isInitialized: vault.isInitialized,
      isGuestMode: sessionModeStore.isGuestMode,
      isDemoMode: sessionModeStore.isDemoMode,
      isLandingVisible: onboardingStore.isLandingPageVisible,
      vaultSwitcherOpen: modalUIStore.showVaultSwitcher,
      hasDemoQueryParam: page.url.searchParams.has("demo"),
      hasSeenTour: helpStore.hasSeen("initial-onboarding"),
      entityCount: vault.allEntities.length,
      activeTour: !!helpStore.activeTour,
      anyModalOpen: modalUIStore.isAnyModalOpen || modalUIStore.showZenMode,
      hasUnseenRelease: hasUnseenMinorRelease(
        onboardingStore.lastSeenVersion,
        releases.map((r) => r.version),
      ),
    });

    switch (action.kind) {
      case "tour":
      case "guided-empty":
        // Both start the short, task-focused tour. In the empty-vault case the
        // graph's guided empty state teaches the "create your first entity"
        // step, and we deliberately do NOT auto-load a demo (#1782).
        helpStore.startTour("initial-onboarding");
        break;
      case "changelog": {
        // Small delay so it never races an overlay that is about to open.
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
      case "none":
      default:
        break;
    }
  });

  // Theme discovery should happen after the user has some real time in the
  // vault, not immediately after creation or a single first edit.
  $effect(() => {
    const activeVaultId = vault.activeVaultId;
    const entityCount = vault.allEntities.length;
    const hasCompletedInitialGuide = helpStore.hasSeen("initial-onboarding");

    if (
      !activeVaultId ||
      !shouldConsiderVaultThemePrompt(
        activeVaultId,
        hasCompletedInitialGuide,
      ) ||
      !vaultThemePromptStore.shouldAutoPrompt(activeVaultId, entityCount)
    ) {
      return;
    }

    void themeStore.hasSavedThemeForVault(activeVaultId).then((hasTheme) => {
      if (
        !hasTheme &&
        vault.activeVaultId === activeVaultId &&
        shouldConsiderVaultThemePrompt(
          activeVaultId,
          helpStore.hasSeen("initial-onboarding"),
        ) &&
        vaultThemePromptStore.shouldAutoPrompt(
          activeVaultId,
          vault.allEntities.length,
        )
      ) {
        modalUIStore.openVaultThemePrompt(activeVaultId);
      }
    });
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
    canUseQuickNote: !sessionModeStore.isGuestMode,
    searchStore,
    modalUIStore,
    quickNoteStore,
  });
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:document
  onvisibilitychange={() => (isDocumentVisible = !document.hidden)}
/>
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

  {#if !isPopup && !sessionModeStore.isGuestMode}
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
