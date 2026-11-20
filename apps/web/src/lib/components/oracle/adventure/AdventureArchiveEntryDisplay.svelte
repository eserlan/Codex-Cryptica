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
  const statusLabel = $derived(
    entry.loadCondition === "unreadable" ? "Unreadable" : entry.status,
  );
  const hasActions = $derived(
    canEdit ||
      (entry.status === "active" && isReadable && Boolean(onResume)) ||
      (entry.status === "archived" &&
        isReadable &&
        Boolean(onResumeArchived)) ||
      canDelete,
  );
</script>

<div
  class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch"
  data-testid="archive-entry-card"
>
  <button
    class="flex min-h-12 min-w-0 flex-1 flex-col justify-center gap-1 rounded-md border border-theme-text/75 px-3 py-2 text-left text-theme-text transition hover:bg-theme-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
    type="button"
    onclick={onOpen}
    aria-label={`Open adventure ${entry.title}`}
  >
    <span class="flex w-full min-w-0 items-start justify-between gap-2">
      <span
        class="min-w-0 flex-1 break-words font-medium"
        data-testid="archive-entry-title"
      >
        {entry.title}
      </span>
      <span
        class="shrink-0 rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 text-xs text-theme-text"
        data-testid="archive-entry-status"
      >
        {statusLabel}
      </span>
    </span>
    {#if entry.sourcePackage}
      {@const fullPackageLabel = `${entry.sourcePackage.packageId} v${entry.sourcePackage.version} · ${entry.sourcePackage.hash}`}
      <span
        class="block w-full min-w-0 truncate font-mono text-xs text-theme-text"
        data-testid="archive-entry-source-package"
        title={fullPackageLabel}
        aria-label={`Package ${entry.sourcePackage.packageId} version ${entry.sourcePackage.version} hash ${entry.sourcePackage.hash.slice(0, 8)}`}
      >
        {entry.sourcePackage.packageId} v{entry.sourcePackage.version} · {entry.sourcePackage.hash.slice(
          0,
          8,
        )}
      </span>
    {/if}
  </button>

  {#if hasActions}
    <div
      class="flex flex-wrap items-center gap-2 sm:flex-nowrap"
      data-testid="archive-entry-actions"
    >
      {#if entry.status === "active" && isReadable && onResume}
        <button
          class="flex min-h-11 flex-1 items-center justify-center rounded-md bg-theme-primary px-3 text-sm font-semibold text-theme-on-primary transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text sm:min-h-12 sm:flex-none"
          type="button"
          onclick={onResume}
          aria-label="Resume active adventure {entry.title}"
        >
          Resume
        </button>
      {/if}

      {#if entry.status === "archived" && isReadable && onResumeArchived}
        <button
          class="flex min-h-11 flex-1 items-center justify-center rounded-md bg-theme-primary px-3 text-sm font-semibold text-theme-on-primary transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text disabled:cursor-not-allowed sm:min-h-12 sm:flex-none"
          type="button"
          onclick={onResumeArchived}
          disabled={resuming}
          aria-label="Resume archived adventure {entry.title}"
        >
          Resume
        </button>
      {/if}

      {#if canEdit}
        <button
          class="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border border-theme-text/75 px-2.5 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text sm:min-h-12 sm:min-w-12 sm:px-3"
          type="button"
          onclick={onStartRename}
          aria-label="Rename adventure {entry.title}"
          title="Rename"
        >
          <span
            class="icon-[lucide--pencil] h-4 w-4 shrink-0"
            aria-hidden="true"
          ></span>
          <span class="sm:sr-only">Rename</span>
        </button>
        <button
          class="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border border-theme-text/75 px-2.5 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text disabled:cursor-not-allowed sm:min-h-12 sm:min-w-12 sm:px-3"
          type="button"
          onclick={onDuplicate}
          disabled={duplicating}
          aria-label="Duplicate adventure {entry.title}"
          title="Duplicate"
        >
          <span class="icon-[lucide--copy] h-4 w-4 shrink-0" aria-hidden="true"
          ></span>
          <span class="sm:sr-only">Duplicate</span>
        </button>
      {/if}

      {#if canDelete}
        <button
          class="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border border-theme-text/75 px-2.5 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text disabled:cursor-not-allowed sm:min-h-12 sm:min-w-12 sm:px-3"
          type="button"
          onclick={onDelete}
          disabled={deleting}
          aria-label="Delete {entry.loadCondition === 'unreadable'
            ? 'unreadable'
            : 'archived'} adventure {entry.title}"
          title="Delete adventure"
        >
          <span
            class="icon-[lucide--trash-2] h-4 w-4 shrink-0"
            aria-hidden="true"
          ></span>
          <span class="sm:sr-only">Delete</span>
        </button>
      {/if}
    </div>
  {/if}
</div>
