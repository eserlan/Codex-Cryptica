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
  <!-- Keep the choices mounted across turn transitions. Hiding the focused
       action by unmounting it can unexpectedly exit fullscreen on Chrome. -->
  <details
    class={visible ? "group rounded-lg border border-theme-border" : "hidden"}
    aria-label="Suggested actions"
    data-testid="adventure-suggested-actions"
  >
    <summary
      class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg bg-theme-bg px-3 py-2 text-sm font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary [&::-webkit-details-marker]:hidden"
    >
      <span>Suggested actions ({manager.suggestedActions.length})</span>
      <span
        aria-hidden="true"
        class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
      ></span>
    </summary>
    <div class="grid max-h-48 gap-2 overflow-y-auto border-t border-theme-border p-2">
      {#each manager.suggestedActions as suggestion (suggestion)}
        <button
          class="min-h-11 w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-left text-sm leading-snug text-theme-text transition hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          {disabled}
          onclick={() => void manager.submitSuggestedAction(suggestion)}
        >
          {suggestion}
        </button>
      {/each}
    </div>
  </details>
{/if}
