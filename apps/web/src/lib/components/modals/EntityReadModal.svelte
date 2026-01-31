<script lang="ts">
    import { uiStore } from "$lib/stores/ui.svelte";
    import { vault } from "$lib/stores/vault.svelte";
    import { fly, fade } from "svelte/transition";
    import { marked } from "marked";
    import DOMPurify from "isomorphic-dompurify";

    let entityId = $derived(uiStore.readModalEntityId);
    let entity = $derived(entityId ? vault.entities[entityId] : null);

    let copiedField = $state<string | null>(null);

    const handleClose = () => {
        uiStore.closeReadModal();
    };

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            copiedField = field;
            setTimeout(() => {
                if (copiedField === field) copiedField = null;
            }, 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const navigateTo = (id: string) => {
        uiStore.readModalEntityId = id;
        vault.selectedEntityId = id;
    };

    const formatDate = (date: any) => {
        if (!date || date.year === undefined) return "";
        if (date.label) return date.label;
        let str = `${date.year}`;
        if (date.month !== undefined) str += `/${date.month}`;
        if (date.day !== undefined) str += `/${date.day}`;
        return str;
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

    let resolvedImageUrl = $state("");
    $effect(() => {
        if (entity?.image) {
            vault.resolveImagePath(entity.image).then(url => resolvedImageUrl = url);
        } else {
            resolvedImageUrl = "";
        }
    });
</script>

<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape" && uiStore.showReadModal) handleClose();
    }}
/>

{#if uiStore.showReadModal && entity}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md"
        transition:fade={{ duration: 200 }}
        onclick={handleClose}
    >
        <div 
            class="w-full max-w-4xl max-h-full bg-[#080808] border border-green-900/30 rounded-lg shadow-2xl flex flex-col overflow-hidden relative"
            transition:fly={{ y: 20, duration: 300 }}
            onclick={(e) => e.stopPropagation()}
        >
            <div class="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-500/30 rounded-tl-lg pointer-events-none"></div>
            <div class="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-green-500/30 rounded-tr-lg pointer-events-none"></div>
            <div class="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-green-500/30 rounded-bl-lg pointer-events-none"></div>
            <div class="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-500/30 rounded-br-lg pointer-events-none"></div>

            <div class="px-6 py-4 border-b border-green-900/20 flex justify-between items-center bg-black/40">
                <div class="flex items-center gap-4">
                    <span class="text-[10px] font-bold text-green-700 uppercase tracking-[0.2em] font-mono">Archive // Read_Mode</span>
                    {#if copiedField}
                        <span class="text-[10px] font-bold text-green-400 uppercase tracking-widest animate-pulse font-mono">
                            Copied {copiedField}!
                        </span>
                    {/if}
                </div>
                
                <div class="flex items-center gap-2">
                    <button 
                        onclick={handleClose}
                        class="p-2 text-green-900 hover:text-green-400 transition-colors"
                        title="Close (Esc)"
                    >
                        <span class="icon-[lucide--x] w-6 h-6"></span>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                <div class="max-w-2xl mx-auto space-y-12">
                    <header class="text-center space-y-4">
                        <div class="flex items-center justify-center gap-3">
                            <div class="h-px bg-green-900/30 flex-1"></div>
                            <span class="text-xs font-bold text-green-600 uppercase tracking-widest font-mono">{entity.type}</span>
                            <div class="h-px bg-green-900/30 flex-1"></div>
                        </div>
                        
                        <h1 class="text-4xl md:text-6xl font-serif font-bold text-gray-100 tracking-tight">
                            {entity.title}
                        </h1>

                        {#if entity.start_date || entity.end_date}
                            <div class="flex justify-center gap-6 text-sm font-mono">
                                {#if entity.start_date}
                                    <div class="flex flex-col items-center">
                                        <span class="text-green-900 uppercase text-[10px]">{getTemporalLabel(entity.type, 'start')}</span>
                                        <span class="text-green-400">{formatDate(entity.start_date)}</span>
                                    </div>
                                {/if}
                                {#if entity.end_date}
                                    <div class="flex flex-col items-center">
                                        <span class="text-green-900 uppercase text-[10px]">{getTemporalLabel(entity.type, 'end')}</span>
                                        <span class="text-green-400">{formatDate(entity.end_date)}</span>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </header>

                    {#if entity.image}
                        <div class="flex justify-center">
                            <div class="relative group max-w-md w-full">
                                <img 
                                    src={resolvedImageUrl} 
                                    alt={entity.title}
                                    class="rounded-lg border border-green-900/30 shadow-2xl opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>
                    {/if}

                    <section class="space-y-6">
                        <div class="flex items-center justify-between group">
                            <h2 class="text-lg font-bold text-green-500 uppercase tracking-widest font-mono flex items-center gap-2">
                                <span class="icon-[lucide--book-open] w-4 h-4"></span>
                                Chronicle
                            </h2>
                            <button 
                                onclick={() => copyToClipboard(entity.content || "", "Chronicle")}
                                class="p-2 text-green-900 hover:text-green-400 opacity-0 group-hover:opacity-100 transition-all"
                                title="Copy content"
                            >
                                <span class="icon-[lucide--copy] w-4 h-4"></span>
                            </button>
                        </div>
                        <div class="prose prose-invert prose-green max-w-none font-serif text-xl leading-relaxed text-gray-300">
                            {@html DOMPurify.sanitize(marked.parse(entity.content || "*No archival records found.*") as string)}
                        </div>
                    </section>

                    {#if entity.lore}
                        <section class="space-y-6 pt-12 border-t border-green-900/10">
                            <div class="flex items-center justify-between group">
                                <h2 class="text-lg font-bold text-amber-500/70 uppercase tracking-widest font-mono flex items-center gap-2">
                                    <span class="icon-[lucide--sparkles] w-4 h-4"></span>
                                    Deep Lore
                                </h2>
                                <button 
                                    onclick={() => copyToClipboard(entity.lore || "", "Lore")}
                                    class="p-2 text-green-900 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Copy lore"
                                >
                                    <span class="icon-[lucide--copy] w-4 h-4"></span>
                                </button>
                            </div>
                            <div class="prose prose-invert prose-amber max-w-none font-serif text-lg leading-relaxed text-gray-400 italic bg-amber-950/5 p-8 rounded-lg border border-amber-900/10">
                                {@html DOMPurify.sanitize(marked.parse(entity.lore) as string)}
                            </div>
                        </section>
                    {/if}

                    {#if allConnections.length > 0}
                        <section class="space-y-6 pt-12 border-t border-green-900/10">
                            <h2 class="text-sm font-bold text-green-900 uppercase tracking-widest font-mono">Web of Connections</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {#each allConnections as conn}
                                    <button 
                                        onclick={() => navigateTo(conn.id)}
                                        class="flex items-center gap-3 p-3 bg-black border border-green-900/20 hover:border-green-500/50 rounded transition-all text-left group"
                                    >
                                        <span class="w-2 h-2 rounded-full {conn.isOutbound ? 'bg-green-500' : 'bg-blue-500'}"></span>
                                        <div class="flex-1 min-w-0">
                                            <div class="text-[10px] text-green-900 uppercase font-mono">{conn.label}</div>
                                            <div class="text-sm font-bold text-gray-300 group-hover:text-green-400 truncate">{conn.title}</div>
                                        </div>
                                        <span class="icon-[lucide--chevron-right] w-4 h-4 text-green-900 group-hover:text-green-400 transition-transform group-hover:translate-x-1"></span>
                                    </button>
                                {/each}
                            </div>
                        </section>
                    {/if}
                </div>
            </div>

            <footer class="px-8 py-4 border-t border-green-900/20 bg-black/40 flex justify-between items-center text-[9px] font-mono text-green-900">
                <span>UID: {entity.id}</span>
                <span>ARCHIVE_REV: {new Date().toISOString().split('T')[0]}</span>
            </footer>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #15803d33;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #15803d66;
    }

    :global(.prose) {
        max-width: none !important;
    }
    :global(.prose p) {
        margin-bottom: 1.5em;
    }
</style>