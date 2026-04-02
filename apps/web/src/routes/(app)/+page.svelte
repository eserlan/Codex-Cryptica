<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { fade } from "svelte/transition";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { base } from "$app/paths";
  import { demoService } from "$lib/services/demo";
  import { building, browser } from "$app/environment";
  import { SCHEMA_ORG } from "$lib/config";
  import GuestLoginModal from "../../lib/components/modals/GuestLoginModal.svelte";
  import { buildGuestPresencePayload } from "$lib/cloud-bridge/p2p/p2p-helpers";

  const jsonLdScript = $derived(
    `<script type="application/ld+json">${JSON.stringify(SCHEMA_ORG)}</scr` +
      `ipt>`,
  );

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
      import("../../lib/components/campaign/FrontPage.svelte")
        .then((m) => (FrontPage = m?.default))
        .catch((err) => logChunkError("FrontPage", err));
    }
    if (!EntityDetailPanel) {
      import("../../lib/components/EntityDetailPanel.svelte")
        .then((m) => (EntityDetailPanel = m?.default))
        .catch((err) => logChunkError("EntityDetailPanel", err));
    }
  }

  // Dynamic imports for heavy components
  let GraphView = $state<any>(null);
  let FrontPage = $state<any>(null);
  let EntityDetailPanel = $state<any>(null);

  let selectedEntity = $derived.by(() => {
    const id = vault.selectedEntityId;
    return id ? vault.entities[id] : null;
  });

  // Check if we're in guest/share mode - guard for prerendering
  const shareId = $derived(
    building ? null : page.url.searchParams.get("shareId"),
  );
  const isGuestMode = $derived(!!shareId);

  // Consolidate reactive pre-loading and fallback loading into a single effect
  // to prevent race conditions during dynamic imports.
  $effect(() => {
    const isSkippingLanding =
      browser && (!uiStore.isLandingPageVisible || isGuestMode);
    const isVaultReady = vault.isInitialized || isGuestMode;

    if (
      (isSkippingLanding || isVaultReady) &&
      (!GraphView || !FrontPage || !EntityDetailPanel)
    ) {
      loadHeavyComponents();
    }
  });

  // Guest Mode Connection Logic - Triggers once username is provided
  $effect(() => {
    if (
      isGuestMode &&
      shareId &&
      shareId.startsWith("p2p-") &&
      uiStore.guestUsername
    ) {
      const peerId = shareId.substring(4); // Remove "p2p-" prefix
      uiStore.isGuestMode = true; // Activate guest mode
      vault.status = "loading";
      vault.selectedEntityId = null;

      p2pGuestService
        .connectToHost(
          peerId,
          (graph) => {
            // Update vault entities with received data
            vault.repository.entities = Object.fromEntries(
              Object.entries(graph.entities).map(
                ([id, entity]: [string, any]) => [
                  id,
                  {
                    ...entity,
                    _path:
                      typeof entity._path === "string"
                        ? [entity._path]
                        : entity._path,
                  },
                ],
              ),
            );
            if (graph.defaultVisibility) {
              vault.defaultVisibility = graph.defaultVisibility;
            }
            if (graph.themeId) {
              import("../../lib/stores/theme.svelte")
                .then((m) => {
                  if (m?.themeStore) m.themeStore.previewTheme(graph.themeId);
                })
                .catch((err) =>
                  console.error("Failed to load theme store", err),
                );
            }
            // Force shared mode for guests to ensure Fog of War is active
            import("../../lib/stores/ui.svelte")
              .then((m) => {
                if (m?.ui) m.ui.sharedMode = true;
              })
              .catch((err) => console.error("Failed to load ui store", err));
            vault.isInitialized = true; // Mark vault as initialized in guest mode
            vault.status = "idle";
          },
          (updatedEntity) => {
            // Real-time update from host
            vault.repository.entities[updatedEntity.id] = {
              ...updatedEntity,
              _path:
                typeof updatedEntity._path === "string"
                  ? [updatedEntity._path]
                  : updatedEntity._path,
            };
          },
          (deletedId) => {
            // Real-time delete from host
            delete vault.repository.entities[deletedId];
          },
          (batchUpdates) => {
            // Real-time batch update from host
            vault.batchUpdate(batchUpdates);
          },
          (themeId) => {
            // Real-time theme update from host
            import("../../lib/stores/theme.svelte")
              .then((m) => {
                if (m?.themeStore) m.themeStore.previewTheme(themeId);
              })
              .catch((err) => console.error("Failed to load theme store", err));
          },
          uiStore.guestUsername ?? undefined,
        )
        .catch((err) => {
          console.error("[Guest Mode] Failed to connect to host:", err);
          vault.selectedEntityId = null;
          uiStore.guestUsername = null;
          uiStore.isGuestMode = false;
          vault.status = "error";
          vault.errorMessage = "Failed to connect to shared campaign.";
        });
    }
  });

  $effect(() => {
    if (!isGuestMode || !uiStore.isGuestMode || !uiStore.guestUsername) {
      return;
    }

    const { status, currentEntityId, currentEntityTitle } =
      buildGuestPresencePayload({
        selectedEntityId: vault.selectedEntityId,
        zenModeEntityId: uiStore.showZenMode ? uiStore.zenModeEntityId : null,
        entities: vault.entities,
      });

    p2pGuestService.updateGuestStatus({
      status,
      currentEntityId,
      currentEntityTitle,
    });
  });

  onMount(async () => {
    // onMount logic removed - moved to reactive $effect above
  });
</script>

<svelte:head>
  {#if !isGuestMode && uiStore.isLandingPageVisible && (building || !page.url.searchParams.has("demo"))}
    {@html jsonLdScript}
  {/if}
</svelte:head>

<div
  class="h-[calc(100vh-var(--header-height,65px))] flex bg-theme-bg overflow-hidden relative"
>
  <div class="flex-1 relative overflow-hidden">
    {#if GraphView && (vault.isInitialized || vault.status === "loading" || isGuestMode)}
      <GraphView bind:selectedId={vault.selectedEntityId} />
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

  {#if isGuestMode && !uiStore.guestUsername && !building}
    <GuestLoginModal
      onJoin={(username) => uiStore.setGuestUsername(username)}
    />
  {/if}

  <!-- Vault Front Page Overlay -->
  {#if FrontPage && vault.isInitialized && !uiStore.isLandingPageVisible && !uiStore.dismissedCampaignPage}
    <div
      data-testid="front-page-overlay"
      class="absolute inset-0 z-40 bg-theme-bg/96 backdrop-blur-sm overflow-y-auto p-4 md:p-6"
      style:background-image="var(--bg-texture-overlay)"
      onclick={(event) => {
        if (event.currentTarget === event.target) {
          uiStore.dismissedCampaignPage = true;
        }
      }}
      transition:fade
    >
      <div class="max-w-7xl mx-auto w-full">
        <FrontPage />
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
                uiStore.dismissedLandingPage = true;
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
