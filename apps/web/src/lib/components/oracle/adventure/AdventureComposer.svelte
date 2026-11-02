<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import AdventureSuggestedActions from "./AdventureSuggestedActions.svelte";

  let { manager }: { manager: AdventureManager } = $props();
  let action = $derived(manager.draft);
  let disabled = $derived(
    manager.readOnly ||
      manager.phase === "generating" ||
      manager.phase === "offline" ||
      manager.phase === "awaiting-roll" ||
      manager.phase === "ready-to-resolve",
  );
  // Preserve controls in the DOM during phase transitions. Unmounting a
  // focused button can exit native fullscreen unexpectedly in Chrome.
  let actionControlsVisible = $derived(
    manager.phase !== "generating" &&
      manager.phase !== "awaiting-roll" &&
      manager.phase !== "ready-to-resolve",
  );
</script>

<div
  class="z-10 shrink-0 space-y-2 border-t border-theme-border bg-theme-surface px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:pt-3"
  data-testid="adventure-action-dock"
>
  <form
    class="space-y-2"
    onsubmit={(event) => {
      event.preventDefault();
      void manager.submitAction(action);
    }}
  >
    <div
      class={manager.phase === "generating"
        ? "flex items-center justify-between gap-3 py-1"
        : "hidden"}
    >
      <div class="min-w-0">
        <p class="flex items-center gap-2 text-sm text-theme-text" role="status">
          <span
            class="icon-[lucide--sparkles] h-4 w-4 shrink-0 motion-safe:animate-pulse"
            aria-hidden="true"
          ></span>
          Oracle is responding…
        </p>
        {#if manager.draft.trim()}
          <p class="truncate text-xs text-theme-muted" title={manager.draft}>
            Playing: {manager.draft}
          </p>
        {/if}
      </div>
      <button
        class="min-h-11 rounded-md border border-theme-border px-3 text-theme-text"
        type="button"
        onclick={() => manager.cancel()}>Cancel</button
      >
    </div>
    <AdventureSuggestedActions
      {manager}
      {disabled}
      visible={actionControlsVisible}
    />
    <div
      class={actionControlsVisible ? "flex items-end gap-2" : "hidden"}
      data-testid="adventure-free-action"
    >
      <label class="sr-only" for="adventure-action">What do you do?</label>
      <textarea
        id="adventure-action"
        rows="2"
        class="min-h-11 max-h-32 min-w-0 flex-1 resize-y rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-sm leading-relaxed text-theme-text placeholder:text-theme-muted"
        bind:value={manager.draft}
        {disabled}
        placeholder="What do you do?"
      ></textarea>
      <button
        class="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-theme-primary px-3 py-2 text-theme-on-primary disabled:opacity-50"
        type="submit"
        aria-label="Submit action"
        disabled={disabled || !manager.draft.trim()}
      >
        <span class="icon-[lucide--send] h-4 w-4" aria-hidden="true"></span>
        <span class="hidden sm:inline">Send</span>
      </button>
    </div>
  </form>
  {#if manager.errorMessage}
    <p class="text-sm text-theme-danger" role="alert">
      {manager.errorMessage}
    </p>
  {/if}
</div>
