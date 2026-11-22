<script lang="ts">
  import type { AdventureArchiveEntry } from "#lib/services/adventure/adventure-session-repository.js";
  import AdventureArchiveEntryDisplay from "./AdventureArchiveEntryDisplay.svelte";

  let {
    entry,
    renaming,
    renameDraft = $bindable(),
    renameError,
    duplicating,
    deleting,
    resuming,
    onSave,
    onCancelRename,
    onStartRename,
    onDuplicate,
    onResume,
    onResumeArchived,
    onDelete,
    onOpen,
  }: {
    entry: AdventureArchiveEntry;
    renaming: boolean;
    renameDraft: string;
    renameError: string | null;
    duplicating: boolean;
    deleting: boolean;
    resuming: boolean;
    onSave: () => void;
    onCancelRename: () => void;
    onStartRename: () => void;
    onDuplicate: () => void;
    onResume?: () => void;
    onResumeArchived?: () => void;
    onDelete: () => void;
    onOpen: () => void;
  } = $props();
</script>

<li class="flex flex-col gap-2 rounded-md border border-theme-border p-2">
  {#if renaming}
    <div class="flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        bind:value={renameDraft}
        aria-label="Rename adventure {entry.title}"
        class="min-h-12 min-w-0 flex-1 rounded-md border border-theme-text/75 bg-theme-surface px-3 text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
      />
      <div class="flex gap-2">
        <button
          type="button"
          class="flex min-h-11 flex-1 items-center justify-center rounded-md bg-theme-primary px-3 text-sm font-semibold text-theme-on-primary transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text sm:min-h-12 sm:flex-none"
          onclick={onSave}
        >
          Save
        </button>
        <button
          type="button"
          class="flex min-h-11 flex-1 items-center justify-center rounded-md border border-theme-text/75 px-3 text-sm text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text sm:min-h-12 sm:flex-none"
          onclick={onCancelRename}
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <AdventureArchiveEntryDisplay
      {entry}
      {duplicating}
      {deleting}
      {resuming}
      {onStartRename}
      {onDuplicate}
      {onResume}
      {onResumeArchived}
      {onDelete}
      {onOpen}
    />
  {/if}
  {#if renaming && renameError}
    <p class="text-sm text-theme-text" role="alert">{renameError}</p>
  {/if}
</li>
