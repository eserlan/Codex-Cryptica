<script lang="ts">
    import type { Entity } from "schema";
    import { fly } from "svelte/transition";
    import { vault } from "$lib/stores/vault.svelte";
    import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";

    let { entity, onClose } = $props<{
        entity: Entity | null;
        onClose: () => void;
    }>();

    let isEditing = $state(false);
    let editTitle = $state("");
    let editImage = $state("");
    let editContent = $state("");
    let editLore = $state("");

    const startEditing = () => {
        if (!entity) return;
        editTitle = entity.title;
        editImage = entity.image || "";
        editContent = entity.content || "";
        editLore = entity.lore || "";
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
            content: editContent,
            lore: editLore,
        });
        isEditing = false;
    };

    const handleContentUpdate = (markdown: string) => {
        editContent = markdown;
    };

    const handleLoreUpdate = (markdown: string) => {
        editLore = markdown;
    };

    // Lightbox state
    let showLightbox = $state(false);

    // Active tab
    let activeTab = $state<"status" | "lore" | "inventory">("status");

    $effect(() => {
        if (entity && activeTab === "lore" && entity.lore === undefined) {
            vault.fetchLore(entity.id);
        }
    });
</script>

{#if entity}
    <div
        transition:fly={{ x: 400, duration: 300 }}
        class="w-full md:w-1/3 lg:w-1/4 md:min-w-[400px] bg-[#0c0c0c] border-l border-green-900/50 flex flex-col h-[calc(100%-60px)] md:h-full absolute right-0 bottom-0 md:top-0 shadow-2xl z-40 font-mono"
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
                <button
                    onclick={() => (showLightbox = true)}
                    class="mb-4 w-full aspect-square rounded border border-green-900/30 overflow-hidden relative group cursor-pointer hover:border-green-700 transition block"
                >
                    <img
                        src={entity.image}
                        alt={entity.title}
                        class="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
                    />
                    <div
                        class="absolute bottom-2 right-2 bg-black/70 text-green-500 text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                        Click to enlarge
                    </div>
                </button>
            {/if}

            <div
                class="text-xs font-bold tracking-widest text-green-600 uppercase mb-4"
            >
                {entity.type}
            </div>

            <!-- Status Tabs -->
            <div
                class="flex gap-6 text-[10px] font-bold tracking-widest text-gray-500 border-b border-green-900/30 pb-2"
            >
                <button
                    class={activeTab === "status"
                        ? "text-green-400 border-b-2 border-green-400 pb-2 -mb-2.5"
                        : "hover:text-gray-300 transition"}
                    onclick={() => (activeTab = "status")}>STATUS</button
                >
                <button
                    class={activeTab === "lore"
                        ? "text-green-400 border-b-2 border-green-400 pb-2 -mb-2.5"
                        : "hover:text-gray-300 transition"}
                    onclick={() => {
                        activeTab = "lore";
                        if (entity && entity.lore === undefined) {
                            vault.fetchLore(entity.id);
                        }
                    }}>LORE & NOTES</button
                >
                <button
                    class={activeTab === "inventory"
                        ? "text-green-400 border-b-2 border-green-400 pb-2 -mb-2.5"
                        : "hover:text-gray-300 transition"}
                    onclick={() => (activeTab = "inventory")}>INVENTORY</button
                >
            </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {#if activeTab === "status"}
                <div class="space-y-8">
                    <!-- Chronicle / Content -->
                    <div>
                        <h3
                            class="text-green-500 font-serif italic text-lg mb-3 border-b border-green-900/30 pb-1"
                        >
                            Chronicle
                        </h3>
                        {#if isEditing}
                            <div class="h-64">
                                <MarkdownEditor
                                    content={editContent}
                                    editable={true}
                                    onUpdate={handleContentUpdate}
                                />
                            </div>
                        {:else}
                            <div class="prose-content">
                                <MarkdownEditor
                                    content={entity.content ||
                                        "No content yet."}
                                    editable={false}
                                />
                            </div>
                        {/if}
                    </div>

                    <!-- Connections -->
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
                                    <span>
                                        <strong class="text-gray-300"
                                            >{conn.label || conn.type}</strong
                                        >:
                                        {vault.entities[conn.target]?.title ||
                                            conn.target}
                                    </span>
                                </li>
                            {/each}
                            {#if entity.connections.length === 0}
                                <li class="text-sm text-gray-600 italic">
                                    No known connections.
                                </li>
                            {/if}
                        </ul>
                    </div>
                </div>
            {:else if activeTab === "lore"}
                <div class="space-y-4">
                    <div>
                        <div
                            class="flex items-center gap-3 text-xs uppercase tracking-widest text-gray-500 mb-6 font-mono"
                        >
                            <span class="text-blue-500">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path
                                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                    ></path>
                                    <polyline points="14 2 14 8 20 8"
                                    ></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                            </span>
                            <span>Lore archive decrypted</span>
                            <div class="h-px bg-gray-800 flex-1 ml-2"></div>
                        </div>
                        {#if isEditing}
                            <div class="h-96">
                                <MarkdownEditor
                                    content={editLore}
                                    editable={true}
                                    onUpdate={handleLoreUpdate}
                                />
                            </div>
                        {:else}
                            <div class="prose-content">
                                <MarkdownEditor
                                    content={entity.lore ||
                                        "No detailed lore available."}
                                    editable={false}
                                />
                            </div>
                        {/if}
                    </div>
                </div>
            {:else if activeTab === "inventory"}
                <div class="text-gray-500 italic text-sm">
                    Inventory coming soon...
                </div>
            {/if}
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

    <!-- Lightbox -->
    {#if showLightbox && entity.image}
        <button
            class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-zoom-out"
            onclick={() => (showLightbox = false)}
        >
            <img
                src={entity.image}
                alt={entity.title}
                class="max-w-[90vw] max-h-[90vh] object-contain"
            />
        </button>
    {/if}
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

    .prose-content :global(.markdown-editor) {
        background: transparent;
        border: none;
    }
</style>
