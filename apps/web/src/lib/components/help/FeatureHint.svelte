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
    class="bg-theme-surface/95 border border-theme-primary/50 p-3 rounded shadow-lg flex flex-col gap-2 max-w-[200px]"
    transition:fly={{ y: 5, duration: 200 }}
  >
    <div
      class="flex justify-between items-center border-b border-theme-border/30 pb-1"
    >
      <span
        class="text-[9px] font-bold text-theme-primary uppercase font-header tracking-widest"
        >{hint.title}</span
      >
      <button
        onclick={() => helpStore.dismissHint(hintId)}
        class="text-theme-muted hover:text-theme-primary transition-colors"
        data-testid="dismiss-hint-button"
        aria-label="Dismiss hint"
      >
        <span class="icon-[lucide--x] w-3 h-3"></span>
      </button>
    </div>
    <p class="text-[10px] text-theme-text/80 leading-tight">
      {hint.content}
    </p>
  </div>
{/if}
