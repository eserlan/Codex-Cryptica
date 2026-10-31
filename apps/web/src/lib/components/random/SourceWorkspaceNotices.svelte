<script lang="ts">
  import type { RandomSource } from "random-source-engine";
  let {
    source,
    deleteImpact,
    pendingRename,
    onDelete,
    onCancelDelete,
    onRename,
    onCancelRename,
  }: {
    source: RandomSource;
    deleteImpact?: RandomSource[];
    pendingRename?: { name: string; referencedBy: RandomSource[] };
    onDelete: (source: RandomSource) => void;
    onCancelDelete: () => void;
    onRename: (name: string) => void;
    onCancelRename: () => void;
  } = $props();
</script>

{#if deleteImpact}
  <div
    class="mb-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-500"
    data-testid="delete-impact"
  >
    {#if deleteImpact.length > 0}
      <p class="mb-2">
        {deleteImpact.map((s) => s.name).join(", ")}
        {deleteImpact.length === 1 ? "refers" : "refer"} to "{source.name}".
        Deleting it leaves those references unresolved.
      </p>
    {:else}
      <p class="mb-2">Delete "{source.name}"? This cannot be undone.</p>
    {/if}
    <div class="flex gap-2">
      <button
        type="button"
        class="rounded bg-red-500 px-2.5 py-1 font-header text-micro uppercase tracking-widest text-white"
        onclick={() => onDelete(source)}
        data-testid="confirm-delete"
      >
        Delete
      </button>
      <button
        type="button"
        class="rounded border border-theme-border px-2.5 py-1 font-header text-micro uppercase tracking-widest text-theme-muted"
        onclick={onCancelDelete}>Keep it</button
      >
    </div>
  </div>
{/if}

{#if pendingRename}
  <div
    class="mb-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400"
    data-testid="rename-impact"
  >
    <p class="mb-2">
      {pendingRename.referencedBy.map((s) => s.name).join(", ")}
      {pendingRename.referencedBy.length === 1 ? "refers" : "refer"} to "{source.name}"
      by name. Renaming it to "{pendingRename.name}" leaves those references
      pointing at nothing.
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        class="rounded bg-amber-500 px-2.5 py-1 font-header text-micro uppercase tracking-widest text-white"
        onclick={() => onRename(pendingRename!.name)}
        data-testid="confirm-rename"
      >
        Rename anyway
      </button>
      <button
        type="button"
        class="rounded border border-theme-border px-2.5 py-1 font-header text-micro uppercase tracking-widest text-theme-muted"
        onclick={onCancelRename}>Keep the name</button
      >
    </div>
  </div>
{/if}
