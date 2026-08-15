<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  let { manager }: { manager: AdventureManager } = $props();
  let action = $derived(manager.draft);
  let disabled = $derived(
    manager.readOnly ||
      manager.phase === "generating" ||
      manager.phase === "offline",
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
  <form
    class="space-y-2"
    onsubmit={(event) => {
      event.preventDefault();
      void manager.submitAction(action);
    }}
  >
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
      disabled={disabled || !manager.draft.trim()}
      >{manager.phase === "generating"
        ? "Oracle is thinking…"
        : "Submit action"}</button
    >
    {#if manager.phase === "generating"}<button
        class="min-h-12 rounded-md border border-theme-border px-4 py-2 text-theme-primary"
        type="button"
        onclick={() => manager.cancel()}>Cancel</button
      >{/if}
  </form>
  {#if manager.errorMessage}<p class="text-sm text-theme-danger" role="alert">
      {manager.errorMessage}
    </p>{/if}
</section>
