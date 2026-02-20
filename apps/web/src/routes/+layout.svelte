<script lang="ts">
  import "../app.css";
  import VaultControls from "$lib/components/VaultControls.svelte";
  import SyncReminder from "$lib/components/notifications/SyncReminder.svelte";
  import MobileMenu from "$lib/components/layout/MobileMenu.svelte";
  import SearchModal from "$lib/components/search/SearchModal.svelte";
  import SettingsModal from "$lib/components/settings/SettingsModal.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { searchStore } from "$lib/stores/search.svelte";
  import { helpStore } from "$lib/stores/help.svelte";
  import { HELP_ARTICLES } from "$lib/config/help-content";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { demoService } from "$lib/services/demo";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { syncStats } from "$lib/stores/sync-stats";
  import { cloudConfig } from "$lib/stores/cloud-config";
  import { workerBridge } from "$lib/cloud-bridge/worker-bridge";
  import { debugStore } from "$lib/stores/debug.svelte";
  import { isEntityVisible } from "schema";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import { browser } from "$app/environment";
  import { PATREON_URL } from "$lib/config";

  let { children } = $props();

  // Dynamic Component Loading for specialized/heavy UI elements
  // Use any to bypass strict prop validation for lazy components in the shell
  let OracleWindow = $state<any>(null);
  let ZenModeModal = $state<any>(null);
  let TourOverlay = $state<any>(null);
  let DebugConsole = $state<any>(null);
  let MergeNodesDialog = $state<any>(null);

  const isPopup = $derived(page.url.pathname === `${base}/oracle`);
  let isMobileMenuOpen = $state(false);

  // Lazy load components when needed
  $effect(() => {
    if (uiStore.showZenMode && !ZenModeModal) {
      import("../lib/components/modals/ZenModeModal.svelte").then(
        (m) => (ZenModeModal = m.default),
      );
    }
    if (helpStore.activeTour && !TourOverlay) {
      import("../lib/components/help/TourOverlay.svelte").then(
        (m) => (TourOverlay = m.default),
      );
    }
    if (uiStore.mergeDialog.open && !MergeNodesDialog) {
      import("../lib/components/dialogs/MergeNodesDialog.svelte").then(
        (m) => (MergeNodesDialog = m.default),
      );
    }
    if (!isPopup && !OracleWindow) {
      import("../lib/components/oracle/OracleWindow.svelte").then(
        (m) => (OracleWindow = m.default),
      );
    }
    if (
      (import.meta.env.DEV ||
        (typeof window !== "undefined" && (window as any).__E2E__) ||
        import.meta.env.VITE_STAGING === "true") &&
      !DebugConsole
    ) {
      import("../lib/components/debug/DebugConsole.svelte").then(
        (m) => (DebugConsole = m.default),
      );
    }
  });

  let hasBooted = $state(false);

  function bootSystem() {
    if (hasBooted) return;
    hasBooted = true;

    debugStore.log("System booting: Initializing heavy stores...");
    categories.init();
    timelineStore.init();
    graph.init();
    calendarStore.init();

    vault.init().catch((error) => {
      console.error("Vault initialization failed", error);
    });
  }

  // Reactive boot trigger
  $effect(() => {
    if (!uiStore.isLandingPageVisible && !hasBooted) {
      bootSystem();
    }
  });

  // E2E test helpers: Expose stores globally for Playwright evaluate() calls
  $effect(() => {
    if (typeof window !== "undefined" && (window as any).__E2E__) {
      (window as any).vault = vault;
      (window as any).graph = graph;
      (window as any).oracle = oracle;
    }
  });

  onMount(() => {
    // Light initializations required for the landing page/shell
    helpStore.init();
    themeStore.init();
    oracle.init();

    // Register Service Worker for PWA/Offline support
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${base}/service-worker.js`)
        .catch((error) => {
          console.warn("Service Worker registration failed:", error);
        });
    }

    const handleGlobalError = (event: ErrorEvent) => {
      // Ignore non-fatal script/asset load failures (common when offline)
      if (
        event.target instanceof HTMLScriptElement ||
        event.target instanceof HTMLLinkElement
      ) {
        return;
      }

      const message = event.message || "";
      if (
        message.includes("Script error") ||
        message.includes("Load failed") ||
        message.includes("isHeadless") ||
        message.includes("notify") ||
        message.includes("INTERNET_DISCONNECTED") ||
        message.includes("Failed to fetch") ||
        message.includes("NetworkError")
      ) {
        return;
      }

      console.error("[Fatal Error]", event);
      uiStore.setGlobalError(event.message, event.error?.stack);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || "";

      if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("Load failed") ||
        message.includes("INTERNET_DISCONNECTED")
      ) {
        return;
      }

      console.error("[Fatal Rejection]", event);
      uiStore.setGlobalError(
        message || "Unhandled Promise Rejection",
        reason?.stack,
      );
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("vault-switched", () => {
      calendarStore.init();
    });

    // Expose for E2E testing
    if (import.meta.env.DEV || (window as any).__E2E__) {
      (window as any).searchStore = searchStore;
      (window as any).vault = vault;
      (window as any).graph = graph;
      (window as any).calendarStore = calendarStore;

      import("$lib/stores/oracle.svelte").then((m) => {
        (window as any).oracle = m.oracle;
      });
      import("$lib/services/ai").then((m) => {
        (window as any).aiService = m.aiService;
      });

      (window as any).categories = categories;
      (window as any).uiStore = uiStore;
      (window as any).syncStats = syncStats;
      (window as any).cloudConfig = cloudConfig;
      (window as any).workerBridge = workerBridge;
      (window as any).isEntityVisible = isEntityVisible;

      // Eagerly load P2P services for E2E
      import("$lib/cloud-bridge/p2p/host-service.svelte").then((m) => {
        (window as any).p2pHostService = m.p2pHost;
      });
      import("$lib/cloud-bridge/p2p/guest-service").then((m) => {
        (window as any).p2pGuestService = m.p2pGuestService;
      });
    }

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  });

  // Handle Direct Help Links (#help/article-id)
  $effect(() => {
    if (!helpStore.isInitialized) return;

    const hash = page.url.hash;
    if (hash && hash.startsWith("#help/")) {
      const articleId = hash.replace("#help/", "");
      if (articleId) {
        const exists = HELP_ARTICLES.some((a) => a.id === articleId);
        if (exists) {
          const timer = setTimeout(() => {
            helpStore.openHelpToArticle(articleId);
          }, 100);
          return () => clearTimeout(timer);
        }
      }
    }
  });

  let lastDemoQueryParam: string | null = null;

  // Handle Demo Mode Deep Linking (?demo=theme)
  $effect(() => {
    const demoTheme = page.url.searchParams.get("demo");

    // If there is no demo param, reset our tracking state and exit.
    if (!demoTheme) {
      lastDemoQueryParam = null;
      return;
    }

    // If we've already handled this exact query param value, do nothing.
    if (demoTheme === lastDemoQueryParam) {
      return;
    }

    // Record that we've now handled this query param value.
    lastDemoQueryParam = demoTheme;

    // Suppression of auto-start check
    if (!uiStore.wasConverted) {
      // We only start if it's actually different from what we think we are showing,
      // but DemoService.startDemo is the ultimate source of truth for loading data.
      demoService.startDemo(demoTheme);
    }
  });

  // Trigger onboarding for new users after vault has initialized AND landing page is dismissed
  // OR Auto-start demo if first visit and vault is empty
  $effect(() => {
    if (vault.isInitialized && !uiStore.isLandingPageVisible) {
      const demoParam = page.url.searchParams.get("demo");

      if (
        !helpStore.hasSeen("initial-onboarding") &&
        !(window as any).DISABLE_ONBOARDING &&
        !demoParam // Only auto-start fantasy if no specific demo requested
      ) {
        // If vault is empty, start demo instead of tour
        if (vault.allEntities.length === 0 && !uiStore.isDemoMode) {
          demoService.startDemo("fantasy");
        } else {
          helpStore.startTour("initial-onboarding");
        }
      }
    }
  });

  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      searchStore.open();
    }

    if (
      ((event.ctrlKey || event.metaKey) && event.key === "ArrowUp") ||
      (event.altKey && event.key.toLowerCase() === "z")
    ) {
      if (vault.selectedEntityId) {
        event.preventDefault();
        uiStore.openZenMode(vault.selectedEntityId);
      }
    }
  };
</script>

<svelte:window on:keydown={handleKeydown} />

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
    href="/sitemap.xml"
  />
</svelte:head>

<div class="app-layout min-h-screen bg-black flex flex-col font-sans">
  <!-- Notifications -->
  {#if uiStore.notification}
    <div
      class="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-4 fade-in"
      class:bg-green-950={uiStore.notification.type === "success"}
      class:border-green-500={uiStore.notification.type === "success"}
      class:text-green-100={uiStore.notification.type === "success"}
      class:bg-blue-950={uiStore.notification.type === "info"}
      class:border-blue-500={uiStore.notification.type === "info"}
      class:text-blue-100={uiStore.notification.type === "info"}
      transition:fade
    >
      <span
        class="icon-[lucide--check-circle] w-5 h-5"
        class:hidden={uiStore.notification.type !== "success"}
      ></span>
      <span
        class="icon-[lucide--info] w-5 h-5"
        class:hidden={uiStore.notification.type !== "info"}
      ></span>
      <span class="font-mono text-xs font-bold tracking-widest uppercase"
        >{uiStore.notification.message}</span
      >
    </div>
  {/if}

  {#if !isPopup}
    <header
      class="px-4 md:px-6 py-3 md:py-4 bg-theme-surface border-b border-theme-border flex items-center justify-between sticky top-0 z-50 gap-2 md:gap-4"
    >
      <!-- Mobile: Left (Menu + Brand) -->
      <div class="flex items-center gap-3">
        <button
          class="md:hidden text-theme-muted hover:text-theme-primary transition-colors"
          onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span class="icon-[lucide--menu] w-6 h-6"></span>
        </button>

        <h1
          class="text-lg md:text-xl font-bold text-theme-text font-mono tracking-wide flex items-center gap-2 md:gap-3 shrink-0"
        >
          <span class="icon-[lucide--book-open] text-theme-primary w-5 h-5"
          ></span>
          <span class="hidden sm:inline">Codex Cryptica</span>
          <span class="sm:hidden text-theme-primary">CC</span>
        </h1>
      </div>

      <!-- Search (Desktop: Input, Mobile: Button) -->
      <div class="flex-1 max-w-xl md:px-4 flex justify-end md:justify-center">
        <div class="hidden md:block w-full relative group">
          <span
            class="absolute left-3 top-1/2 -translate-y-1/2 icon-[heroicons--magnifying-glass] w-4 h-4 text-theme-muted group-focus-within:text-theme-primary transition-colors"
          ></span>
          <input
            type="text"
            placeholder="Search (Cmd+K)..."
            class="w-full bg-theme-bg border border-theme-border hover:border-theme-primary/50 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/50 rounded py-1.5 pl-10 pr-4 text-sm font-mono text-theme-text transition-all placeholder:text-theme-muted/50"
            onfocus={() => searchStore.open()}
            value={searchStore.query}
            oninput={(e) => searchStore.setQuery(e.currentTarget.value)}
            data-testid="search-input"
          />
        </div>
        <button
          class="md:hidden p-2 text-theme-muted hover:text-theme-primary transition-colors"
          onclick={() => searchStore.open()}
          aria-label="Search"
        >
          <span class="icon-[heroicons--magnifying-glass] w-6 h-6"></span>
        </button>
      </div>

      <!-- Desktop: Right Controls -->
      <div class="hidden md:flex items-center gap-4 shrink-0">
        <VaultControls />
        <button
          class="w-8 h-8 flex items-center justify-center border transition-all {uiStore.showSettings &&
          uiStore.activeSettingsTab !== 'sync'
            ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
            : 'border-theme-border hover:border-theme-primary text-theme-muted hover:text-theme-primary'} relative"
          onclick={() => uiStore.toggleSettings("vault")}
          title="Application Settings"
          aria-label="Open Application Settings"
          data-testid="settings-button"
        >
          <span
            class="w-5 h-5 {$syncStats.status === 'SCANNING' ||
            $syncStats.status === 'SYNCING'
              ? 'icon-[lucide--zap] animate-pulse text-theme-primary'
              : 'icon-[lucide--settings]'}"
          ></span>
          {#if $cloudConfig.enabled && $cloudConfig.connectedEmail && $syncStats.status === "IDLE"}
            <span
              class="absolute top-1 right-1 w-1.5 h-1.5 bg-theme-primary rounded-full border border-theme-bg animate-pulse"
            ></span>
          {/if}
        </button>
      </div>
    </header>
  {/if}

  <main class="flex-1 relative">
    {@render children()}
  </main>

  {#if !isPopup}
    <footer
      class="px-6 py-4 bg-theme-surface border-t border-theme-border flex flex-col md:flex-row justify-between items-center gap-4 hidden md:flex"
    >
      <div
        class="text-[10px] font-mono text-theme-muted uppercase tracking-widest"
      >
        &copy; 2026 Codex Cryptica // Local-First Intelligence
      </div>
      <div class="flex gap-6">
        {#if PATREON_URL}
          <a
            href={PATREON_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="text-[10px] font-mono text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
            >Support on Patreon</a
          >
        {/if}
        <a
          href="{base}/features"
          class="text-[10px] font-mono text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
          >Features</a
        >
        <a
          href="{base}/privacy"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[10px] font-mono text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
          >Privacy Policy</a
        >
        <a
          href="{base}/terms"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[10px] font-mono text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
          >Terms of Service</a
        >
      </div>
    </footer>

    <SearchModal />
    <SyncReminder />

    {#if (page.url.pathname as string) !== `${base}/login`}
      {#if OracleWindow}
        <OracleWindow />
      {/if}
      {#if browser}
        <SettingsModal />
        {#if ZenModeModal}
          <ZenModeModal />
        {/if}
        {#if TourOverlay}
          <TourOverlay />
        {/if}
        <MobileMenu bind:isOpen={isMobileMenuOpen} />
        {#if MergeNodesDialog}
          <MergeNodesDialog
            isOpen={uiStore.mergeDialog.open}
            sourceNodeIds={uiStore.mergeDialog.sourceIds}
            onClose={() => uiStore.closeMergeDialog()}
          />
        {/if}
        {#if DebugConsole}
          <DebugConsole />
        {/if}
      {/if}
    {/if}
  {/if}
</div>

{#if uiStore.globalError && !(window as any).DISABLE_ERROR_OVERLAY}
  <div
    class="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 text-red-500 font-mono"
  >
    <div
      class="max-w-2xl w-full border border-red-900 bg-red-950/20 p-8 rounded shadow-2xl relative"
    >
      <div
        class="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-red-500"
      ></div>
      <div
        class="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-red-500"
      ></div>

      <h2 class="text-2xl font-black mb-4 flex items-center gap-3">
        <span class="icon-[lucide--alert-triangle] w-8 h-8"></span>
        SYSTEM FAILURE
      </h2>
      <p class="text-red-400 mb-6 font-bold">
        {uiStore.globalError.message}
      </p>
      {#if uiStore.globalError.stack}
        <pre
          class="bg-black/50 p-4 rounded text-[10px] overflow-auto max-h-40 border border-red-900/30 mb-6">{uiStore
            .globalError.stack}</pre>
      {/if}
      <div class="flex gap-4">
        <button
          onclick={() => window.location.reload()}
          class="flex-1 py-3 bg-red-600 hover:bg-red-500 text-black font-bold rounded transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
        >
          REBOOT SYSTEM
        </button>
        <button
          onclick={() => uiStore.clearGlobalError()}
          class="px-6 py-3 border border-red-900 text-red-900 hover:text-red-500 hover:border-red-500 transition-colors"
        >
          IGNORE
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .app-layout {
    font-family: var(--theme-font-sans, ui-sans-serif);
  }
</style>
