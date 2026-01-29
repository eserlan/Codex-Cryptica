<script lang="ts">
    import { vault } from "$lib/stores/vault.svelte";
    import { categories } from "$lib/stores/categories.svelte";

    let showForm = $state(false);
    let newTitle = $state("");
    let newType = $state<string>("npc");

    $effect(() => {
        if (showForm && categories.list.length > 0 && !categories.list.some(c => c.id === newType)) {
            newType = categories.list[0].id;
        }
    });

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        try {
            await vault.createEntity(newType, newTitle);
            newTitle = "";
            showForm = false;
        } catch (err) {
            console.error(err);
        }
    };
</script>

<div class="flex flex-col gap-2 font-mono">
    <div class="flex gap-1.5 md:gap-3 items-center">
        <div
            class="text-[10px] md:text-xs text-gray-500 tracking-wider uppercase hidden sm:block"
        >
            {#if vault.status === "loading"}
                <span class="animate-pulse text-green-500">LOADING...</span>
            {:else if vault.status === "saving"}
                <span class="text-amber-500">SAVING...</span>
            {:else if vault.status === "error"}
                <span
                    class="text-red-400 font-bold text-xs bg-red-900/20 px-2 py-1 rounded border border-red-900/50"
                >
                    {vault.errorMessage || "ERROR"}
                </span>
            {:else if vault.allEntities.length > 0 || vault.rootHandle}
                <span class="text-green-600" data-testid="entity-count"
                    >{vault.allEntities.length} ENTITIES</span
                >
            {:else}
                <span class="text-gray-600">NO VAULT</span>
            {/if}
        </div>

        {#if !vault.rootHandle}
            <button
                class="px-3 md:px-4 py-1.5 bg-green-600 hover:bg-green-500 text-black rounded text-[10px] md:text-xs font-bold tracking-widest transition whitespace-nowrap"
                onclick={() => vault.openDirectory()}
            >
                OPEN <span class="hidden xs:inline">VAULT</span>
            </button>
        {:else if !vault.isAuthorized}
            <button
                class="px-3 md:px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-black rounded text-[10px] md:text-xs font-bold tracking-widest transition whitespace-nowrap"
                onclick={() => vault.requestPermission()}
            >
                GRANT ACCESS
            </button>
        {:else}
            <button
                class="px-3 md:px-4 py-1.5 border border-green-900 text-green-600 hover:text-green-400 hover:border-green-700 rounded text-[10px] md:text-xs font-bold tracking-widest transition whitespace-nowrap flex items-center gap-2"
                onclick={() => (showForm = !showForm)}
            >
                <span
                    class={showForm
                        ? "icon-[heroicons--x-mark] w-3 h-3"
                        : "icon-[heroicons--plus] w-3 h-3"}
                ></span>
                {showForm ? "CANCEL" : "NEW"}
            </button>
            <button
                class="px-2 py-1.5 border border-green-900/50 text-green-700 hover:text-green-500 hover:border-green-700 rounded text-sm transition flex items-center justify-center"
                onclick={() => vault.refresh()}
                title="Reload from disk"
            >
                <span class="icon-[lucide--refresh-cw] w-3.5 h-3.5"></span>
            </button>
            <button
                class="px-3 py-1.5 border border-green-900/50 text-amber-700 hover:text-amber-500 hover:border-amber-700 rounded text-[10px] transition hidden xs:flex items-center gap-1.5"
                onclick={() => vault.rebuildIndex()}
                title="Clear cache and re-index all vault files. Use if search seems out of sync."
            >
                <span class="icon-[lucide--database-zap] w-3 h-3"></span>
                REBUILD
            </button>
        {/if}
    </div>

    {#if showForm}
        <form
            onsubmit={(e) => {
                e.preventDefault();
                handleCreate();
            }}
            class="flex gap-2 p-3 bg-black/50 rounded border border-green-900/30"
        >
            <input
                bind:value={newTitle}
                placeholder="Entry Title..."
                class="px-3 py-1.5 text-xs bg-black/50 border border-green-800 text-gray-100 rounded flex-1 focus:outline-none focus:border-green-500 placeholder-green-900/50"
            />
            <select
                bind:value={newType}
                class="px-2 py-1.5 text-xs bg-black border border-green-800 text-gray-300 rounded focus:outline-none focus:border-green-500"
            >
                {#each categories.list as cat}
                    <option value={cat.id}>{cat.label}</option>
                {/each}
            </select>
            <button
                type="submit"
                class="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-black rounded text-xs font-bold tracking-widest disabled:opacity-50 transition"
                disabled={!newTitle.trim()}
            >
                ADD
            </button>
        </form>
    {/if}
</div>
