<script lang="ts">
  import "../../app.css";
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { onMount } from "svelte";

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
  import { oracle } from "$lib/stores/oracle.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { demoService } from "$lib/services/demo";
  import { HELP_ARTICLES } from "$lib/config/help-content";
  import { isEntityVisible } from "schema";

  // Components & Providers
  import AppHeader from "$lib/components/layout/AppHeader.svelte";
  import AppFooter from "$lib/components/layout/AppFooter.svelte";
  import NotificationToast from "$lib/components/layout/NotificationToast.svelte";
  import FatalErrorOverlay from "$lib/components/layout/FatalErrorOverlay.svelte";
  import OracleSidebarProvider from "$lib/components/layout/OracleSidebarProvider.svelte";
  import GlobalModalProvider from "$lib/components/modals/GlobalModalProvider.svelte";

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
        });
      }
    }
  });

  onMount(() => {
    (async () => {
      helpStore.init();
      await themeStore.init();
      oracle.init();

      registerServiceWorker();

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
    if (headerEl && browser) {
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
          !isTesting
        ) {
          demoService.startDemo("fantasy");
        } else {
          helpStore.startTour("initial-onboarding");
        }
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

<div class="h-screen bg-theme-bg flex flex-col font-body app-layout">
  <NotificationToast />

  {#if !isPopup}
    <AppHeader bind:isMobileMenuOpen bind:headerEl />
  {/if}

  <div class="flex-1 flex flex-row min-h-0 relative overflow-hidden">
    <OracleSidebarProvider />

    <main class="flex-1 relative flex flex-col min-h-0 overflow-y-auto">
      {@render children()}
    </main>
  </div>

  {#if !isPopup}
    <AppFooter />
    <GlobalModalProvider bind:isMobileMenuOpen />
  {/if}
</div>

<FatalErrorOverlay />

<style>
  .app-layout {
    font-family: var(--font-body, ui-sans-serif);
  }
</style>
