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
        <span
            class="absolute left-3 top-1/2 -translate-y-1/2 icon-[heroicons--magnifying-glass] w-4 h-4 text-theme-muted group-focus-within:text-theme-primary transition-colors"
        ></span>
        <input
            type="text"
            placeholder="Search documentation..."
            class="w-full bg-theme-surface border border-theme-border hover:border-theme-primary/50 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 rounded py-2 pl-10 pr-4 text-sm font-mono text-theme-text transition-all placeholder:text-theme-muted"
            value={helpStore.searchQuery}
            oninput={(e) => helpStore.setSearchQuery(e.currentTarget.value)}
            aria-label="Search documentation"
        />
    </div>

    <div class="space-y-3">
        {#each helpStore.searchResults as article}
            <div
                class="border border-theme-border bg-theme-primary/5 rounded overflow-hidden"
            >
                <button
                    onclick={() => toggle(article.id)}
                    class="w-full px-4 py-3 flex justify-between items-center hover:bg-theme-primary/5 transition-colors text-left"
                    aria-expanded={expandedId === article.id}
                >
                    <div class="flex flex-col">
                        <span
                            class="text-sm font-bold text-theme-primary uppercase tracking-wider"
                            >{article.title}</span
                        >
                        <div class="flex gap-2 mt-1">
                            {#each article.tags as tag}
                                <span
                                    class="text-xs bg-theme-primary/10 text-theme-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter"
                                    >#{tag}</span
                                >
                            {/each}
                        </div>
                    </div>
                    <span
                        class="icon-[lucide--chevron-down] w-4 h-4 text-theme-muted transition-transform {expandedId ===
                        article.id
                            ? 'rotate-180 text-theme-primary'
                            : ''}"
                    ></span>
                </button>

                {#if expandedId === article.id}
                    <div
                        class="px-4 pb-5 pt-2 border-t border-theme-border"
                        transition:slide
                    >
                        <div
                            class="text-[13px] text-theme-text/80 leading-relaxed prose prose-theme prose-p:my-2 prose-headings:text-theme-primary prose-headings:text-xs prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-widest prose-headings:mt-4 prose-headings:mb-2 prose-strong:text-theme-primary prose-code:text-theme-primary"
                        >
                            {@html parseContent(article.content)}
                        </div>
                    </div>
                {/if}
            </div>
        {:else}
            <div
                class="text-center py-12 border border-dashed border-theme-border rounded"
            >
                <div
                    class="icon-[lucide--search-x] w-8 h-8 text-theme-muted mx-auto mb-3"
                ></div>
                <p
                    class="text-xs text-theme-muted uppercase font-mono tracking-[0.2em]"
                >
                    No matching protocols found
                </p>
            </div>
        {/each}
    </div>

    <div class="pt-6 border-t border-theme-border">
        <h4
            class="text-xs font-bold text-theme-muted uppercase tracking-widest mb-4"
        >
            Common Procedures
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
                onclick={() => helpStore.startTour("initial-onboarding")}
                class="p-3 border border-theme-border rounded bg-theme-primary/5 hover:bg-theme-primary/10 transition-all flex items-center gap-3 group"
                aria-label="Restart welcome tour"
            >
                <span
                    class="icon-[lucide--map] w-5 h-5 text-theme-muted group-hover:text-theme-primary"
                ></span>
                <span
                    class="text-xs font-bold text-theme-text uppercase tracking-wider"
                    >Restart Welcome Tour</span
                >
            </button>
        </div>
    </div>
</div>
