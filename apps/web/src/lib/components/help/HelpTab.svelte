<script lang="ts">
    import { helpStore } from "$stores/help.svelte";
    import { marked } from "marked";
    import DOMPurify from "isomorphic-dompurify";
    import { slide } from "svelte/transition";

    let expandedId = $state<string | null>(null);

    const toggle = (id: string) => {
        expandedId = expandedId === id ? null : id;
    };

    const parseContent = (content: string) => {
        try {
            return DOMPurify.sanitize(marked.parse(content) as string);
        } catch (e) {
            console.error("Failed to parse help article", e);
            return content;
        }
    };
</script>

<div class="space-y-6">
    <div class="relative group">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 icon-[heroicons--magnifying-glass] w-4 h-4 text-green-900 group-focus-within:text-green-500 transition-colors"></span>
        <input 
            type="text" 
            placeholder="Search documentation..."
            class="w-full bg-black border border-green-900/50 hover:border-green-700 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 rounded py-2 pl-10 pr-4 text-sm font-mono text-gray-100 transition-all placeholder:text-green-900/50"
            value={helpStore.searchQuery}
            oninput={(e) => helpStore.setSearchQuery(e.currentTarget.value)}
            aria-label="Search documentation"
        />
    </div>

    <div class="space-y-3">
        {#each helpStore.searchResults as article}
            <div class="border border-green-900/20 bg-green-900/5 rounded overflow-hidden">
                <button 
                    onclick={() => toggle(article.id)}
                    class="w-full px-4 py-3 flex justify-between items-center hover:bg-green-900/10 transition-colors text-left"
                    aria-expanded={expandedId === article.id}
                >
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-green-400 uppercase tracking-wider">{article.title}</span>
                        <div class="flex gap-2 mt-1">
                            {#each article.tags as tag}
                                <span class="text-[8px] bg-green-900/20 text-green-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">#{tag}</span>
                            {/each}
                        </div>
                    </div>
                    <span class="icon-[lucide--chevron-down] w-4 h-4 text-green-900 transition-transform {expandedId === article.id ? 'rotate-180' : ''}"></span>
                </button>

                {#if expandedId === article.id}
                    <div 
                        class="px-4 pb-5 pt-2 border-t border-green-900/10"
                        transition:slide
                    >
                        <div class="text-xs text-green-100/80 leading-relaxed prose prose-invert prose-p:my-2 prose-headings:text-green-500 prose-headings:text-xs prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-widest prose-headings:mt-4 prose-headings:mb-2 prose-strong:text-green-400 prose-code:text-green-300">
                            {@html parseContent(article.content)}
                        </div>
                    </div>
                {/if}
            </div>
        {:else}
            <div class="text-center py-12 border border-dashed border-green-900/20 rounded">
                <div class="icon-[lucide--search-x] w-8 h-8 text-green-900 mx-auto mb-3"></div>
                <p class="text-[10px] text-green-900 uppercase font-mono tracking-[0.2em]">No matching protocols found</p>
            </div>
        {/each}
    </div>

    <div class="pt-6 border-t border-green-900/10">
        <h4 class="text-[10px] font-bold text-green-900 uppercase tracking-widest mb-4">Common Procedures</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button 
                onclick={() => helpStore.startTour("initial-onboarding")}
                class="p-3 border border-green-900/30 rounded bg-green-900/5 hover:bg-green-900/10 transition-all flex items-center gap-3 group"
                aria-label="Restart welcome tour"
            >
                <span class="icon-[lucide--map] w-5 h-5 text-green-700 group-hover:text-green-500"></span>
                <span class="text-[10px] font-bold text-green-100 uppercase tracking-wider">Restart Welcome Tour</span>
            </button>
        </div>
    </div>
</div>
