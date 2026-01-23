<script>
    import GraphView from "$lib/components/GraphView.svelte";
    import { vault } from "$lib/stores/vault.svelte";
</script>

<div class="space-y-4">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-semibold mb-2">Vault Explorer</h2>
        <p class="text-gray-600 mb-4">
            {#if !vault.rootHandle || !vault.isAuthorized}
                Open a folder to visualize your vault.
            {:else if vault.entities.size === 0}
                Your vault is empty. Click <strong>+ New Entry</strong> to start your
                journey!
            {:else}
                Visualizing {vault.entities.size} entities.
            {/if}
        </p>

        <GraphView />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each vault.entities.values() as entity}
            <div class="p-4 border rounded hover:shadow-md transition bg-white">
                <h3 class="font-bold">{entity.title}</h3>
                <span
                    class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase"
                    >{entity.type}</span
                >
                <div class="mt-2 text-sm text-gray-500">
                    {entity.connections.length} connections
                </div>
            </div>
        {/each}
    </div>
</div>
