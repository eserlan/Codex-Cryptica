<script lang="ts">
  import "../app.css";
  import { aiService } from "$lib/services/ai";
  import VaultControls from "$lib/components/VaultControls.svelte";
  import SearchModal from "$lib/components/search/SearchModal.svelte";
  import OracleWindow from "$lib/components/oracle/OracleWindow.svelte";
  import SettingsModal from "$lib/components/settings/SettingsModal.svelte";
  import ZenModeModal from "$lib/components/modals/ZenModeModal.svelte";
  import TourOverlay from "$lib/components/help/TourOverlay.svelte";
  import MobileMenu from "$lib/components/layout/MobileMenu.svelte";
  import DebugConsole from "$lib/components/debug/DebugConsole.svelte";
  import MergeNodesDialog from "$lib/components/dialogs/MergeNodesDialog.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { graph } from "$lib/stores/graph.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { timelineStore } from "$lib/stores/timeline.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { searchStore } from "$lib/stores/search";
  import { helpStore } from "$lib/stores/help.svelte";
  import { HELP_ARTICLES } from "$lib/config/help-content";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { syncStats } from "$lib/stores/sync-stats";
  import { cloudConfig } from "$lib/stores/cloud-config";
  import { workerBridge } from "$lib/cloud-bridge/worker-bridge";
  import { isEntityVisible } from "schema";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import { browser } from "$app/environment";
  import { PATREON_URL } from "$lib/config";
  let { children } = $props();

  const isPopup = $derived(page.url.pathname === `${base}/oracle`);

  let isMobileMenuOpen = $state(false);

  const _handleJoin = async (_username: string) => {
    // Guest mode temporarily disabled
  };

  onMount(() => {
    categories.init();
    helpStore.init();
    themeStore.init();
    timelineStore.init();
    graph.init();

    // Standard Initialization
    vault
      .init()
      .then(() => {
        // Trigger onboarding for new users after vault has initialized
        if (
          !helpStore.hasSeen("initial-onboarding") &&
          !(window as any).DISABLE_ONBOARDING
        ) {
          helpStore.startTour("initial-onboarding");
        }
      })
      .catch((error) => {
        console.error("Vault initialization failed", error);
      });

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

      // Filter out common network errors that aren't fatal to the app logic
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

    // Expose for E2E testing
    if (import.meta.env.DEV || (window as any).__E2E__) {
      (window as any).searchStore = searchStore;
      (window as any).vault = vault;
      (window as any).graph = graph;
      (window as any).oracle = oracle;
      (window as any).aiService = aiService;
      (window as any).categories = categories;
      (window as any).uiStore = uiStore;
      (window as any).syncStats = syncStats;
      (window as any).cloudConfig = cloudConfig;
      (window as any).workerBridge = workerBridge;
      (window as any).isEntityVisible = isEntityVisible;
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
        // Validate article exists
        const exists = HELP_ARTICLES.some((a) => a.id === articleId);
        if (exists) {
          // Small delay to ensure UI components are ready to receive state changes
          const timer = setTimeout(() => {
            helpStore.openHelpToArticle(articleId);
          }, 100);
          return () => clearTimeout(timer);
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

<div class="app-layout min-h-screen bg-black flex flex-col">
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
            value={$searchStore.query}
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
      <OracleWindow />
      {#if browser}
        <SettingsModal />
        <ZenModeModal />
        <TourOverlay />
        <MobileMenu bind:isOpen={isMobileMenuOpen} />
        <MergeNodesDialog
          isOpen={uiStore.mergeDialog.open}
          sourceNodeIds={uiStore.mergeDialog.sourceIds}
          onClose={() => uiStore.closeMergeDialog()}
        />
        {#if import.meta.env.DEV || (typeof window !== "undefined" && (window as any).__E2E__) || import.meta.env.VITE_STAGING === "true"}
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
