<script>
  import GraphView from "$lib/components/GraphView.svelte";
  import EntityDetailPanel from "$lib/components/EntityDetailPanel.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";

  let selectedEntity = $derived.by(() => {
    const id = vault.selectedEntityId;
    return id ? vault.entities[id] : null;
  });

  // Check if we're in guest/share mode
  const shareId = $derived(page.url.searchParams.get("shareId"));
  const isGuestMode = $derived(!!shareId);

  onMount(async () => {
    if (isGuestMode && shareId && shareId.startsWith("p2p-")) {
      const peerId = shareId.substring(4); // Remove "p2p-" prefix
      vault.isGuest = true; // Activate guest mode

      try {
        await p2pGuestService.connectToHost(
          peerId,
          (graph) => {
            // Update vault entities with received data
            // Note: This needs to handle potential merge/replacement strategies
            // For now, simply replace current entities.
            vault.entities = Object.fromEntries(
              Object.entries(graph.entities).map(([id, entity]) => [
                id,
                {
                  ...entity,
                  _path:
                    typeof entity._path === "string"
                      ? [entity._path]
                      : entity._path,
                },
              ]),
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
    <GraphView bind:selectedId={vault.selectedEntityId} />
  </div>

  {#if selectedEntity}
    <EntityDetailPanel
      entity={selectedEntity}
      onClose={() => (vault.selectedEntityId = null)}
    />
  {/if}

  <!-- Fallback empty state prompt only if no vault open AND not in guest mode -->
  {#if !vault.isInitialized && !isGuestMode}
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
    >
      <div
        class="text-center p-12 bg-gray-900/90 border border-green-900/30 rounded backdrop-blur"
      >
        <h2 class="text-xl text-green-500 font-mono tracking-widest mb-2">
          NO SIGNAL
        </h2>
        <p class="text-gray-500">
          Open a local vault to initiate surveillance.
        </p>
      </div>
    </div>
  {/if}
</div>
