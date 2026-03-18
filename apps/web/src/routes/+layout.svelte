<script lang="ts">
  import "../app.css";
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

  // Derived
  const isPopup = $derived(
    page.url.pathname === `${base}/oracle` ||
      page.url.pathname === `${base}/help` ||
      page.url.pathname === `${base}/import`,
  );
  const MARKETING_ROUTES = ["/blog", "/features", "/privacy", "/terms"];
  const isMarketingPage = $derived(
    MARKETING_ROUTES.some((route) =>
      page.url.pathname.startsWith(`${base}${route}`),
    ),
  );
  const isLoginRoute = $derived(page.url.pathname === `${base}/login`);

  // Initialization Logic
  $effect(() => {
    const isWorkspaceRoute =
      page.url.pathname === `${base}/` ||
      page.url.pathname.startsWith(`${base}/map`) ||
      page.url.pathname.startsWith(`${base}/canvas`);

    const shouldShowLanding = uiStore.isLandingPageVisible;
    const isTesting =
      typeof window !== "undefined" && (window as any).DISABLE_ONBOARDING;

    if (!hasBooted) {
      if (!shouldShowLanding || isTesting || isPopup) {
        hasBooted = bootSystem({
          categories,
          timeline: timelineStore,
          graph,
          calendar: calendarStore,
          vault,
        });
      } else if (isWorkspaceRoute && page.url.pathname !== `${base}/`) {
        uiStore.dismissedLandingPage = true;
        hasBooted = bootSystem({
          categories,
          timeline: timelineStore,
          graph,
          calendar: calendarStore,
          vault,
        });
      }
    }
  });

  onMount(() => {
    helpStore.init();
    themeStore.init();
    oracle.init();

    registerServiceWorker();

    const cleanupListeners = initializeGlobalListeners(uiStore, calendarStore);

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

    return () => {
      cleanupListeners();
    };
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

<svelte:head>
  <title>Codex Cryptica | AI RPG Campaign Manager</title>
  <meta
    name="description"
    content="AI-assisted, local-first RPG campaign manager. Organize your lore, visualize your world's knowledge graph, and generate content with Google Gemini."
  />
  <meta
    property="og:title"
    content="Codex Cryptica | AI RPG Campaign Manager"
  />
  <meta
    property="og:description"
    content="Local-first RPG campaign manager with graph visualization and AI intelligence."
  />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link
    rel="sitemap"
    type="application/xml"
    title="Sitemap"
    href="{base}/sitemap.xml"
  />
</svelte:head>

<div
  class="h-screen bg-theme-bg flex flex-col font-body"
  class:app-layout={!isMarketingPage && !isLoginRoute}
>
  <NotificationToast />

  {#if !isPopup}
    <AppHeader bind:isMobileMenuOpen bind:headerEl />
  {/if}

  <div class="flex-1 flex flex-row min-h-0 relative overflow-hidden">
    <OracleSidebarProvider />

    <main
      class="flex-1 relative flex flex-col min-h-0 {isMarketingPage || isPopup
        ? 'overflow-y-auto'
        : ''}"
    >
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
