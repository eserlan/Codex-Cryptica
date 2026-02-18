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
    {:else}
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
  {#if !vault.isInitialized && !isGuestMode && uiStore.showLandingPage && !uiStore.dismissedLandingPage}
    <div
      class="absolute inset-0 z-30 bg-black/60 backdrop-blur-md overflow-y-auto custom-scrollbar"
      transition:fade
    >
      <div class="max-w-5xl mx-auto px-6 py-20 md:py-32">
        <header class="mb-16 md:mb-24 text-center">
          <div
            class="inline-block px-3 py-1 mb-6 border border-theme-primary/30 bg-theme-primary/5 rounded text-[10px] font-mono text-theme-primary uppercase tracking-[0.3em] animate-pulse"
          >
            System Online // Local-First Intelligence
          </div>
          <h2
            class="text-4xl md:text-7xl font-bold text-theme-text font-serif tracking-tight mb-8"
          >
            Forge Your World <br />
            <span class="text-theme-primary">In the Knowledge Graph.</span>
          </h2>
          <p
            class="text-lg md:text-xl text-theme-muted max-w-2xl mx-auto leading-relaxed mb-12"
          >
            Codex Cryptica is an AI-assisted RPG campaign manager built for lore
            keepers who demand privacy, speed, and deep interconnectedness.
          </p>

          <div class="flex flex-wrap justify-center gap-4">
            <button
              onclick={() => uiStore.toggleSettings("vault")}
              class="px-8 py-4 bg-theme-primary text-black font-bold uppercase tracking-widest text-xs rounded hover:shadow-[0_0_20px_var(--color-accent-primary)] transition-all active:scale-95"
            >
              Initialize Archive
            </button>
            <button
              onclick={() => (uiStore.dismissedLandingPage = true)}
              class="px-8 py-4 border border-theme-border text-theme-text font-bold uppercase tracking-widest text-xs rounded hover:border-theme-primary transition-all"
            >
              Enter Workspace
            </button>
          </div>

          <div class="mt-8 flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id="show-welcome"
              checked={uiStore.showLandingPage}
              onchange={(e) =>
                uiStore.toggleLandingPage(e.currentTarget.checked)}
              class="w-3.5 h-3.5 accent-theme-primary cursor-pointer"
            />
            <label
              for="show-welcome"
              class="text-[10px] font-mono text-theme-muted uppercase tracking-widest cursor-pointer hover:text-theme-primary transition-colors"
            >
              Show welcome screen on startup
            </label>
          </div>
        </header>

        <section id="features" class="grid md:grid-cols-3 gap-8 mb-24">
          <!-- Feature 1: Local-First -->
          <div
            class="p-8 bg-theme-surface border border-theme-border rounded hover:border-theme-primary/50 transition-colors group"
          >
            <div
              class="w-12 h-12 mb-6 rounded-full bg-theme-primary/10 flex items-center justify-center group-hover:bg-theme-primary/20 transition-colors"
            >
              <span
                class="icon-[lucide--shield-check] text-theme-primary w-6 h-6"
              ></span>
            </div>
            <h3
              class="text-xl font-bold text-theme-text mb-4 uppercase tracking-wider font-mono"
            >
              Privacy First
            </h3>
            <p class="text-sm text-theme-muted leading-relaxed">
              Your lore belongs to you. Data is stored locally in your browser's
              Origin Private File System (OPFS). No cloud accounts required
              unless you choose to sync.
            </p>
          </div>

          <!-- Feature 2: AI Oracle -->
          <div
            class="p-8 bg-theme-surface border border-theme-border rounded hover:border-theme-primary/50 transition-colors group"
          >
            <div
              class="w-12 h-12 mb-6 rounded-full bg-theme-primary/10 flex items-center justify-center group-hover:bg-theme-primary/20 transition-colors"
            >
              <span class="icon-[lucide--brain] text-theme-primary w-6 h-6"
              ></span>
            </div>
            <h3
              class="text-xl font-bold text-theme-text mb-4 uppercase tracking-wider font-mono"
            >
              Oracle Intelligence
            </h3>
            <p class="text-sm text-theme-muted leading-relaxed">
              Leverage Google Gemini to analyze your notes, propose connections,
              and generate immersive lore content that respects your existing
              world context.
            </p>
          </div>

          <!-- Feature 3: Graph Visualization -->
          <div
            class="p-8 bg-theme-surface border border-theme-border rounded hover:border-theme-primary/50 transition-colors group"
          >
            <div
              class="w-12 h-12 mb-6 rounded-full bg-theme-primary/10 flex items-center justify-center group-hover:bg-theme-primary/20 transition-colors"
            >
              <span class="icon-[lucide--share-2] text-theme-primary w-6 h-6"
              ></span>
            </div>
            <h3
              class="text-xl font-bold text-theme-text mb-4 uppercase tracking-wider font-mono"
            >
              Neural Network
            </h3>
            <p class="text-sm text-theme-muted leading-relaxed">
              Visualize your campaign as a dynamic knowledge graph. Discover
              hidden relationships and navigate your lore through spatial
              interconnectedness.
            </p>
          </div>
        </section>

        <footer class="text-center border-t border-theme-border/30 pt-16">
          <div
            class="text-[10px] font-mono text-theme-muted/40 uppercase tracking-[0.5em] mb-4"
          >
            Technical Specification
          </div>
          <div
            class="flex justify-center gap-8 text-[9px] font-mono text-theme-muted/60 uppercase"
          >
            <span>Svelte 5 Runes</span>
            <span>Tailwind 4.0</span>
            <span>Local-First Arch</span>
            <span>Web Workers</span>
          </div>
        </footer>
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
