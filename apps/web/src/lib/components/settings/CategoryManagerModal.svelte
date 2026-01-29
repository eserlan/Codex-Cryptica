<script lang="ts">
    import { uiStore } from "$stores/ui.svelte";
    import CategorySettings from "./CategorySettings.svelte";
    import { fly, fade } from "svelte/transition";
</script>

{#if uiStore.showCategoryManager}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm"
        onclick={() => uiStore.closeCategoryManager()}
        transition:fade
        aria-hidden="true"
    ></div>

    <div
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[500px] bg-black/95 border border-purple-900/50 shadow-2xl rounded-xl overflow-hidden flex flex-col z-[101] max-h-[85vh]"
        transition:fly={{ y: 50, duration: 300 }}
    >
        <!-- Header -->
        <div
            class="px-6 py-4 border-b border-purple-900/30 bg-purple-900/20 flex justify-between items-center"
        >
            <div class="flex items-center gap-3">
                <span class="text-purple-400 icon-[lucide--tags] w-5 h-5"></span>
                <span
                    class="text-xs font-bold text-purple-100 tracking-[0.2em] uppercase"
                    >Category Architecture</span
                >
            </div>
            <button
                onclick={() => uiStore.closeCategoryManager()}
                class="text-purple-400 hover:text-purple-200 transition-colors p-1"
                aria-label="Close"
            >
                ✕
            </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto custom-scrollbar">
            <p class="text-xs text-purple-200/60 mb-6 leading-relaxed">
                Define the ontology of your world. Each category determines node border colors and structural categorization.
            </p>
            
            <!-- We can reuse CategorySettings but maybe style it specifically for modal -->
            <CategorySettings />
        </div>
        
        <!-- Footer -->
        <div class="px-6 py-4 border-t border-purple-900/20 bg-purple-900/5 flex justify-end">
            <button
                onclick={() => uiStore.closeCategoryManager()}
                class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-black font-bold rounded-full text-[10px] tracking-widest transition-all active:scale-95"
            >
                DONE
            </button>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #7e22ce;
        border-radius: 2px;
    }
</style>
