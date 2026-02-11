<script>
    import GraphView from "$lib/components/GraphView.svelte";
    import EntityDetailPanel from "$lib/components/EntityDetailPanel.svelte";
    import { vault } from "$lib/stores/vault.svelte";
    import { page } from "$app/state";

    let selectedEntity = $derived.by(() => {
        const id = vault.selectedEntityId;
        return id ? vault.entities[id] : null;
    });

    // Check if we're in guest/share mode
    const isGuestMode = $derived(!!page.url.searchParams.get("shareId"));
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

    <!-- Migration Overlay -->
    {#if vault.migrationRequired}
        <div class="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div class="max-w-md w-full border border-theme-primary bg-theme-surface p-8 rounded shadow-2xl space-y-6">
                <div class="flex justify-center">
                    <span class="icon-[lucide--database] w-16 h-16 text-theme-primary animate-pulse"></span>
                </div>
                <h2 class="text-2xl font-black text-theme-text tracking-widest uppercase">Storage Upgrade Required</h2>
                <p class="text-xs text-theme-muted font-mono leading-relaxed">
                    We've upgraded our storage system to ensure better performance and fewer permission errors on mobile devices. 
                    We need to move your existing vault data to this new secure location.
                </p>
                <div class="pt-4">
                    <button
                        onclick={() => vault.runMigration(false)}
                        class="w-full py-4 bg-theme-primary hover:bg-theme-secondary text-theme-bg font-bold tracking-[0.2em] uppercase transition-all active:scale-95 disabled:opacity-50"
                        disabled={vault.status === 'loading'}
                    >
                        {vault.status === 'loading' ? 'Upgrading...' : 'Start Upgrade'}
                    </button>
                </div>
                {#if vault.status === 'error'}
                    <p class="text-[10px] text-red-500 font-mono mt-4 uppercase">
                        {vault.errorMessage}
                    </p>
                {/if}
            </div>
        </div>
    {/if}

    <!-- Fallback empty state prompt only if no vault open AND not in guest mode -->
    {#if !vault.isInitialized && !isGuestMode}
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
