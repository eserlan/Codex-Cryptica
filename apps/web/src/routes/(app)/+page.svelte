<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
  import { uiStore } from "$lib/stores/ui.svelte";
  import AppHeader from "$lib/components/layout/AppHeader.svelte";
  import GraphView from "$lib/components/GraphView.svelte";
  import VaultControls from "$lib/components/VaultControls.svelte";
  import { THEMES } from "schema";

  const shareId = $derived(page.url.searchParams.get("shareId"));

  onMount(() => {
    if (shareId && shareId.startsWith("p2p-")) {
      const peerId = shareId.substring(4);
      console.log("[Guest Mode] Host ID detected:", peerId);
      uiStore.isGuestMode = true;
      vault.status = "loading";

      p2pGuestService
        .connectToHost(
          peerId,
          (graph) => {
            console.log("[Guest Page] Received graph data:", {
              entityCount: Object.keys(graph.entities).length,
              defaultVisibility: graph.defaultVisibility,
            });
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
                  if (m?.themeStore) m.themeStore.setTheme(graph.themeId);
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
          (entity) => {
            // Real-time update from host
            vault.repository.entities[entity.id] = entity;
          },
          (id) => {
            // Real-time delete from host
            delete vault.repository.entities[id];
          },
          (batchUpdates) => {
            // Real-time batch update from host
            vault.batchUpdate(batchUpdates);
          },
          (themeId) => {
            // Real-time theme update from host
            import("../../lib/stores/theme.svelte")
              .then((m) => {
                if (m?.themeStore) m.themeStore.setTheme(themeId);
              })
              .catch((err) => console.error("Failed to load theme store", err));
          },
        )
        .catch((err) => {
          console.error("[Guest Mode] Failed to connect to host:", err);
          uiStore.isGuestMode = false;
          vault.status = "error";
        });
    }
  });

  function selectTheme(themeId: string) {
    import("../../lib/stores/theme.svelte").then((m) => {
      m.themeStore.setTheme(themeId);
    });
  }
</script>

<div class="h-screen flex flex-col bg-theme-bg text-theme-text overflow-hidden">
  <AppHeader />

  {#if vault.isInitialized}
    <div class="flex-1 relative overflow-hidden">
      <GraphView />
    </div>
  {:else if vault.status === "loading"}
    <div class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-12 h-12 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"
        ></div>
        <div
          class="text-theme-primary font-header tracking-widest animate-pulse"
        >
          {uiStore.isGuestMode
            ? "Syncing with Host..."
            : "Initializing Vault..."}
        </div>
      </div>
    </div>
  {:else}
    <div
      class="flex-1 flex flex-col items-center justify-center p-6 gap-8 overflow-y-auto no-scrollbar"
    >
      <div class="max-w-2xl w-full flex flex-col gap-8">
        <section class="text-center space-y-4">
          <h1
            class="text-4xl md:text-6xl font-black text-theme-primary tracking-tighter uppercase italic"
          >
            Codex Cryptica
          </h1>
          <p
            class="text-theme-secondary font-header tracking-widest text-sm md:text-base uppercase"
          >
            Strategic Campaign Knowledge Graph
          </p>
        </section>

        <VaultControls />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="p-6 bg-theme-surface border border-theme-border flex flex-col gap-3 group hover:border-theme-primary transition-all shadow-xl"
          >
            <div class="flex items-center gap-3 text-theme-primary mb-1">
              <span class="icon-[lucide--zap] w-6 h-6"></span>
              <h2 class="font-black tracking-widest uppercase text-sm">
                Local-First
              </h2>
            </div>
            <p class="text-xs leading-relaxed text-theme-muted">
              Everything stays in your browser. Fast, private, and offline
              ready. No cloud dependency required for core play.
            </p>
          </div>

          <div
            class="p-6 bg-theme-surface border border-theme-border flex flex-col gap-3 group hover:border-theme-primary transition-all shadow-xl"
          >
            <div class="flex items-center gap-3 text-theme-primary mb-1">
              <span class="icon-[lucide--share-2] w-6 h-6"></span>
              <h2 class="font-black tracking-widest uppercase text-sm">
                Real-Time Sharing
              </h2>
            </div>
            <p class="text-xs leading-relaxed text-theme-muted">
              Connect with your players directly (P2P). Share specific nodes,
              maps, and lore without account creation.
            </p>
          </div>
        </div>

        <section class="mt-4 pt-8 border-t border-theme-border/30">
          <div class="flex items-center gap-3 text-theme-secondary mb-6">
            <span class="icon-[lucide--palette] w-5 h-5"></span>
            <h2 class="font-black tracking-widest uppercase text-xs">
              Interface Styling
            </h2>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            {#each Object.keys(THEMES) as theme}
              <button
                onclick={() => selectTheme(theme)}
                class="px-4 py-2 text-[10px] border border-theme-border hover:border-theme-primary hover:bg-theme-primary/10 text-theme-secondary hover:text-theme-primary rounded uppercase font-header tracking-widest transition-all"
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
