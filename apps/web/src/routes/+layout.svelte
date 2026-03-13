<script lang="ts">
  import "../app.css";
  import VaultControls from "$lib/components/VaultControls.svelte";
  import MobileMenu from "$lib/components/layout/MobileMenu.svelte";
  import SearchModal from "$lib/components/search/SearchModal.svelte";
  import SettingsModal from "$lib/components/settings/SettingsModal.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { searchStore } from "$lib/stores/search.svelte";
  import { helpStore } from "$lib/stores/help.svelte";
  import { HELP_ARTICLES } from "$lib/config/help-content";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { demoService } from "$lib/services/demo";
  import { calendarStore } from "$lib/stores/calendar.svelte";
  import { debugStore } from "$lib/stores/debug.svelte";
  import { isEntityVisible } from "schema";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import { browser } from "$app/environment";
  import { PATREON_URL, DISCORD_URL, APP_NAME, VERSION } from "$lib/config";

  let { children } = $props();

  /**
   * Gates noisy console errors for lazy-load failures to DEV/E2E/Staging.
   * In production, logs to internal debugStore instead of polluting the console.
   */
  const logChunkError = (name: string, error: any) => {
    const isSpecialEnv =
      import.meta.env.DEV ||
      (typeof window !== "undefined" && (window as any).__E2E__) ||
      import.meta.env.VITE_STAGING === "true";

    if (isSpecialEnv) {
      console.error(`Failed to load ${name}`, error);
    } else {
      debugStore.error(`Lazy load failed: ${name}`, error);
    }
  };

  // Dynamic Component Loading for specialized/heavy UI elements
  // Use any to bypass strict prop validation for lazy components in the shell
  let OracleWindow = $state<any>(null);
  let OracleSidebarPanel = $state<any>(null);
  let ZenModeModal = $state<any>(null);
  let TourOverlay = $state<any>(null);
  let DebugConsole = $state<any>(null);
  let MergeNodesDialog = $state<any>(null);
  let BulkLabelDialog = $state<any>(null);
  let DiceModal = $state<any>(null);

  const isPopup = $derived(
    page.url.pathname === `${base}/oracle` ||
      page.url.pathname === `${base}/help`,
  );
  const MARKETING_ROUTES = ["/blog", "/features", "/privacy", "/terms"];
  const isMarketingPage = $derived(
    MARKETING_ROUTES.some((route) =>
      page.url.pathname.startsWith(`${base}${route}`),
    ),
  );
  let isMobileMenuOpen = $state(false);

  // Lazy load components when needed
  $effect(() => {
    if (uiStore.showZenMode && !ZenModeModal) {
      import("$lib/components/modals/ZenModeModal.svelte")
        .then((m) => (ZenModeModal = m.default))
        .catch((e) => logChunkError("ZenModeModal", e));
    }
    if (helpStore.activeTour && !TourOverlay) {
      import("$lib/components/help/TourOverlay.svelte")
        .then((m) => (TourOverlay = m.default))
        .catch((e) => logChunkError("TourOverlay", e));
    }
    if (uiStore.mergeDialog.open && !MergeNodesDialog) {
      import("$lib/components/dialogs/MergeNodesDialog.svelte")
        .then((m) => (MergeNodesDialog = m.default))
        .catch((e) => logChunkError("MergeNodesDialog", e));
    }
    if (uiStore.bulkLabelDialog.open && !BulkLabelDialog) {
      import("$lib/components/dialogs/BulkLabelDialog.svelte")
        .then((m) => (BulkLabelDialog = m.default))
        .catch((e) => logChunkError("BulkLabelDialog", e));
    }
    if (!DiceModal) {
      import("$lib/components/dice/DiceModal.svelte")
        .then((m) => (DiceModal = m.default))
        .catch((e) => logChunkError("DiceModal", e));
    }
    if (!isPopup && !OracleWindow) {
      import("$lib/components/oracle/OracleWindow.svelte")
        .then((m) => (OracleWindow = m.default))
        .catch((e) => logChunkError("OracleWindow", e));
    }
    if (uiStore.activeSidebarTool === "oracle" && !OracleSidebarPanel) {
      import("$lib/components/oracle/OracleSidebarPanel.svelte")
        .then((m) => (OracleSidebarPanel = m.default))
        .catch((e) => logChunkError("OracleSidebarPanel", e));
    }
    if (
      (import.meta.env.DEV ||
        (typeof window !== "undefined" && (window as any).__E2E__) ||
        import.meta.env.VITE_STAGING === "true") &&
      !DebugConsole
    ) {
      import("$lib/components/debug/DebugConsole.svelte")
        .then((m) => (DebugConsole = m.default))
        .catch((e) => logChunkError("DebugConsole", e));
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
    const isWorkspaceRoute =
      page.url.pathname === `${base}/` ||
      page.url.pathname.startsWith(`${base}/map`) ||
      page.url.pathname.startsWith(`${base}/canvas`);

    const shouldShowLanding = uiStore.isLandingPageVisible;
    const isTesting =
      typeof window !== "undefined" && (window as any).DISABLE_ONBOARDING;

    if (!hasBooted) {
      if (!shouldShowLanding || isTesting) {
        // User has 'skip' enabled or has already dismissed it in this session
        bootSystem();
      } else if (isWorkspaceRoute && page.url.pathname !== `${base}/`) {
        // Deep link to map/canvas bypasses landing but dismisses it
        uiStore.dismissedLandingPage = true;
        bootSystem();
      }
    }
  });

  // E2E test helpers: Expose stores globally for Playwright evaluate() calls
  $effect(() => {
    if (typeof window !== "undefined" && (window as any).__E2E__) {
      (window as any).vault = vault;
      (window as any).vaultRegistry = vaultRegistry;
      (window as any).canvasRegistry = canvasRegistry;
      (window as any).graph = graph;
      (window as any).oracle = oracle;
      (window as any).uiStore = uiStore;
    }
  });

  onMount(() => {
    console.log(`[App] ${APP_NAME} v${VERSION} initialized`);

    // Light initializations required for the landing page/shell
    helpStore.init();
    themeStore.init();
    oracle.init();

    // Register Service Worker for PWA/Offline support (Production only)
    if ("serviceWorker" in navigator && !import.meta.env.DEV) {
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
        message.includes("NetworkError") ||
        message.includes(
          "ResizeObserver loop completed with undelivered notifications",
        )
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
      (window as any).helpStore = helpStore;

      import("$lib/stores/oracle.svelte").then((m) => {
        (window as any).oracle = m.oracle;
      });
      import("$lib/services/ai").then((m) => {
        (window as any).aiService = m.aiService;
      });

      (window as any).categories = categories;
      (window as any).uiStore = uiStore;
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

  let headerEl = $state<HTMLElement>();

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
      const isTesting =
        typeof window !== "undefined" && (window as any).DISABLE_ONBOARDING;

      if (
        !helpStore.hasSeen("initial-onboarding") &&
        !(window as any).DISABLE_ONBOARDING &&
        !page.url.searchParams.has("demo") // only auto-start fantasy if no specific demo requested
      ) {
        // If vault is empty, start demo instead of tour
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

  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      searchStore.open();
    }

    const target = event.target as HTMLElement;
    const isTyping =
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.closest("[contenteditable]");

    if (isTyping) return;

    const isUndo =
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "z" &&
      !event.shiftKey;

    const isRedo =
      (event.metaKey || event.ctrlKey) &&
      (event.key.toLowerCase() === "y" ||
        (event.key.toLowerCase() === "z" && event.shiftKey));

    // Undo (Regret)
    if (isUndo) {
      event.preventDefault();
      oracle.undo();
    }

    // Redo (Reregret)
    if (isRedo) {
      event.preventDefault();
      oracle.redo();
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

    if (
      event.key.toLowerCase() === "p" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const target = event.target as HTMLElement;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTyping) return;
      uiStore.sharedMode = !uiStore.sharedMode;
    }
  };
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

<div class="app-layout h-screen bg-theme-bg flex flex-col font-body">
  <!-- Notifications -->
  {#if uiStore.notification}
    <div
      class="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-4 fade-in"
      class:bg-theme-surface={true}
      class:border-theme-primary={uiStore.notification.type === "success"}
      class:text-theme-primary={uiStore.notification.type === "success"}
      class:border-blue-500={uiStore.notification.type === "info"}
      class:text-blue-400={uiStore.notification.type === "info"}
      class:border-red-500={uiStore.notification.type === "error"}
      class:text-red-500={uiStore.notification.type === "error"}
      style:box-shadow="var(--theme-glow)"
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
      <span
        class="icon-[lucide--alert-circle] w-5 h-5"
        class:hidden={uiStore.notification.type !== "error"}
      ></span>
      <span
        class="font-mono text-xs font-bold tracking-widest uppercase font-header"
        >{uiStore.notification.message}</span
      >
    </div>
  {/if}

  {#if !isPopup}
    <header
      bind:this={headerEl}
      class="px-4 md:px-6 py-3 md:py-4 bg-theme-surface border-b border-theme-border flex items-center justify-between sticky top-0 z-50 gap-2 md:gap-4"
    >
      <!-- Mobile: Left (Menu + Brand) -->
      <div class="flex items-center gap-2 md:gap-3 shrink-0">
        <button
          class="md:hidden text-theme-muted hover:text-theme-primary transition-colors"
          onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span class="icon-[lucide--menu] w-6 h-6"></span>
        </button>

        <!-- Oracle Toggle (Sidebar) -->
        {#if !uiStore.leftSidebarOpen}
          <button
            class="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg bg-theme-surface border border-theme-border text-theme-primary shadow-lg hover:bg-theme-primary/10 transition-all duration-300 group relative"
            onclick={() => uiStore.toggleSidebarTool("oracle")}
            aria-label="Open Lore Oracle"
            title="Open Lore Oracle"
            data-testid="sidebar-oracle-button"
          >
            <span
              class="icon-[heroicons--sparkles] w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110"
            ></span>
          </button>
        {/if}

        <!-- Die Roller Toggle -->
        <button
          class="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg bg-theme-surface border border-theme-border text-theme-primary shadow-lg hover:bg-theme-primary/10 transition-all duration-300 group relative"
          onclick={() => (uiStore.showDiceModal = true)}
          aria-label="Open Die Roller"
          title="Open Die Roller"
          data-testid="dice-roller-button"
        >
          <span
            class="icon-[lucide--dices] w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110"
          ></span>
        </button>

        <h1
          class="text-lg md:text-xl font-bold text-theme-text font-mono tracking-wide flex items-center gap-2 md:gap-3 shrink-0"
        >
          <span class="icon-[lucide--book-open] text-theme-primary w-5 h-5"
          ></span>
          <span class="hidden sm:inline">Codex Cryptica</span>
          <span class="sm:hidden text-theme-primary">CC</span>
        </h1>

        <nav
          class="hidden md:flex items-center gap-1 ml-4 border-l border-theme-border pl-4 relative z-10"
        >
          <a
            href="{base}/"
            class="px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-colors {page
              .url.pathname === `${base}/`
              ? 'bg-theme-primary/10 text-theme-primary'
              : 'text-theme-muted hover:text-theme-text'}"
          >
            GRAPH
          </a>
          <a
            href="{base}/map"
            class="px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-colors {page.url.pathname.startsWith(
              `${base}/map`,
            )
              ? 'bg-theme-primary/10 text-theme-primary'
              : 'text-theme-muted hover:text-theme-text'}"
          >
            MAP
          </a>
          <a
            href="{base}/canvas"
            class="px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-colors {page.url.pathname.startsWith(
              `${base}/canvas`,
            )
              ? 'bg-theme-primary/10 text-theme-primary'
              : 'text-theme-muted hover:text-theme-text'}"
          >
            CANVAS
          </a>
        </nav>
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
          class="w-8 h-8 flex items-center justify-center border transition-all {uiStore.showSettings
            ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
            : 'border-theme-border hover:border-theme-primary text-theme-muted hover:text-theme-primary'} relative"
          onclick={() => uiStore.toggleSettings("vault")}
          title="Application Settings"
          aria-label="Open Application Settings"
          data-testid="settings-button"
        >
          <span class="w-5 h-5 icon-[lucide--settings]"></span>
        </button>
      </div>
    </header>
  {/if}

  <div class="flex-1 flex flex-row min-h-0 relative overflow-hidden">
    {#if uiStore.leftSidebarOpen}
      {#if uiStore.activeSidebarTool === "oracle" && OracleSidebarPanel}
        <OracleSidebarPanel />
      {/if}
    {/if}

    <main
      class="flex-1 relative flex flex-col min-h-0 {isMarketingPage || isPopup
        ? 'overflow-y-auto'
        : ''}"
    >
      {@render children()}
    </main>
  </div>

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
        {#if DISCORD_URL}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="text-[10px] font-mono text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
            >Discord</a
          >
        {/if}
        <a
          href="{base}/features"
          class="text-[10px] font-mono text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
          >Features</a
        >
        <a
          href="{base}/blog"
          class="text-[10px] font-mono text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest"
          >Blog</a
        >
        <button
          onclick={() => uiStore.openSettings("help")}
          class="text-[10px] font-mono text-theme-secondary hover:text-theme-primary transition-colors uppercase tracking-widest cursor-pointer"
          >Help</button
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
        {#if BulkLabelDialog}
          <BulkLabelDialog
            isOpen={uiStore.bulkLabelDialog.open}
            entityIds={uiStore.bulkLabelDialog.entityIds}
            onClose={() => uiStore.closeBulkLabelDialog()}
          />
        {/if}
        {#if DiceModal}
          <DiceModal />
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
    font-family: var(--theme-font-body, ui-sans-serif);
  }
</style>
