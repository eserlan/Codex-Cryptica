<script lang="ts">
  import type { AdventureArchiveEntry } from "#lib/services/adventure/adventure-session-repository.js";

  let {
    entry,
    duplicating,
    deleting,
    resuming,
    onStartRename,
    onDuplicate,
    onResume,
    onResumeArchived,
    onDelete,
    onOpen,
  }: {
    entry: AdventureArchiveEntry;
    duplicating: boolean;
    deleting: boolean;
    resuming: boolean;
    onStartRename: () => void;
    onDuplicate: () => void;
    onResume?: () => void;
    onResumeArchived?: () => void;
    onDelete: () => void;
    onOpen: () => void;
  } = $props();

  const isReadable = $derived(entry.loadCondition === "normal");
  const canEdit = $derived(isReadable && entry.revision !== undefined);
  const canDelete = $derived(
    entry.loadCondition === "unreadable" ||
      (entry.status === "archived" && entry.revision !== undefined),
  );
</script>

<div class="flex gap-2">
  <button
    class="flex min-h-12 min-w-0 flex-1 items-center justify-between rounded-md border border-theme-border px-3 text-left text-theme-text"
    type="button"
    onclick={onOpen}
    aria-label={`Open adventure ${entry.title}`}
  >
    <span class="flex min-w-0 flex-col">
      <span>{entry.title}</span>
      {#if entry.sourcePackage}
        <span
          class="font-mono text-xs text-theme-text"
          data-testid="archive-entry-source-package"
        >
          {entry.sourcePackage.packageId} v{entry.sourcePackage.version} · {entry.sourcePackage.hash.slice(
            0,
            8,
          )}
        </span>
      {/if}
    </span>
    <span class="text-xs text-theme-text">
      {entry.loadCondition === "unreadable" ? "Unreadable" : entry.status}
    </span>
  </button>

  {#if canEdit}
    <button
      class="flex min-h-12 min-w-12 items-center justify-center rounded-md border border-theme-border px-3 text-theme-text transition hover:bg-theme-primary/10"
      type="button"
      onclick={onStartRename}
      aria-label="Rename adventure {entry.title}"
      title="Rename"
    >
      <span class="icon-[lucide--pencil] h-4 w-4" aria-hidden="true"></span>
    </button>
    <button
      class="flex min-h-12 min-w-12 items-center justify-center rounded-md border border-theme-border px-3 text-theme-text transition hover:bg-theme-primary/10 disabled:opacity-50"
      type="button"
      onclick={onDuplicate}
      disabled={duplicating}
      aria-label="Duplicate adventure {entry.title}"
      title="Duplicate"
    >
      <span class="icon-[lucide--copy] h-4 w-4" aria-hidden="true"></span>
    </button>
  {/if}

  {#if entry.status === "active" && isReadable && onResume}
    <button
      class="flex min-h-12 items-center justify-center rounded-md border border-theme-primary/50 px-3 text-sm text-theme-text transition hover:bg-theme-primary/10"
      type="button"
      onclick={onResume}
      aria-label="Resume active adventure {entry.title}"
    >
      Resume
    </button>
  {/if}

  {#if entry.status === "archived" && isReadable && onResumeArchived}
    <button
      class="flex min-h-12 items-center justify-center rounded-md border border-theme-primary/50 px-3 text-sm text-theme-text transition hover:bg-theme-primary/10 disabled:opacity-50"
      type="button"
      onclick={onResumeArchived}
      disabled={resuming}
      aria-label="Resume archived adventure {entry.title}"
    >
      Resume
    </button>
  {/if}

  {#if canDelete}
    <button
      class="flex min-h-12 min-w-12 items-center justify-center rounded-md border border-theme-danger/50 px-3 text-theme-danger transition hover:bg-theme-danger/10 disabled:opacity-50"
      type="button"
      onclick={onDelete}
      disabled={deleting}
      aria-label="Delete {entry.loadCondition === 'unreadable'
        ? 'unreadable'
        : 'archived'} adventure {entry.title}"
      title="Delete adventure"
    >
      <span class="icon-[lucide--trash-2] h-4 w-4" aria-hidden="true"></span>
    </button>
  {/if}
</div>
