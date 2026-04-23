<script lang="ts">
  import "../../app.css";
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { preloadCode } from "$app/navigation";

  // Stores
  import { helpStore } from "$lib/stores/help.svelte";
  import { searchStore } from "$lib/stores/search.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { demoService } from "$lib/services/demo";
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
  import GlobalModalProvider from "$lib/components/modals/GlobalModalProvider.svelte";
  import GuestSessionBootstrap from "$lib/components/vtt/GuestSessionBootstrap.svelte";

  // Logic & Hooks
  import {
    bootSystem,
    initializeGlobalListeners,
    setupWindowGlobals,
    registerServiceWorker,
  } from "$lib/app/init/app-init";
  import { useGlobalShortcuts } from "$lib/hooks/useGlobalShortcuts.svelte";

  let { children } = $props();

  // State
  let isMobileMenuOpen = $state(false);
  let hasBooted = $state(false);
  let lastDemoQueryParam: string | null = null;
  let headerEl = $state<HTMLElement>();
  let globalListenersCleanup: (() => void) | null = null;

  // Derived
  const isPopup = $derived(
    page.url.pathname === `${base}/oracle` ||
      page.url.pathname === `${base}/help` ||
      page.url.pathname === `${base}/import`,
  );
  const isZenPopout = $derived(
    /\/vault\/[^/]+\/entity\/[^/]+$/.test(page.url.pathname),
  );
  const isVttFullscreen = $derived(
    page.url.pathname.startsWith(`${base}/map`) && mapSession.vttEnabled,
  );

  if (browser) {
    const requestedTheme = page.url.searchParams.get("theme");
    if (requestedTheme && THEMES[requestedTheme]) {
      themeStore.currentThemeId = requestedTheme;
    }
  }

  // Set up global listeners BEFORE bootSystem to avoid missing vault-switched events
  $effect(() => {
    if (browser && !globalListenersCleanup) {
      globalListenersCleanup = initializeGlobalListeners(
        uiStore,
        calendarStore,
      );
    }
  });

  // Initialization Logic
  $effect(() => {
    // This layout only serves workspace routes — always boot except on landing page
    const isLandingPage = page.url.pathname === `${base}/`;
    const shouldShowLanding = uiStore.isLandingPageVisible;
    const isTesting =
      typeof window !== "undefined" && (window as any).DISABLE_ONBOARDING;

    if (!hasBooted) {
      if (!isLandingPage || !shouldShowLanding || isTesting || isPopup) {
        hasBooted = bootSystem({
          categories,
          timeline: timelineStore,
          graph,
          calendar: calendarStore,
          vault,
          uiStore,
          oracle,
        });
      }
    }
  });

  onMount(() => {
    (async () => {
      helpStore.init();
      await themeStore.init();
      oracle.init();

      // Preload heavy route chunks so first navigation is instant
      preloadCode(`${base}/canvas`, `${base}/map`).catch(() => {});

      registerServiceWorker();

      console.log("[Layout] Calling setupWindowGlobals");
      setupWindowGlobals({
        searchStore,
        vault,
        vaultRegistry,
        canvasRegistry,
        graph,
        oracle,
        calendarStore,
        helpStore,
        categories,
        uiStore,
        isEntityVisible,
      });
    })();
  });

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
    if (!uiStore.wasConverted) {
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
        const height = headerEl!.getBoundingClientRect().height;
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
    if (vault.isInitialized && !uiStore.isLandingPageVisible) {
      if (
        !helpStore.hasSeen("initial-onboarding") &&
        !(window as any).DISABLE_ONBOARDING &&
        !page.url.searchParams.has("demo")
      ) {
        const isTesting =
          typeof window !== "undefined" && (window as any).DISABLE_ONBOARDING;
        if (
          vault.allEntities.length === 0 &&
          !uiStore.isDemoMode &&
          !isTesting &&
          !uiStore.dismissedLandingPage
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
      !uiStore.showChangelog &&
      !uiStore.isDemoMode &&
      !uiStore.isLandingPageVisible
    ) {
      const lastSeenStr = uiStore.lastSeenVersion;

      // First-time user: no changelog popup, silently mark latest known release as seen
      if (!lastSeenStr) {
        uiStore.markVersionAsSeen(releases[0]?.version ?? VERSION);
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
            !uiStore.showZenMode &&
            !uiStore.isDemoMode &&
            !uiStore.showChangelog
          ) {
            uiStore.showChangelog = true;
          }
        }, 2000);
        return () => clearTimeout(timeout);
      }
    }
  });

  // Keyboard Shortcuts
  const handleKeydown = useGlobalShortcuts({
    searchStore,
    uiStore,
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="h-[100dvh] bg-theme-bg flex flex-col font-body app-layout">
  <NotificationToast />

  {#if !isPopup && !isVttFullscreen && !isZenPopout}
    <AppHeader bind:isMobileMenuOpen bind:headerEl />
  {/if}

  <div
    class="flex-1 flex flex-col-reverse md:flex-row min-h-0 relative overflow-hidden"
  >
    {#if !isPopup && !isVttFullscreen && !isZenPopout}
      <ActivityBar />
      <SidebarPanelHost />
    {/if}

    <main class="flex-1 relative flex flex-col min-h-0 overflow-y-auto">
      {@render children()}
    </main>
  </div>

  {#if !isPopup && !isVttFullscreen && !isZenPopout}
    <AppFooter />
  {/if}

  {#if !isPopup}
    <GlobalModalProvider bind:isMobileMenuOpen />
  {/if}

  <GuestSessionBootstrap />
</div>

<FatalErrorOverlay />

<style>
  .app-layout {
    font-family: var(--font-body, ui-sans-serif);
  }
</style>
