<script lang="ts">
    import type { Entity } from "schema";
    import { vault } from "$lib/stores/vault.svelte";

    let { entity, onClose } = $props<{
        entity: Entity | null;
        onClose: () => void;
    }>();

    let isEditing = $state(false);
    let editTitle = $state("");
    let editImage = $state("");

    const startEditing = () => {
        if (!entity) return;
        editTitle = entity.title;
        editImage = entity.image || "";
        isEditing = true;
    };

    const cancelEditing = () => {
        isEditing = false;
    };

    const saveChanges = () => {
        if (!entity) return;
        vault.updateEntity(entity.id, {
            title: editTitle,
            image: editImage || undefined,
        });
        isEditing = false;
    };

    // Mock stats since schema might not have them yet
    const stats = [
        { label: "STR", value: 16 },
        { label: "DEX", value: 14 },
        { label: "CON", value: 15 },
        { label: "INT", value: 12 },
        { label: "WIS", value: 10 },
        { label: "CHA", value: 8 },
    ];
</script>

{#if entity}
    <div
        class="w-96 bg-[#0c0c0c] border-l border-green-900/50 flex flex-col h-full absolute right-0 top-0 shadow-2xl z-40 font-mono"
    >
        <!-- Header -->
        <div class="p-6 border-b border-green-900/30">
            <div class="flex justify-between items-start mb-2">
                {#if isEditing}
                    <div class="flex flex-col gap-2 w-full mr-4">
                        <input
                            type="text"
                            bind:value={editTitle}
                            class="bg-black/50 border border-green-800 text-gray-100 px-2 py-1 focus:outline-none focus:border-green-500 font-serif font-bold text-xl w-full placeholder-green-900"
                            placeholder="Entity Title"
                        />
                    </div>
                {:else}
                    <h2
                        class="text-3xl font-bold text-gray-100 font-serif tracking-wide"
                    >
                        {entity.title}
                    </h2>
                {/if}

                <button
                    onclick={onClose}
                    class="text-green-700 hover:text-green-500 transition"
                    aria-label="Close panel"
                    title="Close"
                >
                    <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        ></path></svg
                    >
                </button>
            </div>

            <!-- Image Preview / Input -->
            {#if isEditing}
                <div class="mb-4">
                    <label
                        class="block text-[10px] text-green-600 font-bold mb-1"
                        for="entity-image-url">IMAGE URL</label
                    >
                    <input
                        id="entity-image-url"
                        type="text"
                        bind:value={editImage}
                        class="bg-black/50 border border-green-800 text-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-green-500 w-full placeholder-green-900/50"
                        placeholder="https://..."
                    />
                </div>
            {:else if entity.image}
                <div
                    class="mb-4 w-full h-48 rounded border border-green-900/30 overflow-hidden relative group"
                >
                    <img
                        src={entity.image}
                        alt={entity.title}
                        class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                    />
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"
                    ></div>
                </div>
            {/if}

            <div
                class="flex items-center gap-2 text-xs font-bold tracking-widest text-green-600 uppercase mb-4"
            >
                <span>{entity.type}</span>
                <span class="w-1 h-1 bg-green-600 rounded-full"></span>
                <span>NEUTRAL GOOD</span>
            </div>

            <!-- Status Tabs -->
            <div
                class="flex gap-6 text-[10px] font-bold tracking-widest text-gray-500 border-b border-green-900/30 pb-2"
            >
                <button
                    class="text-green-400 border-b-2 border-green-400 pb-2 -mb-2.5"
                    >STATUS</button
                >
                <button class="hover:text-gray-300 transition"
                    >LORE & NOTES</button
                >
                <button class="hover:text-gray-300 transition">INVENTORY</button
                >
            </div>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <!-- Stats Grid -->
            <div
                class="grid grid-cols-6 gap-2 bg-green-900/5 p-4 rounded border border-green-900/20"
            >
                {#each stats as stat}
                    <div class="flex flex-col items-center gap-1">
                        <span class="text-[9px] text-green-600 font-bold"
                            >{stat.label}</span
                        >
                        <span class="text-lg text-gray-200 font-bold"
                            >{stat.value}</span
                        >
                    </div>
                {/each}
            </div>

            <!-- Combat Stats -->
            <div class="grid grid-cols-3 gap-4">
                <div
                    class="bg-[#111] p-3 border border-gray-800 flex flex-col items-center"
                >
                    <span
                        class="text-[9px] text-gray-500 uppercase tracking-wider mb-1"
                        >Armor Class</span
                    >
                    <span class="text-xl text-white font-bold">16</span>
                </div>
                <div
                    class="bg-[#111] p-3 border border-gray-800 flex flex-col items-center"
                >
                    <span
                        class="text-[9px] text-gray-500 uppercase tracking-wider mb-1"
                        >Hit Points</span
                    >
                    <span class="text-xl text-white font-bold">54</span>
                </div>
                <div
                    class="bg-[#111] p-3 border border-gray-800 flex flex-col items-center"
                >
                    <span
                        class="text-[9px] text-gray-500 uppercase tracking-wider mb-1"
                        >Speed</span
                    >
                    <span class="text-xl text-white font-bold">30ft</span>
                </div>
            </div>

            <!-- Chronicle -->
            <div>
                <h3
                    class="text-green-500 font-serif italic text-lg mb-3 border-b border-green-900/30 pb-1"
                >
                    Chronicle
                </h3>
                <p class="text-sm text-gray-400 leading-relaxed font-serif">
                    {entity.content.slice(0, 200)}...
                </p>
            </div>

            <!-- Secrets -->
            <div>
                <h3
                    class="text-green-500 font-serif italic text-lg mb-3 border-b border-green-900/30 pb-1"
                >
                    Gossip & Secrets
                </h3>
                <ul class="space-y-3">
                    {#each entity.connections as conn}
                        <li class="flex gap-3 text-sm text-gray-400">
                            <span class="text-green-500 mt-1">▶</span>
                            <span
                                >Connected to <strong class="text-gray-300"
                                    >{conn.target}</strong
                                >
                                via {conn.type}.</span
                            >
                        </li>
                    {/each}
                    <li class="flex gap-3 text-sm text-gray-400">
                        <span class="text-green-500 mt-1">▶</span>
                        <span
                            >Recent rumors suggest involvement with the Redbrand
                            Ruffians.</span
                        >
                    </li>
                </ul>
            </div>
        </div>

        <!-- Footer Action -->
        <div
            class="p-4 border-t border-green-900/30 flex justify-between items-center bg-[#0a0a0a]"
        >
            {#if isEditing}
                <div class="flex gap-2 w-full justify-end">
                    <button
                        onclick={cancelEditing}
                        class="text-gray-500 hover:text-gray-300 text-xs font-bold px-4 py-2 rounded tracking-widest transition"
                    >
                        CANCEL
                    </button>
                    <button
                        onclick={saveChanges}
                        class="bg-green-600 hover:bg-green-500 text-black text-xs font-bold px-6 py-2 rounded tracking-widest transition"
                    >
                        SAVE CHANGES
                    </button>
                </div>
            {:else}
                <div class="flex gap-4 text-gray-600">
                    <!-- Icons -->
                    <div class="w-4 h-4 bg-gray-800 rounded"></div>
                    <div class="w-4 h-4 bg-gray-800 rounded"></div>
                </div>
                <div class="flex gap-2">
                    <button
                        onclick={startEditing}
                        class="border border-green-900 text-green-600 hover:text-green-400 hover:border-green-700 text-xs font-bold px-4 py-2 rounded tracking-widest transition"
                    >
                        EDIT
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: #000;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #15803d;
        border-radius: 2px;
    }
</style>
