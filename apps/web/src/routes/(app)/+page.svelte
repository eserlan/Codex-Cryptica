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
  import { safeJsonLd } from "$lib/utils/json-ld";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { DEFAULT_CATEGORIES } from "schema";
  import { focusEntity } from "$lib/stores/ui/navigation";
  import { seoImportService } from "$lib/services/seo/import-handler";

  // Entity-type colors for the welcome graph preview, sourced from the same
  // canonical palette the real graph uses so the teaser matches the product.
  const typeColor = (id: string) =>
    DEFAULT_CATEGORIES.find((c) => c.id === id)?.color ?? "#94a3b8";
  const PREVIEW_COLORS = {
    character: typeColor("character"),
    faction: typeColor("faction"),
    location: typeColor("location"),
    event: typeColor("event"),
  };
  // Brand accent used purely to denote the *selected* node (matches the CTA),
  // not an entity type.
  const SELECT_ACCENT = "#e6b450";

  // Secondary welcome actions (create / open) — both dismiss the landing page
  // and open the vault switcher with the matching intent.
  const openVaultFromWelcome = (intent: "create" | "open") => {
    onboardingStore.dismissLandingPage();
    modalUIStore.openVaultSwitcher(intent);
  };
  const secondaryActions = [
    {
      intent: "create" as const,
      label: "Create New Vault",
      testid: "welcome-create-button",
    },
    {
      intent: "open" as const,
      label: "Open Existing Vault",
      testid: "welcome-open-button",
    },
  ];

  const isSpecialEnv =
    import.meta.env.DEV || import.meta.env.VITE_STAGING === "true";

  const demoThemes = [
    "vampire",
    "sci-fi",
    "cyberpunk",
    "wasteland",
    "modern",
    "space opera",
    "starfleet",
    "post-nuclear",
  ];
  const agenticProofPoints = [
    {
      icon: "icon-[lucide--hard-drive]",
      label: "Local-first vault",
      copy: "Your campaign lives in browser-local storage, not a hosted notes silo.",
    },
    {
      icon: "icon-[lucide--network]",
      label: "Spatial lore graph",
      copy: "Connect people, places, factions, secrets, maps, and timelines visually.",
    },
    {
      icon: "icon-[lucide--sparkles]",
      label: "Optional AI",
      copy: "Use the Lore Oracle when helpful; the vault works without AI or an account.",
    },
  ];
  const schemaOrgString = $derived(safeJsonLd(SCHEMA_ORG));

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
    if (!GuestChatPanel) {
      import("../../lib/components/guest/GuestChatPanel.svelte")
        .then((m) => (GuestChatPanel = m?.default))
        .catch((err) => logChunkError("GuestChatPanel", err));
    }
  }

  // Dynamic imports for heavy components
  let GraphView = $state<any>(null);
  let FrontPage = $state<any>(null);
  let EntityDetailPanel = $state<any>(null);
  let EmbeddedEntityView = $state<any>(null);
  let GuestChatPanel = $state<any>(null);

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
    // Suppress guide immediately if arriving from the importer — before the
    // async import completes, so the guide never flashes over the vault.
    if (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("__codex_pending_import")
    ) {
      onboardingStore.dismissLandingPage();
      onboardingStore.dismissWorldPage();
    }

    // Check for pending import from generator onboarding funnel
    void seoImportService.checkAndHandlePendingImport().then((importedId) => {
      if (importedId) {
        onboardingStore.dismissLandingPage();
        onboardingStore.dismissWorldPage();
      }
    });

    // Eagerly prefetch the heavy components in the background a second after boot
    // to eliminate the 10-15s dev-mode lag when clicking an entity for the first time.
    const prefetchTimer = setTimeout(() => {
      loadHeavyComponents();
    }, 1000);

    return () => {
      clearTimeout(prefetchTimer);
    };
  });

  // Consolidate reactive pre-loading and fallback loading into a single effect
  // to prevent race conditions during dynamic imports.
  $effect(() => {
    const isSkippingLanding =
      browser && (!onboardingStore.isLandingPageVisible || isGuestMode);
    const isVaultReady = vault.isInitialized || isGuestMode;

    if (
      (isSkippingLanding || isVaultReady) &&
      (!GraphView ||
        !FrontPage ||
        !EntityDetailPanel ||
        !EmbeddedEntityView ||
        !GuestChatPanel)
    ) {
      loadHeavyComponents();
    }
  });
</script>

<svelte:head>
  {#if !isGuestMode && (building || !page.url.searchParams.has("demo"))}
    <title
      >Codex Cryptica — Local-First RPG Campaign Manager & Worldbuilding Tool</title
    >
    <meta
      name="description"
      content="Codex Cryptica is a free, local-first RPG campaign manager and worldbuilding tool for GMs: private Markdown notes, visual lore graphs, timelines, offline prep, and optional AI — all in your browser."
    />
    <link rel="canonical" href="https://codexcryptica.com/" />
  {/if}
  {#if !isGuestMode && onboardingStore.isLandingPageVisible && (building || !page.url.searchParams.has("demo"))}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html `<scr` +
      `ipt type="application/ld+json">${schemaOrgString}</scr` +
      `ipt>`}
  {/if}
</svelte:head>

<svelte:window onkeydown={handleFrontPageOverlayKeydown} />

<div
  class="h-[var(--app-content-height)] flex bg-chrome-bg text-chrome-text overflow-hidden relative"
>
  <div class="flex-1 relative overflow-hidden">
    {#if !layoutUIStore.isEntityExplorerWorkspace && layoutUIStore.mainViewMode === "focus" && layoutUIStore.focusedEntityId && EmbeddedEntityView}
      <EmbeddedEntityView entityId={layoutUIStore.focusedEntityId} />
    {:else if layoutUIStore.mainViewMode === "guest-chat" && GuestChatPanel}
      <div class="absolute inset-0 p-4 md:p-6 bg-chrome-bg">
        <GuestChatPanel />
      </div>
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
        if (
          (event.key === "Enter" || event.key === " ") &&
          event.target === event.currentTarget
        ) {
          event.preventDefault();
          dismissFrontPageOverlay();
        }
      }}
      transition:fade
    >
      <div class="max-w-7xl mx-auto w-full pb-20 md:pb-0">
        {#key vault.activeVaultId}
          <FrontPage onClose={dismissFrontPageOverlay} />
        {/key}
      </div>
      <!-- Sticky "Enter your world" footer — mobile-only, so the overlay is always dismissible (#1298) -->
      <div
        class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-theme-bg/90 backdrop-blur-sm border-t border-theme-border/40"
        style="padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom))"
      >
        <button
          class="w-full flex items-center justify-center gap-2 rounded-xl bg-theme-primary text-theme-bg font-bold uppercase tracking-wider text-sm py-3 transition active:scale-95"
          onclick={dismissFrontPageOverlay}
          data-testid="enter-world-button"
        >
          Enter your world
          <span class="icon-[lucide--arrow-right] h-4 w-4"></span>
        </button>
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
        class="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-24 md:py-20 flex flex-col min-h-full justify-start md:justify-center items-center"
        style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 5rem)"
      >
        <section class="mb-10 md:mb-16 w-full">
          <div
            class="mx-auto flex w-full max-w-6xl flex-col items-center text-center"
          >
            <div
              class="inline-flex items-center gap-2 px-3.5 py-1.5 mb-4 border border-theme-primary/40 bg-theme-primary/10 rounded-full text-[10px] sm:text-[11px] md:text-sm font-mono text-theme-primary uppercase tracking-[0.1em]"
            >
              <span
                class="w-1.5 h-1.5 rounded-full bg-theme-primary/60 animate-pulse"
              ></span>
              Local-first RPG campaign manager • Private by default
            </div>
            <p
              class="mb-2 text-sm md:text-base font-mono font-semibold uppercase tracking-[0.2em] text-theme-primary/90"
            >
              Welcome to Codex Cryptica
            </p>
            <h1
              class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-theme-primary/90 font-header tracking-tight mb-3 md:mb-5 leading-tight"
            >
              Private RPG Lore Vault
            </h1>
            <h2
              class="text-xs sm:text-sm font-mono uppercase tracking-widest text-theme-primary/60 mb-3"
            >
              RPG Campaign Manager &amp; Worldbuilding Tool
            </h2>
            <p
              class="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-theme-muted max-w-3xl mx-auto leading-relaxed mb-5 md:mb-6 font-body font-light"
            >
              A free, local-first campaign manager for GMs: private Markdown
              notes, visual lore graphs, timelines, offline prep, and optional
              AI in one browser workspace.
            </p>
          </div>

          <section
            aria-labelledby="living-lore-graph"
            class="mx-auto flex w-full max-w-6xl flex-col items-center"
          >
            <button
              type="button"
              onclick={() => demoService.startDemo("fantasy")}
              class="group mb-4 w-full max-w-6xl rounded-xl border border-theme-border bg-theme-surface/60 shadow-2xl shadow-theme-primary/5 overflow-hidden text-left transition-all duration-200 hover:border-theme-primary/70 hover:shadow-theme-primary/20 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/60"
              aria-labelledby="living-lore-graph"
              aria-describedby="living-lore-graph-copy living-lore-graph-preview"
              data-testid="welcome-preview-button"
            >
              <div
                class="flex items-center gap-2 px-4 py-3 border-b border-theme-border bg-theme-bg/60"
              >
                <div class="min-w-0">
                  <h2
                    id="living-lore-graph"
                    class="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-theme-primary"
                  >
                    Living Lore Graph
                  </h2>
                  <p
                    id="living-lore-graph-copy"
                    class="mt-1 text-[11px] text-theme-muted"
                  >
                    See how characters, factions, secrets, and places connect.
                  </p>
                </div>
                <span
                  class="ml-auto flex shrink-0 items-center gap-1 text-[10px] font-mono font-semibold text-theme-primary/80 group-hover:text-theme-primary uppercase tracking-[0.15em] transition-colors"
                >
                  Explore
                  <span
                    class="icon-[lucide--arrow-right] w-3 h-3 transition-transform group-hover:translate-x-1"
                  ></span>
                </span>
              </div>
              <div id="living-lore-graph-preview" class="sr-only">
                Interactive lore graph preview showing Captain Veyra connected
                to factions, secrets, places, and unresolved plot threads.
              </div>
              <div
                class="flex h-[16.5rem] sm:h-[19rem] md:h-[22rem] lg:h-[26rem] xl:h-[28rem]"
              >
                <!-- Graph canvas -->
                <div class="relative flex-1">
                  <svg
                    viewBox="0 0 480 260"
                    class="absolute inset-0 w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                  >
                    <!-- peripheral edges (dim) -->
                    <g
                      stroke="#8a8175"
                      stroke-opacity="0.25"
                      stroke-width="1.2"
                    >
                      <line x1="130" y1="66" x2="358" y2="74" />
                      <line x1="138" y1="196" x2="350" y2="198" />
                      <line x1="52" y1="134" x2="130" y2="66" />
                      <line x1="52" y1="134" x2="138" y2="196" />
                      <line x1="430" y1="140" x2="358" y2="74" />
                      <line x1="430" y1="140" x2="350" y2="198" />
                    </g>
                    <!-- edges from the selected node (selection accent) -->
                    <g
                      stroke={SELECT_ACCENT}
                      stroke-opacity="0.5"
                      stroke-width="2"
                    >
                      <line x1="240" y1="130" x2="130" y2="66" />
                      <line x1="240" y1="130" x2="358" y2="74" />
                      <line x1="240" y1="130" x2="138" y2="196" />
                      <line x1="240" y1="130" x2="350" y2="198" />
                    </g>

                    <!-- hover-only glow boost on the selected node -->
                    <circle
                      cx="240"
                      cy="130"
                      r="32"
                      fill={SELECT_ACCENT}
                      fill-opacity="0.18"
                      class="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    ></circle>
                    <!-- selected-node glow halo -->
                    <circle
                      cx="240"
                      cy="130"
                      r="24"
                      fill={SELECT_ACCENT}
                      opacity="0.14"
                    >
                      <animate
                        attributeName="opacity"
                        values="0.1;0.22;0.1"
                        dur="3.2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="r"
                        values="22;27;22"
                        dur="3.2s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    <!-- peripheral nodes, colored by entity type (canonical palette) -->
                    <circle
                      cx="52"
                      cy="134"
                      r="8"
                      fill={PREVIEW_COLORS.location}
                      fill-opacity="0.85"
                    ></circle>
                    <circle
                      cx="430"
                      cy="140"
                      r="8"
                      fill={PREVIEW_COLORS.event}
                      fill-opacity="0.85"
                    ></circle>
                    <circle
                      cx="130"
                      cy="66"
                      r="9"
                      fill={PREVIEW_COLORS.faction}
                      fill-opacity="0.85"
                    ></circle>
                    <circle
                      cx="358"
                      cy="74"
                      r="9"
                      fill={PREVIEW_COLORS.location}
                      fill-opacity="0.85"
                    ></circle>
                    <circle
                      cx="138"
                      cy="196"
                      r="9"
                      fill={PREVIEW_COLORS.event}
                      fill-opacity="0.85"
                    ></circle>
                    <circle
                      cx="350"
                      cy="198"
                      r="9"
                      fill={PREVIEW_COLORS.faction}
                      fill-opacity="0.85"
                    ></circle>

                    <!-- selection bounding box -->
                    <rect
                      x="220"
                      y="110"
                      width="40"
                      height="40"
                      rx="9"
                      fill="none"
                      stroke={SELECT_ACCENT}
                      stroke-opacity="0.55"
                      stroke-width="1.2"
                      stroke-dasharray="4 3"
                    ></rect>
                    <!-- selected node (character) with brand-accent selection ring -->
                    <circle
                      cx="240"
                      cy="130"
                      r="13"
                      fill={PREVIEW_COLORS.character}
                    ></circle>
                    <circle
                      cx="240"
                      cy="130"
                      r="13"
                      fill="none"
                      stroke={SELECT_ACCENT}
                      stroke-opacity="0.9"
                      stroke-width="2"
                    ></circle>

                    <!-- node labels (color-keyed to type) -->
                    <g
                      font-family="var(--font-body, sans-serif)"
                      text-anchor="middle"
                    >
                      <text
                        x="240"
                        y="160"
                        font-size="11"
                        font-weight="700"
                        fill="#f6dca0">Captain Veyra</text
                      >
                      <text
                        x="130"
                        y="51"
                        font-size="9.5"
                        font-weight="600"
                        fill="#d7d2c8"
                        fill-opacity="0.92">Glass Rebellion</text
                      >
                      <text
                        x="358"
                        y="59"
                        font-size="9.5"
                        font-weight="600"
                        fill="#d7d2c8"
                        fill-opacity="0.92">Sunken Archive</text
                      >
                      <text
                        x="138"
                        y="216"
                        font-size="9.5"
                        font-weight="600"
                        fill="#d7d2c8"
                        fill-opacity="0.92">Crown Secret</text
                      >
                      <text
                        x="350"
                        y="218"
                        font-size="9.5"
                        font-weight="600"
                        fill="#d7d2c8"
                        fill-opacity="0.92">Blackspire Compact</text
                      >
                      <text
                        x="52"
                        y="155"
                        font-size="9"
                        font-weight="600"
                        fill="#d7d2c8"
                        fill-opacity="0.85">Ironhold</text
                      >
                      <text
                        x="430"
                        y="161"
                        font-size="9"
                        font-weight="600"
                        fill="#d7d2c8"
                        fill-opacity="0.85">The Vow</text
                      >
                    </g>
                  </svg>
                </div>
                <!-- Entity panel -->
                <div
                  class="w-32 sm:w-40 md:w-48 shrink-0 border-l border-theme-border bg-theme-bg/50 p-3 text-left"
                >
                  <div
                    class="w-10 h-10 rounded-lg mb-2 flex items-center justify-center"
                    style="background-color: {PREVIEW_COLORS.character}2e"
                  >
                    <span
                      class="icon-[lucide--user-round] w-5 h-5"
                      style="color: {PREVIEW_COLORS.character}"
                    ></span>
                  </div>
                  <div class="text-xs font-bold text-theme-text leading-tight">
                    Captain Veyra
                  </div>
                  <div
                    class="text-[9px] font-mono uppercase tracking-[0.15em] mb-3"
                    style="color: {PREVIEW_COLORS.character}"
                  >
                    Character
                  </div>
                  <div
                    class="space-y-1.5 text-[9px] sm:text-[10px] font-body leading-snug"
                  >
                    <div class="text-theme-muted">
                      Faction: <span class="text-theme-text">Red Concordat</span
                      >
                    </div>
                    <div class="text-theme-muted">
                      Status: <span class="text-theme-text">Missing</span>
                    </div>
                    <div
                      class="flex items-center gap-1 text-theme-primary pt-0.5"
                    >
                      <span class="icon-[lucide--eye-off] w-3 h-3 shrink-0"
                      ></span>
                      2 unresolved secrets
                    </div>
                  </div>
                </div>
              </div>
            </button>

            <div
              class="flex w-full max-w-5xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <button
                type="button"
                onclick={() => demoService.startDemo("fantasy")}
                class="w-full sm:w-auto px-12 py-4 md:py-5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-[0.2em] text-sm rounded-lg hover:bg-theme-primary/90 hover:shadow-[0_0_30px_var(--color-accent-primary)] transition-all active:scale-95"
                data-testid="welcome-demo-button"
              >
                Explore Demo Vault
              </button>
              {#each secondaryActions as action (action.intent)}
                <button
                  type="button"
                  onclick={() => openVaultFromWelcome(action.intent)}
                  class="w-full sm:w-auto px-8 py-4 border border-theme-border text-theme-muted hover:text-theme-primary hover:border-theme-primary/60 font-bold uppercase font-header tracking-[0.18em] text-xs rounded-lg transition-all active:scale-95"
                  data-testid={action.testid}
                >
                  {action.label}
                </button>
              {/each}
            </div>
            <p
              class="mt-4 max-w-2xl px-4 text-sm text-theme-muted/80 font-body leading-relaxed text-balance text-center"
            >
              Opens a prebuilt sample world instantly. No setup required.
              Optional AI is available when you want it; your vault works fully
              without it.
            </p>
          </section>
        </section>

        <!-- Below the Hero: Info boxes -->
        <div
          class="mx-auto mb-10 md:mb-14 grid max-w-5xl gap-4 text-left sm:grid-cols-3 w-full"
          aria-label="Codex Cryptica product highlights"
        >
          {#each agenticProofPoints as point (point.label)}
            <article
              class="border border-theme-border/70 bg-theme-surface/45 p-4 text-theme-text shadow-sm"
            >
              <div
                class="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-theme-primary"
              >
                <span class="{point.icon} h-4 w-4 shrink-0" aria-hidden="true"
                ></span>
                <h3>{point.label}</h3>
              </div>
              <p class="text-sm leading-relaxed text-theme-muted">
                {point.copy}
              </p>
            </article>
          {/each}
        </div>

        <!-- Try it as section -->
        <section class="text-center mb-10 w-full">
          <h3
            class="text-[10px] font-mono text-theme-muted uppercase tracking-[0.3em] mb-6"
          >
            Try a themed vault:
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

        <!-- Footer actions & settings -->
        <footer class="flex flex-col items-center gap-4 w-full">
          <div class="flex flex-wrap items-center justify-center gap-6">
            <a
              href="{base}/free-rpg-campaign-manager"
              class="inline-flex items-center gap-2 text-theme-primary hover:text-theme-primary/80 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
            >
              <span class="icon-[lucide--castle] w-3 h-3" aria-hidden="true"
              ></span>
              Free RPG campaign manager
            </a>
            <a
              href="{base}/worldbuilding-tool"
              class="inline-flex items-center gap-2 text-theme-primary hover:text-theme-primary/80 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
            >
              <span class="icon-[lucide--globe] w-3 h-3" aria-hidden="true"
              ></span>
              worldbuilding tool
            </a>
            <a
              href="{base}/features"
              class="inline-flex items-center gap-2 text-theme-primary/60 hover:text-theme-primary font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
            >
              <span class="icon-[lucide--zap] w-3 h-3" aria-hidden="true"
              ></span>
              Features
            </a>
            <a
              href="{base}/changelog"
              class="inline-flex items-center gap-2 text-theme-primary/60 hover:text-theme-primary font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
            >
              <span class="icon-[lucide--history] w-3 h-3" aria-hidden="true"
              ></span>
              Changelog
            </a>
          </div>

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
        </footer>
      </div>
    </div>
  {/if}
</div>
