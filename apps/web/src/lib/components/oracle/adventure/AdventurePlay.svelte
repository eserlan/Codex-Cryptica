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

<section class="space-y-4" aria-labelledby="adventure-heading">
  <div class="flex items-center justify-between gap-3">
    <div>
      <h2
        id="adventure-heading"
        class="text-lg font-semibold text-theme-primary"
      >
        {manager.session?.title ?? "Adventure"}
      </h2>
      <p class="text-sm text-theme-secondary">
        {manager.readOnly
          ? "Read-only in this tab"
          : manager.phase === "offline"
            ? "Waiting for connection"
            : manager.phase}
      </p>
    </div>
    {#if manager.session && !manager.readOnly}<button
        class="min-h-12 rounded-md border border-theme-border px-3 text-theme-primary"
        type="button"
        onclick={() => void manager.end()}>End adventure</button
      >{/if}
  </div>
  {#if manager.lastRollResult}
    <p class="text-sm text-theme-secondary" aria-live="polite">
      <strong>Roll result:</strong>
      {manager.lastRollResult}
    </p>
  {/if}
  {#if manager.transcript}
    <div class="space-y-3" aria-live="polite">
      {#each manager.transcript.turns as turn (turn.sequence)}
        <article class="rounded-lg border border-theme-border p-3">
          <p class="text-xs text-theme-secondary">You</p>
          <p class="text-sm text-theme-primary">{turn.playerAction}</p>
          <p class="mt-2 text-xs text-theme-secondary">Oracle</p>
          <p class="text-sm text-theme-primary">{turn.narration}</p>
        </article>
      {/each}
    </div>
  {/if}
  {#if manager.phase === "generating"}
    <section
      class="space-y-3 rounded-md border border-theme-primary/40 bg-theme-primary/10 px-3 py-3"
      role="status"
      aria-live="polite"
    >
      <div
        class="flex items-center gap-2 text-sm font-medium text-theme-primary"
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--loader-2] h-4 w-4 animate-spin"
        ></span>
        Oracle is responding to your action…
      </div>
      <button
        class="min-h-12 rounded-md border border-theme-border px-4 py-2 text-theme-primary"
        type="button"
        onclick={() => manager.cancel()}>Cancel</button
      >
    </section>
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
</section>
