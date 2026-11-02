<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";

  let {
    manager,
    disabled,
    visible,
  }: {
    manager: AdventureManager;
    disabled: boolean;
    visible: boolean;
  } = $props();
</script>

{#if manager.suggestedActions.length > 0}
  <div
    class={visible
      ? "flex snap-x gap-2 overflow-x-auto overscroll-x-contain pb-1"
      : "hidden"}
    aria-label="Suggested actions"
    data-testid="adventure-suggested-actions"
  >
    {#each manager.suggestedActions as suggestion (suggestion)}
      <button
        class="min-h-11 max-w-[15rem] shrink-0 snap-start rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-left text-xs leading-snug text-theme-text transition hover:bg-theme-primary/10 sm:text-sm"
        type="button"
        {disabled}
        onclick={() => void manager.submitSuggestedAction(suggestion)}
      >
        <span class="line-clamp-2">{suggestion}</span>
      </button>
    {/each}
  </div>
{/if}
