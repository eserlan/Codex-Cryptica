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

<div
  class="flex min-w-0 flex-col gap-2 md:flex-row"
  data-testid="archive-entry-display"
>
  <div
    class="flex min-w-0 flex-1 flex-col justify-center gap-1 rounded-md border border-theme-border px-3 py-2 text-theme-text"
  >
    <div class="flex min-w-0 items-center justify-between gap-3">
      <button
        class="min-w-0 break-words [overflow-wrap:anywhere] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        type="button"
        onclick={onOpen}
        aria-label={`Open adventure ${entry.title}`}
      >
        {entry.title}
      </button>
      <span
        class="shrink-0 rounded-full border border-theme-border px-2 py-1 text-xs text-theme-text"
      >
        {entry.loadCondition === "unreadable" ? "Unreadable" : entry.status}
      </span>
    </div>
    {#if entry.sourcePackage}
      <details class="min-w-0 max-w-full font-mono text-xs text-theme-text">
        <summary
          class="w-fit max-w-full cursor-pointer break-all rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
          data-testid="archive-entry-source-package"
        >
          v{entry.sourcePackage.version} · {entry.sourcePackage.packageId.slice(
            0,
            24,
          )}{entry.sourcePackage.packageId.length > 24 ? "…" : ""} · {entry.sourcePackage.hash.slice(
            0,
            8,
          )}
        </summary>
        <span class="mt-1 block break-all text-theme-text">
          Package ID: {entry.sourcePackage.packageId}<br />
          Version: {entry.sourcePackage.version}<br />
          Hash: {entry.sourcePackage.hash}
        </span>
      </details>
    {/if}
  </div>

  <div class="flex min-w-0 flex-wrap items-center gap-2 md:flex-nowrap">
    {#if canEdit}
      <button
        class="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-theme-text text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        type="button"
        onclick={onStartRename}
        aria-label="Rename adventure {entry.title}"
        title="Rename"
      >
        <span class="icon-[lucide--pencil] h-4 w-4" aria-hidden="true"></span>
      </button>
      <button
        class="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-theme-text text-theme-text transition hover:bg-theme-primary/10 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
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
        class="order-first flex min-h-11 items-center justify-center rounded-md bg-theme-primary px-4 text-sm font-semibold text-theme-on-primary transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary md:order-last"
        type="button"
        onclick={onResume}
        aria-label="Resume active adventure {entry.title}"
      >
        Resume
      </button>
    {/if}

    {#if entry.status === "archived" && isReadable && onResumeArchived}
      <button
        class="order-first flex min-h-11 items-center justify-center rounded-md bg-theme-primary px-4 text-sm font-semibold text-theme-on-primary transition hover:opacity-90 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary md:order-last"
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
        class="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-theme-text text-theme-text transition hover:bg-theme-danger/10 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
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
</div>
