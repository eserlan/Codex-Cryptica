<script lang="ts">
    import { debugStore } from '$lib/stores/debug.svelte';
    import { fade } from 'svelte/transition';

    let isOpen = $state(false);
    // Auto-subscribed value
    let logs = $derived($debugStore);
</script>

{#if logs.length > 0}
    <div class="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 font-mono">
        <button 
            class="bg-black/80 text-white px-3 py-1 rounded text-xs border border-white/20 hover:bg-white/10 transition-colors shadow-lg"
            onclick={() => isOpen = !isOpen}
        >
            {isOpen ? 'Close Debug' : 'Debug Log'} ({logs.length})
        </button>

        {#if isOpen}
            <div 
                transition:fade={{ duration: 150 }}
                class="bg-black/95 text-white p-4 rounded-lg w-[90vw] max-w-lg max-h-[60vh] overflow-y-auto border border-white/20 shadow-2xl text-[10px]"
            >
                <div class="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                    <span class="font-bold text-xs uppercase tracking-widest text-theme-primary">Console Output</span>
                    <button 
                        class="text-red-400 hover:text-red-300 text-[9px] uppercase font-bold"
                        onclick={() => debugStore.clear()}
                    >
                        Clear
                    </button>
                </div>
                <div class="flex flex-col gap-1">
                    {#each logs as log, index (`${log.timestamp}-${index}`)}
                        <div class="flex gap-2 border-b border-white/5 pb-1 last:border-0">
                            <span class="text-gray-500 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span class="{
                                log.level === 'error' ? 'text-red-400 font-bold' :
                                log.level === 'warn' ? 'text-amber-400' :
                                'text-green-400'
                            } uppercase w-10 shrink-0">
                                {log.level}
                            </span>
                            <span class="break-words flex-1">
                                {log.message}
                                {#if log.data}
                                    <pre class="mt-1 bg-white/5 p-1 rounded overflow-x-auto text-gray-300 max-h-32">{JSON.stringify(log.data, null, 2)}</pre>
                                {/if}
                            </span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
{/if}
