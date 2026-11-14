<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";

  let {
    manager,
    disabled,
    visible,
    chips = false,
  }: {
    manager: AdventureManager;
    disabled: boolean;
    visible: boolean;
    /** Show suggestions as collapsible chips instead of a collapsed list. */
    chips?: boolean;
  } = $props();

  let chipsCollapsed = $state(false);
</script>

{#if manager.suggestedActions.length > 0 && chips}
  <!-- Roomy screens: show the options up front with a compact collapse toggle
       so the player can reclaim transcript space. Phones keep the compact
       disclosure below so the free-action composer stays reachable. -->
  <div
    class={visible ? "flex flex-col gap-1.5 pb-1" : "hidden"}
    data-testid="adventure-suggested-actions"
  >
    <div class="flex justify-center">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-theme-border bg-theme-bg px-3 py-1 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        aria-expanded={!chipsCollapsed}
        data-testid="adventure-suggested-actions-toggle"
        onclick={() => (chipsCollapsed = !chipsCollapsed)}
      >
        <span
          class="icon-[lucide--list-checks] h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        ></span>
        {chipsCollapsed
          ? `Suggested actions (${manager.suggestedActions.length})`
          : "Hide suggestions"}
        <span
          class={`icon-[lucide--chevron-up] h-3.5 w-3.5 shrink-0 transition-transform ${chipsCollapsed ? "rotate-180" : ""}`}
          aria-hidden="true"
        ></span>
      </button>
    </div>
    {#if !chipsCollapsed}
      <div
        class="flex max-h-36 flex-wrap justify-center gap-2 overflow-y-auto overscroll-contain pb-1"
        role="group"
        aria-label="Suggested actions"
      >
        {#each manager.suggestedActions as suggestion (suggestion)}
          <button
            class="min-h-10 max-w-full rounded-2xl border border-theme-border bg-theme-bg px-3 py-1.5 text-left text-sm leading-snug whitespace-normal text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:opacity-50"
            type="button"
            {disabled}
            onclick={() => void manager.submitSuggestedAction(suggestion)}
          >
            {suggestion}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{:else if manager.suggestedActions.length > 0}
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
    <div
      class="flex max-h-36 flex-col gap-2 overflow-y-auto overscroll-contain border-t border-theme-border p-2"
    >
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
