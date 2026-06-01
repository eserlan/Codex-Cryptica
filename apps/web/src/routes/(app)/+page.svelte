<script lang="ts">
  import { onMount } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import { fade } from "svelte/transition";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { demoService } from "$lib/services/demo";
  import { building, browser } from "$app/environment";
  import { SCHEMA_ORG } from "$lib/config";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { focusEntity } from "$lib/stores/ui/navigation";

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
    onboardingStore.dismissWorldPage();
  };

  const handleFrontPageOverlayKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // 0. If settings or dice modal is open, let them handle Escape
      if (modalUIStore.showSettings || modalUIStore.showDiceModal) return;

      // 1. If an entity is focused (EmbeddedEntityView), close it
      if (layoutUIStore.mainViewMode === "focus") {
        focusEntity(null);
        return;
      }

      // 2. If an entity is selected in the graph (EntityDetailPanel), deselect it
      if (vault.selectedEntityId) {
        vault.selectedEntityId = null;
        return;
      }

      // 3. If the front page is visible, dismiss it
      if (
        !onboardingStore.isLandingPageVisible &&
        !onboardingStore.dismissedWorldPage &&
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
      browser && (!onboardingStore.isLandingPageVisible || isGuestMode);
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
  {#if !isGuestMode && onboardingStore.isLandingPageVisible && (building || !page.url.searchParams.has("demo"))}
    <script type="application/ld+json">
      {JSON.stringify(schemaOrg)}
    </script>
  {/if}
</svelte:head>

<svelte:window onkeydown={handleFrontPageOverlayKeydown} />

<div
  class="h-[var(--app-content-height)] flex bg-chrome-bg text-chrome-text overflow-hidden relative"
>
  <div class="flex-1 relative overflow-hidden">
    {#if layoutUIStore.mainViewMode === "focus" && layoutUIStore.focusedEntityId && EmbeddedEntityView}
      <EmbeddedEntityView entityId={layoutUIStore.focusedEntityId} />
    {:else if GraphView && (vault.isInitialized || vault.status === "loading" || isGuestMode)}
      {#key vault.activeVaultId}
        <GraphView bind:selectedId={vault.selectedEntityId} />
      {/key}
    {:else if !onboardingStore.isLandingPageVisible || (!building && page.url.searchParams.has("demo"))}
      <div
        class="absolute inset-0 bg-chrome-bg flex items-center justify-center"
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

  {#if EntityDetailPanel}
    <EntityDetailPanel
      entity={selectedEntity}
      onClose={() => (vault.selectedEntityId = null)}
    />
  {/if}

  <!-- Vault Front Page Overlay -->
  {#if FrontPage && vault.isInitialized && onboardingStore.skipWelcomeScreen && !onboardingStore.dismissedWorldPage && !selectedEntity}
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
          const t = event.target as HTMLElement;
          if (
            t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.isContentEditable
          )
            return;
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
  {#if !isGuestMode && onboardingStore.isLandingPageVisible && (building || !page.url.searchParams.has("demo"))}
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
            class="inline-flex items-center gap-2.5 px-4 py-2 mb-6 border border-theme-primary/40 bg-theme-primary/10 rounded-full text-[11px] md:text-sm font-mono text-theme-primary uppercase tracking-[0.12em]"
          >
            <span class="w-2 h-2 rounded-full bg-theme-primary/60 animate-pulse"
            ></span>
            Your vault stays local • Optional AI • No account required
          </div>
          <h2
            class="text-4xl md:text-7xl font-bold text-theme-text font-header tracking-tight mb-6 leading-tight"
          >
            Build Your World. <br />
            <span class="text-theme-primary/90">Map Your Lore.</span>
          </h2>
          <p
            class="text-lg md:text-2xl text-theme-muted max-w-2xl mx-auto leading-relaxed mb-12 font-body font-light"
          >
            Turn scattered campaign notes into a private, connected visual vault
            for characters, factions, locations, secrets, and timelines.
          </p>

          <div class="flex flex-col items-center justify-center">
            <button
              onclick={() => demoService.startDemo("fantasy")}
              class="px-12 py-5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-[0.2em] text-sm rounded-lg hover:bg-theme-primary/90 hover:shadow-[0_0_30px_var(--color-accent-primary)] transition-all active:scale-95"
              data-testid="welcome-demo-button"
            >
              Explore Demo Vault
            </button>
            <p class="mt-3 text-sm text-theme-muted/90 font-body">
              No setup required. Opens a prebuilt sample world instantly.
            </p>

            <div
              class="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
            >
              <button
                onclick={() => {
                  onboardingStore.dismissLandingPage();
                  modalUIStore.openVaultSwitcher("create");
                }}
                class="px-8 py-3 border border-theme-border text-theme-muted hover:text-theme-primary hover:border-theme-primary/60 font-bold uppercase font-header tracking-[0.18em] text-xs rounded-lg transition-all active:scale-95"
                data-testid="welcome-create-button"
              >
                Create New Vault
              </button>
              <button
                onclick={() => {
                  onboardingStore.dismissLandingPage();
                  modalUIStore.openVaultSwitcher("open");
                }}
                class="px-8 py-3 border border-theme-border text-theme-muted hover:text-theme-primary hover:border-theme-primary/60 font-bold uppercase font-header tracking-[0.18em] text-xs rounded-lg transition-all active:scale-95"
                data-testid="welcome-open-button"
              >
                Open Existing Vault
              </button>
            </div>
          </div>

          <!-- Product preview: connected graph + entity sidebar -->
          <div
            class="mt-14 mx-auto max-w-3xl rounded-xl border border-theme-border bg-theme-surface/60 shadow-2xl shadow-theme-primary/5 overflow-hidden"
            aria-hidden="true"
          >
            <div
              class="flex items-center gap-1.5 px-3 py-2 border-b border-theme-border bg-theme-bg/60"
            >
              <span class="w-2.5 h-2.5 rounded-full bg-theme-primary/40"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-theme-primary/25"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-theme-primary/15"></span>
              <span
                class="ml-2 text-[9px] font-mono text-theme-muted uppercase tracking-[0.2em]"
                >Living Lore Graph</span
              >
            </div>
            <div class="flex h-56 md:h-64">
              <!-- Graph canvas -->
              <div class="relative flex-1">
                <svg
                  viewBox="0 0 400 260"
                  class="absolute inset-0 w-full h-full"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <g
                    stroke="var(--color-accent-primary)"
                    stroke-opacity="0.35"
                    stroke-width="1.5"
                  >
                    <line x1="200" y1="130" x2="110" y2="70" />
                    <line x1="200" y1="130" x2="300" y2="80" />
                    <line x1="200" y1="130" x2="120" y2="190" />
                    <line x1="200" y1="130" x2="290" y2="195" />
                    <line x1="110" y1="70" x2="300" y2="80" />
                    <line x1="120" y1="190" x2="290" y2="195" />
                  </g>
                  <g fill="var(--color-accent-primary)">
                    <circle cx="200" cy="130" r="14" fill-opacity="0.9" />
                    <circle cx="110" cy="70" r="9" fill-opacity="0.55" />
                    <circle cx="300" cy="80" r="9" fill-opacity="0.55" />
                    <circle cx="120" cy="190" r="9" fill-opacity="0.55" />
                    <circle cx="290" cy="195" r="9" fill-opacity="0.55" />
                  </g>
                  <g
                    font-family="var(--font-body, sans-serif)"
                    font-size="9"
                    text-anchor="middle"
                  >
                    <text
                      x="200"
                      y="158"
                      fill="var(--color-text, #fff)"
                      fill-opacity="0.85"
                      font-weight="600">Captain Veyra</text
                    >
                    <text
                      x="110"
                      y="56"
                      fill="var(--color-text-muted, #aaa)"
                      fill-opacity="0.7">Glass Rebellion</text
                    >
                    <text
                      x="300"
                      y="66"
                      fill="var(--color-text-muted, #aaa)"
                      fill-opacity="0.7">Sunken Archive</text
                    >
                    <text
                      x="120"
                      y="212"
                      fill="var(--color-text-muted, #aaa)"
                      fill-opacity="0.7">Crown Secret</text
                    >
                    <text
                      x="290"
                      y="217"
                      fill="var(--color-text-muted, #aaa)"
                      fill-opacity="0.7">Blackspire Compact</text
                    >
                  </g>
                </svg>
              </div>
              <!-- Entity sidebar -->
              <div
                class="w-40 md:w-48 shrink-0 border-l border-theme-border bg-theme-bg/50 p-3 text-left"
              >
                <div
                  class="w-10 h-10 rounded-lg bg-theme-primary/15 mb-2 flex items-center justify-center"
                >
                  <span
                    class="icon-[lucide--user-round] w-5 h-5 text-theme-primary/70"
                  ></span>
                </div>
                <div class="text-xs font-bold text-theme-text leading-tight">
                  Captain Veyra
                </div>
                <div
                  class="text-[9px] font-mono text-theme-muted uppercase tracking-[0.15em] mb-4"
                >
                  Character
                </div>
                <div class="space-y-1.5">
                  <div class="h-1.5 w-full rounded bg-theme-muted/20"></div>
                  <div class="h-1.5 w-5/6 rounded bg-theme-muted/20"></div>
                  <div class="h-1.5 w-full rounded bg-theme-muted/20"></div>
                  <div class="h-1.5 w-2/3 rounded bg-theme-muted/20"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-10 flex flex-col items-center gap-4">
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
                checked={onboardingStore.skipWelcomeScreen}
                onchange={(e) =>
                  onboardingStore.toggleWelcomeScreen(e.currentTarget.checked)}
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
