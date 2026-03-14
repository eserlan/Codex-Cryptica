<script lang="ts">
  import "../app.css";
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { createGlobalShortcutHandler } from "$lib/actions/useGlobalShortcuts";
  import {
    bootWorkspaceStores,
    createGlobalErrorHandlers,
    exposeE2EGlobals,
    initializeShellServices,
    maybeStartOnboardingOrDemo,
    openHelpArticleFromHash,
    registerProductionServiceWorker,
  } from "$lib/app/init/app-init";
  import VaultControls from "$lib/components/VaultControls.svelte";
  import GlobalModalProvider from "$lib/components/modals/GlobalModalProvider.svelte";
  import { DISCORD_URL, PATREON_URL } from "$lib/config";
  import { demoService } from "$lib/services/demo";
  import { helpStore } from "$lib/stores/help.svelte";
  import { searchStore } from "$lib/stores/search.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { debugStore } from "$lib/stores/debug.svelte";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";

  let { children } = $props();

  let OracleSidebarPanel = $state<any>(null);

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
  let hasBooted = $state(false);
  let lastDemoQueryParam: string | null = null;
  let headerEl = $state<HTMLElement>();

  $effect(() => {
    if (uiStore.activeSidebarTool === "oracle" && !OracleSidebarPanel) {
      import("$lib/components/oracle/OracleSidebarPanel.svelte")
        .then((module) => (OracleSidebarPanel = module.default))
        .catch((error) =>
          debugStore.error("Lazy load failed: OracleSidebarPanel", error),
        );
    }
  });

  function bootSystem() {
    if (hasBooted) return;
    hasBooted = true;
    bootWorkspaceStores();
  }

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
        bootSystem();
      } else if (isWorkspaceRoute && page.url.pathname !== `${base}/`) {
        uiStore.dismissedLandingPage = true;
        bootSystem();
      }
    }
  });

  onMount(() => {
    initializeShellServices();
    registerProductionServiceWorker();

    const { handleGlobalError, handleUnhandledRejection, handleVaultSwitched } =
      createGlobalErrorHandlers();

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("vault-switched", handleVaultSwitched);

    exposeE2EGlobals();

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      window.removeEventListener("vault-switched", handleVaultSwitched);
    };
  });

  $effect(() => {
    if (!helpStore.isInitialized) return;
    return openHelpArticleFromHash(page.url.hash) ?? undefined;
  });

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

  $effect(() => {
    const demoTheme = page.url.searchParams.get("demo");

    if (!demoTheme) {
      lastDemoQueryParam = null;
      return;
    }

    if (demoTheme === lastDemoQueryParam) {
      return;
    }

    lastDemoQueryParam = demoTheme;

    if (!uiStore.wasConverted) {
      demoService.startDemo(demoTheme);
    }
  });

  $effect(() => {
    if (vault.isInitialized && !uiStore.isLandingPageVisible) {
      const isTesting =
        typeof window !== "undefined" && (window as any).DISABLE_ONBOARDING;
      maybeStartOnboardingOrDemo(isTesting, page.url.searchParams.has("demo"));
    }
  });

  const handleKeydown = createGlobalShortcutHandler();
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

    <GlobalModalProvider {isPopup} bind:isMobileMenuOpen />
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
