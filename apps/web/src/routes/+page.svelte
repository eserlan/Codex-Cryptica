<script>
    import GraphView from "$lib/components/GraphView.svelte";
    import EntityDetailPanel from "$lib/components/EntityDetailPanel.svelte";
    import { vault } from "$lib/stores/vault.svelte";

    let selectedEntity = $derived.by(() => {
        const id = vault.selectedEntityId;
        return id ? vault.entities[id] : null;
    });
</script>

<div class="h-[calc(100vh-65px)] relative bg-black overflow-hidden">
    <GraphView bind:selectedId={vault.selectedEntityId} />

    {#if selectedEntity}
        <EntityDetailPanel
            entity={selectedEntity}
            onClose={() => (vault.selectedEntityId = null)}
        />
    {/if}

    <!-- Fallback empty state prompt only if no vault open -->
    {#if !vault.rootHandle}
        <div
            class="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
        >
            <div
                class="text-center p-12 bg-gray-900/90 border border-green-900/30 rounded backdrop-blur"
            >
                <h2
                    class="text-xl text-green-500 font-mono tracking-widest mb-2"
                >
                    NO SIGNAL
                </h2>
                <p class="text-gray-500">
                    Open a local vault to initiate surveillance.
                </p>
            </div>
        </div>
    {/if}
</div>
