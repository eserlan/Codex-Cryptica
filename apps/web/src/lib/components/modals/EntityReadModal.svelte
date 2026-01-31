<script lang="ts">
    import { uiStore } from "$lib/stores/ui.svelte";
    import { vault } from "$lib/stores/vault.svelte";
    import { fly, fade } from "svelte/transition";
    import { getIconClass } from "$lib/utils/icon";
    import { categories } from "$lib/stores/categories.svelte";
    import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
    import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
    import type { Entity } from "schema";

    let entityId = $derived(uiStore.readModalEntityId);
    let entity = $derived(entityId ? vault.entities[entityId] : null);

    let isEditing = $state(false);
    let activeTab = $state<"status" | "lore" | "inventory">("status");
    let showLightbox = $state(false);

    // Edit State
    let editTitle = $state("");
    let editContent = $state("");
    let editLore = $state("");
    let editImage = $state("");
    let editDate = $state<Entity["date"]>();
    let editStartDate = $state<Entity["start_date"]>();
    let editEndDate = $state<Entity["end_date"]>();

    let resolvedImageUrl = $state("");

    $effect(() => {
        if (entity?.image) {
            vault.resolveImagePath(entity.image).then(url => resolvedImageUrl = url);
        } else {
            resolvedImageUrl = "";
        }
    });

    const startEditing = () => {
        if (!entity) return;
        editTitle = entity.title;
        editContent = entity.content || "";
        editLore = entity.lore || "";
        editImage = entity.image || "";
        editDate = entity.date;
        editStartDate = entity.start_date;
        editEndDate = entity.end_date;
        isEditing = true;
    };

    const cancelEditing = () => {
        isEditing = false;
    };

    const saveChanges = async () => {
        if (!entity) return;
        try {
            await vault.updateEntity(entity.id, {
                title: editTitle,
                content: editContent,
                lore: editLore,
                image: editImage,
                date: editDate,
                start_date: editStartDate,
                end_date: editEndDate,
                type: entity.type,
            });
            isEditing = false;
        } catch (err) {
            console.error("Failed to save changes", err);
        }
    };

    const handleDelete = async () => {
        if (!entity) return;
        if (confirm(`Are you sure you want to permanently delete "${entity.title}"? This cannot be undone.`)) {
            try {
                await vault.deleteEntity(entity.id);
                isEditing = false;
                handleClose();
            } catch (err: any) {
                console.error("Failed to delete entity", err);
                alert(`Error: ${err.message}`);
            }
        }
    };

    const handleClose = () => {
        if (isEditing) {
            if (!confirm("Discard unsaved changes?")) return;
        }
        uiStore.closeReadModal();
        isEditing = false;
    };

    const navigateTo = (id: string) => {
        if (isEditing) {
            if (!confirm("Discard unsaved changes to navigate?")) return;
            isEditing = false;
        }
        uiStore.readModalEntityId = id;
    };

    const getTemporalLabel = (type: string, field: "start" | "end") => {
        const t = (type || "").toLowerCase();
        if (field === "start") {
            if (["npc", "creature", "character", "monster"].some(x => t.includes(x))) return "Born";
            if (["faction", "location", "city", "organization", "guild"].some(x => t.includes(x))) return "Founded";
            if (["item", "artifact", "object", "weapon"].some(x => t.includes(x))) return "Created";
            return "Started";
        }
        if (field === "end") {
            if (["npc", "creature", "character", "monster"].some(x => t.includes(x))) return "Died";
            if (["faction", "location", "city", "organization", "guild"].some(x => t.includes(x))) return "Dissolved";
            if (["item", "artifact", "object", "weapon"].some(x => t.includes(x))) return "Destroyed";
            return "Ended";
        }
        return "Date";
    };

    const formatDate = (date: any) => {
        if (!date || date.year === undefined) return "";
        if (date.label) return date.label;
        let str = `${date.year}`;
        if (date.month !== undefined) str += `/${date.month}`;
        if (date.day !== undefined) str += `/${date.day}`;
        return str;
    };

    let allConnections = $derived.by(() => {
        if (!entity) return [];
        const outbound = entity.connections.map((c) => ({
            id: c.target,
            label: c.label || c.type,
            title: vault.entities[c.target]?.title || c.target,
            isOutbound: true
        }));
        const inbound = (vault.inboundConnections[entity.id] || []).map((item) => ({
            id: item.sourceId,
            label: item.connection.label || item.connection.type,
            title: vault.entities[item.sourceId]?.title || item.sourceId,
            isOutbound: false
        }));
        return [...outbound, ...inbound];
    });

</script>

<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape" && uiStore.showReadModal && !showLightbox) handleClose();
    }}
/>

{#if uiStore.showReadModal && entity}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md"
        transition:fade={{ duration: 200 }}
        onclick={handleClose}
    >
        <div 
            class="w-full max-w-6xl h-[90vh] bg-[#0c0c0c] border border-green-900/30 rounded-lg shadow-2xl flex flex-col overflow-hidden relative"
            transition:fly={{ y: 20, duration: 300 }}
            onclick={(e) => e.stopPropagation()}
        >
            <!-- Decorative Corners -->
            <div class="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-500/30 rounded-tl-lg pointer-events-none"></div>
            <div class="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-green-500/30 rounded-tr-lg pointer-events-none"></div>
            <div class="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-green-500/30 rounded-bl-lg pointer-events-none"></div>
            <div class="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-500/30 rounded-br-lg pointer-events-none"></div>

            <!-- Header -->
            <header class="px-6 py-4 border-b border-green-900/20 bg-[#0a0a0a] flex justify-between items-start shrink-0">
                <div class="flex-1 mr-8">
                    <div class="flex items-center gap-3 mb-1">
                        <span class="{getIconClass(categories.getCategory(entity.type)?.icon)} text-green-500 w-5 h-5"></span>
                        <span class="text-[10px] font-bold tracking-widest text-green-600 uppercase">{entity.type}</span>
                    </div>
                    {#if isEditing}
                        <input
                            type="text"
                            bind:value={editTitle}
                            class="bg-black/50 border border-green-800 text-gray-100 px-3 py-1 focus:outline-none focus:border-green-500 font-serif font-bold text-3xl w-full placeholder-green-900 rounded"
                            placeholder="Entity Title"
                        />
                    {:else}
                        <h1 class="text-3xl md:text-4xl font-serif font-bold text-gray-100 tracking-wide">{entity.title}</h1>
                    {/if}
                </div>

                <div class="flex items-center gap-3">
                    {#if !isEditing && !vault.isGuest}
                        <button
                            onclick={startEditing}
                            class="px-4 py-1.5 border border-green-900/50 text-green-600 hover:text-green-400 hover:border-green-500 text-xs font-bold rounded tracking-widest transition flex items-center gap-2"
                        >
                            <span class="icon-[lucide--edit-2] w-3 h-3"></span>
                            EDIT
                        </button>
                    {:else if isEditing}
                         <button
                            onclick={cancelEditing}
                            class="px-4 py-1.5 text-gray-500 hover:text-gray-300 text-xs font-bold rounded tracking-widest transition"
                        >
                            CANCEL
                        </button>
                        <button
                            onclick={saveChanges}
                            class="px-4 py-1.5 bg-green-700 hover:bg-green-600 text-black text-xs font-bold rounded tracking-widest transition flex items-center gap-2"
                        >
                            <span class="icon-[lucide--save] w-3 h-3"></span>
                            SAVE
                        </button>
                    {/if}
                    
                    <div class="w-px h-6 bg-green-900/30 mx-1"></div>

                    <button 
                        onclick={handleClose} 
                        class="text-green-900 hover:text-green-500 transition p-2 hover:bg-green-900/10 rounded"
                        aria-label="Close"
                    >
                        <span class="icon-[lucide--x] w-6 h-6"></span>
                    </button>
                </div>
            </header>

            <!-- Navigation Tabs -->
            <div class="flex gap-8 px-8 border-b border-green-900/20 bg-[#0c0c0c] shrink-0">
                <button
                    class="py-3 text-xs font-bold tracking-widest transition-colors border-b-2 {activeTab === 'status' ? 'text-green-400 border-green-400' : 'text-gray-500 border-transparent hover:text-gray-300'}"
                    onclick={() => activeTab = "status"}
                >
                    STATUS & DATA
                </button>
                <button
                    class="py-3 text-xs font-bold tracking-widest transition-colors border-b-2 {activeTab === 'lore' ? 'text-green-400 border-green-400' : 'text-gray-500 border-transparent hover:text-gray-300'}"
                    onclick={() => activeTab = "lore"}
                >
                    LORE & ARCHIVES
                </button>
                <button
                    class="py-3 text-xs font-bold tracking-widest transition-colors border-b-2 {activeTab === 'inventory' ? 'text-green-400 border-green-400' : 'text-gray-500 border-transparent hover:text-gray-300'}"
                    onclick={() => activeTab = "inventory"}
                >
                    INVENTORY
                </button>
            </div>

            <!-- Main Body -->
            <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
                {#if activeTab === "status"}
                    <!-- Left Sidebar (Image & Meta) -->
                    <div class="w-full md:w-80 lg:w-96 border-r border-green-900/20 p-6 overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
                        <!-- Image -->
                        <div class="mb-6">
                             {#if isEditing}
                                <div class="mb-4">
                                    <label class="block text-[10px] text-green-600 font-bold mb-1">IMAGE URL</label>
                                    <input
                                        type="text"
                                        bind:value={editImage}
                                        class="bg-black/50 border border-green-800 text-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:border-green-500 w-full placeholder-green-900/50 rounded"
                                        placeholder="https://..."
                                    />
                                </div>
                            {:else if entity.image}
                                <button
                                    onclick={() => (showLightbox = true)}
                                    class="w-full aspect-square rounded-lg border border-green-900/30 overflow-hidden relative group cursor-pointer hover:border-green-500 transition block shadow-lg"
                                >
                                    <img
                                        src={resolvedImageUrl}
                                        alt={entity.title}
                                        class="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
                                    />
                                    <div class="absolute bottom-2 right-2 bg-black/70 text-green-500 text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                                        Zoom
                                    </div>
                                </button>
                            {:else}
                                <div class="w-full aspect-square rounded-lg border border-dashed border-green-900/30 flex flex-col items-center justify-center gap-2 text-green-900/50 bg-green-900/5">
                                    <span class="icon-[lucide--image] w-12 h-12 opacity-50"></span>
                                    <span class="text-[10px] font-bold uppercase">No Image</span>
                                </div>
                            {/if}
                        </div>

                        <!-- Connections List -->
                        <div class="space-y-4">
                            <h3 class="text-xs font-bold text-green-900 uppercase tracking-widest border-b border-green-900/20 pb-2">Connections</h3>
                             {#if allConnections.length > 0}
                                <div class="space-y-2">
                                    {#each allConnections as conn}
                                        <button 
                                            onclick={() => navigateTo(conn.id)}
                                            class="w-full flex items-center gap-3 p-2 rounded border border-transparent hover:border-green-900/30 hover:bg-green-900/10 transition text-left group"
                                        >
                                            <span class="w-1.5 h-1.5 rounded-full {conn.isOutbound ? 'bg-green-500' : 'bg-blue-500'}"></span>
                                            <div class="flex-1 min-w-0">
                                                <div class="text-[11px] text-green-700 uppercase font-mono">{conn.label}</div>
                                                <div class="text-sm font-bold text-gray-400 group-hover:text-green-400 truncate transition">{conn.title}</div>
                                            </div>
                                            <span class="icon-[lucide--chevron-right] w-4 h-4 text-green-900 group-hover:text-green-500 opacity-0 group-hover:opacity-100 transition"></span>
                                        </button>
                                    {/each}
                                </div>
                            {:else}
                                <p class="text-xs text-gray-600 italic">No known connections.</p>
                            {/if}
                        </div>

                        {#if isEditing && !vault.isGuest}
                             <div class="mt-8 pt-8 border-t border-green-900/20">
                                <button
                                    onclick={handleDelete}
                                    class="w-full border border-red-900/30 text-red-800 hover:text-red-500 hover:border-red-600 hover:bg-red-950/30 text-xs font-bold px-4 py-2 rounded tracking-widest transition flex items-center justify-center gap-2"
                                >
                                    <span class="icon-[lucide--trash-2] w-3 h-3"></span>
                                    DELETE ENTITY
                                </button>
                             </div>
                        {/if}
                    </div>

                    <!-- Right Content (Temporal & Chronicle) -->
                    <div class="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        <div class="max-w-3xl mx-auto space-y-8">
                            <!-- Temporal Data -->
                             {#if isEditing}
                                <div class="bg-black/30 p-4 rounded border border-green-900/20">
                                    <h3 class="text-xs font-bold text-green-700 uppercase tracking-widest mb-4">Timeline Configuration</h3>
                                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <TemporalEditor 
                                            bind:value={editStartDate} 
                                            label={getTemporalLabel(entity.type, 'start')} 
                                        />
                                        <TemporalEditor 
                                            bind:value={editEndDate} 
                                            label={getTemporalLabel(entity.type, 'end')} 
                                        />
                                    </div>
                                </div>
                            {:else if entity.start_date || entity.end_date}
                                <div class="flex flex-wrap gap-8 p-4 bg-green-900/5 border border-green-900/10 rounded">
                                    {#if entity.start_date}
                                        <div class="flex flex-col">
                                            <span class="text-[10px] text-green-800 uppercase font-bold tracking-widest mb-1">{getTemporalLabel(entity.type, 'start')}</span>
                                            <span class="text-lg font-mono text-green-400">{formatDate(entity.start_date)}</span>
                                        </div>
                                    {/if}
                                    {#if entity.end_date}
                                        <div class="flex flex-col">
                                            <span class="text-[10px] text-green-800 uppercase font-bold tracking-widest mb-1">{getTemporalLabel(entity.type, 'end')}</span>
                                            <span class="text-lg font-mono text-green-400">{formatDate(entity.end_date)}</span>
                                        </div>
                                    {/if}
                                </div>
                            {/if}

                            <!-- Chronicle -->
                            <div>
                                <h2 class="text-xl font-serif font-bold text-green-500 mb-4 flex items-center gap-2">
                                    <span class="icon-[lucide--book-open] w-5 h-5"></span>
                                    Chronicle
                                </h2>
                                {#if isEditing}
                                    <MarkdownEditor
                                        content={editContent}
                                        editable={true}
                                        onUpdate={(md) => editContent = md}
                                    />
                                {:else}
                                    <MarkdownEditor
                                        content={entity.content || "No records found."}
                                        editable={false}
                                    />
                                {/if}
                            </div>
                        </div>
                    </div>

                {:else if activeTab === "lore"}
                    <div class="flex-1 p-8 overflow-y-auto custom-scrollbar">
                         <div class="max-w-3xl mx-auto">
                            <h2 class="text-xl font-serif font-bold text-amber-600 mb-6 flex items-center gap-2">
                                <span class="icon-[lucide--scroll] w-5 h-5"></span>
                                Deep Lore & Secrets
                            </h2>
                            
                            {#if isEditing}
                                <MarkdownEditor
                                    content={editLore}
                                    editable={true}
                                    onUpdate={(md) => editLore = md}
                                />
                            {:else}
                                <div class="bg-amber-950/10 border border-amber-900/20 p-6 rounded-lg min-h-[300px]">
                                    <MarkdownEditor
                                        content={entity.lore || "No deep lore recorded."}
                                        editable={false}
                                    />
                                </div>
                            {/if}
                         </div>
                    </div>

                {:else if activeTab === "inventory"}
                     <div class="flex-1 p-8 flex items-center justify-center text-gray-600 font-mono text-sm italic">
                        Inventory system initialization pending...
                     </div>
                {/if}
            </div>
        </div>
    </div>

    <!-- Lightbox -->
    {#if showLightbox && entity.image}
        <button
            class="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 cursor-zoom-out"
            onclick={() => (showLightbox = false)}
            transition:fade={{ duration: 200 }}
        >
            <img
                src={resolvedImageUrl}
                alt={entity.title}
                class="max-w-full max-h-full object-contain shadow-2xl rounded"
            />
        </button>
    {/if}
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: #000;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #15803d33;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #15803d66;
    }
</style>