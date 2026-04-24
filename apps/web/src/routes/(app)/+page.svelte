<script lang="ts">
  import { onMount } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { fade } from "svelte/transition";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { demoService } from "$lib/services/demo";
  import { building, browser } from "$app/environment";
  import { SCHEMA_ORG } from "$lib/config";

  const isSpecialEnv =
    import.meta.env.DEV ||
    (typeof window !== "undefined" && (window as any).__E2E__) ||
    import.meta.env.VITE_STAGING === "true";

  const demoThemes = [
    "vampire",
    "scifi",
    "cyberpunk",
    "wasteland",
    "modern",
    "fallout",
    "starwars",
    "startrek",
  ];
  const schemaOrg = SCHEMA_ORG;
  void schemaOrg;

  const logChunkError = (name: string, error: any) => {
    if (isSpecialEnv) {
      console.error(`Failed to load ${name}`, error);
    } else {
      import("$lib/stores/debug.svelte")
        .then((m) => {
          if (m?.debugStore) {
            m.debugStore.error(`Failed to lazy-load component: ${name}`, error);
          }
        })
        .catch((e) => {
          console.error(
            `Failed to lazy-load component: ${name} (and debug store failed too)`,
            error,
            e,
          );
        });
    }
  };

  // Lazy load components when needed using relative paths for reliable resolution
  function loadHeavyComponents() {
    if (!GraphView) {
      import("../../lib/components/GraphView.svelte")
        .then((m) => (GraphView = m?.default))
        .catch((err) => logChunkError("GraphView", err));
    }
    if (!FrontPage) {
      import("../../lib/components/world/FrontPage.svelte")
        .then((m) => (FrontPage = m?.default))
        .catch((err) => logChunkError("FrontPage", err));
    }
    if (!EntityDetailPanel) {
      import("../../lib/components/EntityDetailPanel.svelte")
        .then((m) => (EntityDetailPanel = m?.default))
        .catch((err) => logChunkError("EntityDetailPanel", err));
    }
    if (!EmbeddedEntityView) {
      import("../../lib/components/entity/EmbeddedEntityView.svelte")
        .then((m) => (EmbeddedEntityView = m?.default))
        .catch((err) => logChunkError("EmbeddedEntityView", err));
    }
  }

  // Dynamic imports for heavy components
  let GraphView = $state<any>(null);
  let FrontPage = $state<any>(null);
  let EntityDetailPanel = $state<any>(null);
  let EmbeddedEntityView = $state<any>(null);

  let selectedEntity = $derived.by(() => {
    const id = vault.selectedEntityId;
    return id ? vault.entities[id] : null;
  });

  const dismissFrontPageOverlay = () => {
    uiStore.dismissWorldPage();
  };

  const handleFrontPageOverlayKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // 0. If settings or dice modal is open, let them handle Escape
      if (uiStore.showSettings || uiStore.showDiceModal) return;

      // 1. If an entity is focused (EmbeddedEntityView), close it
      if (uiStore.mainViewMode === "focus") {
        uiStore.focusEntity(null);
        return;
      }

      // 2. If an entity is selected in the graph (EntityDetailPanel), deselect it
      if (vault.selectedEntityId) {
        vault.selectedEntityId = null;
        return;
      }

      // 3. If the front page is visible, dismiss it
      if (
        !uiStore.isLandingPageVisible &&
        !uiStore.dismissedWorldPage &&
        !selectedEntity
      ) {
        dismissFrontPageOverlay();
      }
    }
  };

  // Check if we're in guest/share mode - guard for prerendering
  const shareId = $derived(
    building ? null : page.url.searchParams.get("shareId"),
  );
  const isGuestMode = $derived(!!shareId);

  onMount(() => {
    // Eagerly prefetch the heavy components in the background a second after boot
    // to eliminate the 10-15s dev-mode lag when clicking an entity for the first time.
    setTimeout(() => {
      loadHeavyComponents();
    }, 1000);
  });

  // Consolidate reactive pre-loading and fallback loading into a single effect
  // to prevent race conditions during dynamic imports.
  $effect(() => {
    const isSkippingLanding =
      browser && (!uiStore.isLandingPageVisible || isGuestMode);
    const isVaultReady = vault.isInitialized || isGuestMode;

    if (
      (isSkippingLanding || isVaultReady) &&
      (!GraphView || !FrontPage || !EntityDetailPanel || !EmbeddedEntityView)
    ) {
      loadHeavyComponents();
    }
  });
</script>

<svelte:head>
  {#if !isGuestMode && uiStore.isLandingPageVisible && (building || !page.url.searchParams.has("demo"))}
    <script type="application/ld+json">
      {JSON.stringify(schemaOrg)}
    </script>
  {/if}
</svelte:head>

<svelte:window onkeydown={handleFrontPageOverlayKeydown} />

<div
  class="h-[calc(100vh-var(--header-height,65px))] flex bg-theme-bg overflow-hidden relative"
>
  <div class="flex-1 relative overflow-hidden">
    {#if uiStore.mainViewMode === "focus" && uiStore.focusedEntityId && EmbeddedEntityView}
      <EmbeddedEntityView entityId={uiStore.focusedEntityId} />
    {:else if GraphView && (vault.isInitialized || vault.status === "loading" || isGuestMode)}
      {#key vault.activeVaultId}
        <GraphView bind:selectedId={vault.selectedEntityId} />
      {/key}
    {:else if !uiStore.isLandingPageVisible || (!building && page.url.searchParams.has("demo"))}
      <div
        class="absolute inset-0 bg-theme-bg flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          class="text-theme-muted font-mono text-xs animate-pulse uppercase tracking-widest"
        >
          {themeStore.resolveJargon("graph_loading")}
        </div>
      </div>
    {/if}
  </div>

  {#if selectedEntity && EntityDetailPanel}
    <EntityDetailPanel
      entity={selectedEntity}
      onClose={() => (vault.selectedEntityId = null)}
    />
  {/if}

  <!-- Vault Front Page Overlay -->
  {#if FrontPage && vault.isInitialized && uiStore.skipWelcomeScreen && !uiStore.dismissedWorldPage && !selectedEntity}
    <div
      data-testid="front-page-overlay"
      class={`absolute inset-0 z-40 overflow-y-auto p-4 md:p-6 bg-theme-bg/96 backdrop-blur-sm ${selectedEntity ? "pointer-events-none" : ""}`}
      style:background-image="var(--bg-texture-overlay)"
      role="button"
      tabindex="0"
      aria-label="Dismiss front page"
      onclick={(event) => {
        if (event.currentTarget === event.target) {
          dismissFrontPageOverlay();
        }
      }}
      onkeydown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          dismissFrontPageOverlay();
        }
      }}
      transition:fade
    >
      <div class="max-w-7xl mx-auto w-full">
        {#key vault.activeVaultId}
          <FrontPage onClose={dismissFrontPageOverlay} />
        {/key}
      </div>
    </div>
  {/if}

  <!-- Marketing Layer -->
  {#if !isGuestMode && uiStore.isLandingPageVisible && (building || !page.url.searchParams.has("demo"))}
    <div
      class="marketing-layer absolute inset-0 z-30 bg-theme-bg backdrop-blur-sm overflow-y-auto"
      style:background-image="var(--bg-texture-overlay)"
      transition:fade
    >
      <div
        class="max-w-5xl mx-auto px-6 py-16 md:py-24 flex flex-col min-h-full justify-center"
      >
        <header class="mb-16 text-center">
          <div
            class="inline-flex items-center gap-2 px-4 py-1.5 mb-6 border border-theme-primary/30 bg-theme-primary/5 rounded-full text-[10px] font-mono text-theme-primary uppercase tracking-[0.2em]"
          >
            <span class="w-2 h-2 rounded-full bg-theme-primary/50 animate-pulse"
            ></span>
            System Online
          </div>
          <h2
            class="text-5xl md:text-8xl font-bold text-theme-text font-header tracking-tight mb-6 leading-tight"
          >
            Build Your World. <br />
            <span class="text-theme-primary/90">Map Your Lore.</span>
          </h2>
          <p
            class="text-xl md:text-2xl text-theme-muted max-w-2xl mx-auto leading-relaxed mb-12 font-body font-light"
          >
            Codex Cryptica is a private campaign manager for lore keepers who
            value total privacy, speed, and visual organization.
          </p>

          <div
            class="flex flex-col md:flex-row items-center justify-center gap-6"
          >
            <button
              onclick={() => {
                uiStore.dismissLandingPage();
              }}
              class="px-12 py-5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-[0.2em] text-sm rounded-lg hover:bg-theme-primary/90 hover:shadow-[0_0_30px_var(--color-accent-primary)] transition-all active:scale-95"
            >
              Enter the Codex
            </button>
            <button
              onclick={() => demoService.startDemo("fantasy")}
              class="px-12 py-5 border border-theme-primary/50 text-theme-primary font-bold uppercase font-header tracking-[0.2em] text-sm rounded-lg hover:bg-theme-primary/10 transition-all active:scale-95"
            >
              Try Demo
            </button>
          </div>

          <div class="mt-8 flex flex-col items-center gap-4">
            <a
              href="{base}/features"
              class="inline-flex items-center gap-2 text-theme-primary hover:text-theme-primary/80 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
            >
              <span class="icon-[lucide--zap] w-3 h-3"></span>
              View Features Overview
            </a>

            <a
              href="{base}/changelog"
              class="inline-flex items-center gap-2 text-theme-primary/60 hover:text-theme-primary font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
            >
              <span class="icon-[lucide--history] w-3 h-3"></span>
              View Full Changelog
            </a>

            <div
              class="flex items-center gap-3 bg-theme-surface/50 px-4 py-2 rounded-lg border border-theme-border/30"
            >
              <input
                type="checkbox"
                id="skip-welcome"
                checked={uiStore.skipWelcomeScreen}
                onchange={(e) =>
                  uiStore.toggleWelcomeScreen(e.currentTarget.checked)}
                class="w-4 h-4 accent-theme-primary cursor-pointer"
              />
              <label
                for="skip-welcome"
                class="text-[10px] font-body text-theme-muted uppercase tracking-widest cursor-pointer hover:text-theme-primary transition-colors select-none"
              >
                Hide welcome screen on startup
              </label>
            </div>
          </div>
        </header>

        <section id="features" class="grid md:grid-cols-3 gap-8 mb-12">
          <!-- Feature 1: Privacy -->
          <div
            class="p-8 bg-theme-surface border border-theme-border rounded-xl hover:border-theme-primary/50 hover:shadow-lg hover:shadow-theme-primary/5 transition-all group"
          >
            <div
              class="w-14 h-14 mb-6 rounded-2xl bg-theme-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
            >
              <span
                class="icon-[lucide--shield-check] text-theme-primary w-7 h-7"
              ></span>
            </div>
            <h3
              class="text-xl font-bold text-theme-text mb-3 uppercase font-header tracking-wide"
            >
              Total Privacy
            </h3>
            <p class="text-theme-muted leading-relaxed font-body">
              Your {themeStore.resolveJargon("entity", 2).toLowerCase()} never leave
              your device. We use local storage for maximum security. No cloud accounts
              required.
            </p>
          </div>

          <!-- Feature 2: AI -->
          <div
            class="p-8 bg-theme-surface border border-theme-border rounded-xl hover:border-theme-primary/50 hover:shadow-lg hover:shadow-theme-primary/5 transition-all group"
          >
            <div
              class="w-14 h-14 mb-6 rounded-2xl bg-theme-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
            >
              <span class="icon-[lucide--brain] text-theme-primary w-7 h-7"
              ></span>
            </div>
            <h3
              class="text-xl font-bold text-theme-text mb-3 uppercase font-header tracking-wide"
            >
              AI Oracle
            </h3>
            <p class="text-theme-muted leading-relaxed font-body">
              Discover hidden connections and generate immersive descriptions
              while maintaining your world's unique voice.
            </p>
          </div>

          <!-- Feature 3: Visual Links -->
          <div
            class="p-8 bg-theme-surface border border-theme-border rounded-xl hover:border-theme-primary/50 hover:shadow-lg hover:shadow-theme-primary/5 transition-all group"
          >
            <div
              class="w-14 h-14 mb-6 rounded-2xl bg-theme-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
            >
              <span class="icon-[lucide--share-2] text-theme-primary w-7 h-7"
              ></span>
            </div>
            <h3
              class="text-xl font-bold text-theme-text mb-3 uppercase font-header tracking-wide"
            >
              Visual Graph
            </h3>
            <p class="text-theme-muted leading-relaxed font-body mb-4">
              Navigate your lore through a dynamic, interactive map. See exactly
              how characters, locations, and events intertwine.
            </p>
          </div>
        </section>

        <section class="text-center mb-12">
          <h3
            class="text-[10px] font-mono text-theme-muted uppercase tracking-[0.3em] mb-6"
          >
            Try it as:
          </h3>
          <div class="flex flex-wrap justify-center gap-4">
            {#each demoThemes as theme (theme)}
              <button
                onclick={() => demoService.startDemo(theme)}
                class="px-4 py-2 text-[10px] font-bold border border-theme-border hover:border-theme-primary text-theme-muted hover:text-theme-primary rounded uppercase font-header tracking-widest transition-all"
              >
                {theme}
              </button>
            {/each}
          </div>
        </section>
      </div>
    </div>
  {/if}
</div>
