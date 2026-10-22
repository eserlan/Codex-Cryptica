<script lang="ts">
  import { dialogFocus } from "./biome-dialog-focus";
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";

  let { store }: { store: BiomeExplorerStore } = $props();
</script>

{#if store.discardPending}
  <div
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="biome-discard-title"
    use:dialogFocus={{
      onEscape: () => store.cancelDiscard(),
      initial: "[data-keep]",
    }}
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
  >
    <div
      class="flex max-w-sm flex-col gap-3 rounded-xl border border-theme-border bg-theme-surface p-5"
    >
      <h2 id="biome-discard-title" class="font-header text-lg text-theme-text">
        Discard your changes?
      </h2>
      <p class="text-sm text-theme-muted">
        You have unsaved changes to this biome. They will be lost.
      </p>
      <div class="flex gap-3">
        <button
          type="button"
          data-keep
          class="rounded-lg border border-theme-border px-4 py-2 text-theme-text"
          onclick={() => store.cancelDiscard()}>Keep editing</button
        >
        <button
          type="button"
          class="rounded-lg border border-theme-danger px-4 py-2 text-theme-danger"
          onclick={() => store.discardDraft(true)}>Discard changes</button
        >
      </div>
    </div>
  </div>
{/if}
