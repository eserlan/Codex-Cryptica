<script lang="ts">
    import { helpStore } from "$stores/help.svelte";
    import { fly } from "svelte/transition";
    import { FEATURE_HINTS } from "$lib/config/help-content";

    let { hintId } = $props<{ hintId: string }>();
    
    const hint = $derived(FEATURE_HINTS[hintId]);
    const isDismissed = $derived(helpStore.isHintDismissed(hintId));
</script>

{#if hint && !isDismissed}
    <div
        class="bg-green-950/90 border border-green-500/50 p-3 rounded shadow-lg flex flex-col gap-2 max-w-[200px]"
        transition:fly={{ y: 5, duration: 200 }}
    >
        <div class="flex justify-between items-center border-b border-green-900/30 pb-1">
            <span class="text-[9px] font-bold text-green-400 uppercase tracking-widest">{hint.title}</span>
            <button 
                onclick={() => helpStore.dismissHint(hintId)}
                class="text-green-700 hover:text-green-400 transition-colors"
                data-testid="dismiss-hint-button"
                aria-label="Dismiss hint"
            >
                <span class="icon-[lucide--x] w-3 h-3"></span>
            </button>
        </div>
        <p class="text-[10px] text-green-100/80 leading-tight">
            {hint.content}
        </p>
    </div>
{/if}
