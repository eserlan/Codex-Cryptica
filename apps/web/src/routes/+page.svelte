<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { fade } from "svelte/transition";

  // Dynamic imports for heavy components
  let GraphView = $state<any>(null);
  let EntityDetailPanel = $state<any>(null);

  let selectedEntity = $derived.by(() => {
    const id = vault.selectedEntityId;
    return id ? vault.entities[id] : null;
  });

  // Check if we're in guest/share mode
  const shareId = $derived(page.url.searchParams.get("shareId"));
  const isGuestMode = $derived(!!shareId);

  // Lazy load components when needed using relative paths for reliable resolution
  $effect(() => {
    if ((vault.isInitialized || isGuestMode) && !GraphView) {
      import("../lib/components/GraphView.svelte").then((m) => {
        GraphView = m.default;
      });
      import("../lib/components/EntityDetailPanel.svelte").then((m) => {
        EntityDetailPanel = m.default;
      });
    }
  });

  onMount(async () => {
    if (isGuestMode && shareId && shareId.startsWith("p2p-")) {
      const peerId = shareId.substring(4); // Remove "p2p-" prefix
      vault.isGuest = true; // Activate guest mode

      try {
        await p2pGuestService.connectToHost(
          peerId,
          (graph) => {
            console.log("[Guest Page] Received graph data:", {
              entityCount: Object.keys(graph.entities).length,
              defaultVisibility: graph.defaultVisibility,
            });
            // Update vault entities with received data
            vault.entities = Object.fromEntries(
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
            // Force shared mode for guests to ensure Fog of War is active
            import("../lib/stores/ui.svelte").then(({ ui }) => {
              ui.sharedMode = true;
            });
            vault.isInitialized = true; // Mark vault as initialized in guest mode
            vault.status = "idle";
          },
          (updatedEntity) => {
            // Real-time update from host
            vault.entities[updatedEntity.id] = {
              ...updatedEntity,
              _path:
                typeof updatedEntity._path === "string"
                  ? [updatedEntity._path]
                  : updatedEntity._path,
            };
          },
          (deletedId) => {
            // Real-time delete from host
            delete vault.entities[deletedId];
          },
          (batchUpdates) => {
            // Real-time batch update from host
            vault.batchUpdateEntities(batchUpdates);
          },
        );
      } catch (err) {
        console.error("[Guest Mode] Failed to connect to host:", err);
        vault.isGuest = false;
        vault.status = "error";
        vault.errorMessage = "Failed to connect to shared campaign.";
      }
    }
  });
</script>

<div class="h-[calc(100vh-65px)] flex bg-black overflow-hidden relative">
  <div class="flex-1 relative overflow-hidden">
    {#if GraphView && (vault.isInitialized || isGuestMode)}
      <GraphView bind:selectedId={vault.selectedEntityId} />
    {:else if !uiStore.isLandingPageVisible}
      <div
        class="absolute inset-0 bg-black flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          class="text-theme-muted font-mono text-xs animate-pulse uppercase tracking-widest"
        >
          Initiating Neural Interface...
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

  <!-- Landing Page / Marketing Layer -->
  {#if !isGuestMode && uiStore.isLandingPageVisible}
    <div
      class="absolute inset-0 z-30 bg-theme-bg backdrop-blur-sm overflow-y-auto"
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
          <h1
            class="text-5xl md:text-8xl font-bold text-theme-text font-header tracking-tight mb-6 leading-tight"
          >
            Build Your World. <br />
            <span class="text-theme-primary/90">Map Your Lore.</span>
          </h1>
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
              onclick={() => (uiStore.dismissedLandingPage = true)}
              class="px-12 py-5 bg-theme-primary text-theme-bg font-bold uppercase tracking-[0.2em] text-sm rounded-lg hover:bg-theme-primary/90 hover:shadow-[0_0_30px_var(--color-accent-primary)] transition-all active:scale-95 font-header"
            >
              Enter Workspace
            </button>
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
              class="text-xl font-bold text-theme-text mb-3 uppercase tracking-wide font-header"
            >
              Total Privacy
            </h3>
            <p class="text-theme-muted leading-relaxed font-body">
              Your notes never leave your device. We use local storage for
              maximum security. No cloud accounts required.
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
              class="text-xl font-bold text-theme-text mb-3 uppercase tracking-wide font-header"
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
              class="text-xl font-bold text-theme-text mb-3 uppercase tracking-wide font-header"
            >
              Visual Graph
            </h3>
            <p class="text-theme-muted leading-relaxed font-body">
              Navigate your lore through a dynamic, interactive map. See exactly
              how characters, locations, and events intertwine.
            </p>
          </div>
        </section>
      </div>
    </div>
  {/if}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-accent-primary);
    border-radius: 2px;
  }
</style>
