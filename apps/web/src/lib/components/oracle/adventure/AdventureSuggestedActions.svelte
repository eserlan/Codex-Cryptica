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
  <!-- Compact by default so the free-action composer stays reachable on phones.
       Native details/summary supports keyboard and screen-reader disclosure. -->
  <details
    class={visible
      ? "group rounded-lg border border-theme-border bg-theme-bg"
      : "hidden"}
    data-testid="adventure-suggested-actions"
  >
    <summary
      class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary [&::-webkit-details-marker]:hidden"
    >
      <span class="flex min-w-0 items-center gap-2">
        <span
          class="icon-[lucide--list-checks] h-4 w-4 shrink-0"
          aria-hidden="true"
        ></span>
        Suggested actions ({manager.suggestedActions.length})
      </span>
      <span
        class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
        aria-hidden="true"
      ></span>
    </summary>
    <div class="flex flex-col gap-2 border-t border-theme-border p-2">
      {#each manager.suggestedActions as suggestion (suggestion)}
        <button
          class="min-h-11 w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-left text-sm leading-relaxed whitespace-normal text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:opacity-50"
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
