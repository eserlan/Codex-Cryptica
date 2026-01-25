<script lang="ts">
    import { vault } from "$lib/stores/vault.svelte";
    import type { Entity } from "schema";

    let showForm = $state(false);
    let newTitle = $state("");
    let newType = $state<Entity["type"]>("npc");

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

<div class="flex flex-col gap-2">
    <div class="flex gap-2 items-center">
        <div class="text-sm text-gray-500 mr-2">
            {#if vault.status === "loading"}
                <span class="animate-pulse">Loading...</span>
            {:else if vault.status === "saving"}
                <span class="text-yellow-600">Saving...</span>
            {:else if vault.status === "error"}
                <span
                    class="text-red-500 font-bold text-xs bg-red-900/20 px-2 py-1 rounded border border-red-900/50"
                >
                    {vault.errorMessage || "Error"}
                </span>
            {:else if vault.allEntities.length > 0 || vault.rootHandle}
                {vault.allEntities.length} Entities
            {:else}
                No Vault Open
            {/if}
        </div>

        {#if !vault.rootHandle}
            <button
                class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
                onclick={() => vault.openDirectory()}
            >
                Open Vault
            </button>
        {:else if !vault.isAuthorized}
            <button
                class="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition text-sm font-medium"
                onclick={() => vault.requestPermission()}
            >
                Grant Access
            </button>
        {:else}
            <button
                class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium"
                onclick={() => (showForm = !showForm)}
            >
                {showForm ? "Cancel" : "+ New Entry"}
            </button>
            <button
                class="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
                onclick={() => vault.refresh()}
                title="Reload from disk"
            >
                ↻
            </button>
        {/if}
    </div>

    {#if showForm}
        <form
            onsubmit={(e) => {
                e.preventDefault();
                handleCreate();
            }}
            class="flex gap-2 p-2 bg-gray-50 rounded border border-gray-200 shadow-inner"
        >
            <input
                bind:value={newTitle}
                placeholder="Entry Title..."
                class="px-2 py-1 text-sm border rounded flex-1 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <select
                bind:value={newType}
                class="px-2 py-1 text-sm border rounded bg-white outline-none"
            >
                <option value="npc">NPC</option>
                <option value="location">Location</option>
                <option value="item">Item</option>
                <option value="event">Event</option>
                <option value="faction">Faction</option>
            </select>
            <button
                type="submit"
                class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                disabled={!newTitle.trim()}
            >
                Add
            </button>
        </form>
    {/if}
</div>
