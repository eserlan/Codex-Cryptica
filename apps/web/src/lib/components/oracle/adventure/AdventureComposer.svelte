<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  let { manager }: { manager: AdventureManager } = $props();
  let action = $derived(manager.draft);
  let disabled = $derived(
    manager.readOnly ||
      manager.phase === "generating" ||
      manager.phase === "offline" ||
      manager.phase === "awaiting-roll" ||
      manager.phase === "ready-to-resolve",
  );
</script>

<div
  class="sticky bottom-0 z-10 space-y-2 border-t border-theme-border bg-theme-bg px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4"
>
  {#if manager.phase === "generating"}
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm text-theme-secondary">Waiting for the Oracle…</p>
      <button
        class="min-h-12 rounded-md border border-theme-border px-4 py-2 text-theme-primary"
        type="button"
        onclick={() => manager.cancel()}>Cancel</button
      >
    </div>
  {:else}
    <form
      class="space-y-2"
      onsubmit={(event) => {
        event.preventDefault();
        void manager.submitAction(action);
      }}
    >
      {#if manager.suggestedActions.length > 0 && !disabled}
        <div class="flex flex-wrap gap-2" aria-label="Suggested actions">
          {#each manager.suggestedActions as suggestion (suggestion)}
            <button
              class="rounded-md border border-theme-border px-3 py-2 text-sm text-theme-primary transition hover:bg-theme-primary/10"
              type="button"
              onclick={() => void manager.submitSuggestedAction(suggestion)}
              >{suggestion}</button
            >
          {/each}
        </div>
      {/if}
      <label class="block text-sm text-theme-primary" for="adventure-action"
        >What do you do?</label
      >
      <textarea
        id="adventure-action"
        class="min-h-24 w-full rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-theme-primary"
        bind:value={manager.draft}
        {disabled}
        placeholder="Describe your character's action"
      ></textarea>
      <button
        class="min-h-12 rounded-md bg-theme-primary px-4 py-2 text-theme-on-primary disabled:opacity-50"
        type="submit"
        disabled={disabled || !manager.draft.trim()}>Submit action</button
      >
    </form>
  {/if}
  {#if manager.errorMessage}<p class="text-sm text-theme-danger" role="alert">
      {manager.errorMessage}
    </p>{/if}
</div>
