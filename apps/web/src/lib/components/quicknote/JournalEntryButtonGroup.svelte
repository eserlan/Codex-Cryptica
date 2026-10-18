<script lang="ts">
  import type { JournalEntry } from "session-journal-engine";

  /**
   * The Move/Edit/Delete/Make-entity buttons for one journal entry (#3476,
   * #3409). Split out of `JournalEntryActions.svelte` to keep its template
   * simple; this component only renders buttons, the parent owns what they do.
   */
  type ActionResult = { ok: true } | { ok: false; error: string };

  let {
    entry,
    snippet,
    canEdit = false,
    onStartEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    canMoveUp = false,
    canMoveDown = false,
    onPromote,
  }: {
    entry: JournalEntry;
    snippet: string;
    canEdit?: boolean;
    onStartEdit?: () => void;
    onDelete?: (entry: JournalEntry) => Promise<ActionResult>;
    onMoveUp?: (entry: JournalEntry) => Promise<ActionResult>;
    onMoveDown?: (entry: JournalEntry) => Promise<ActionResult>;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    onPromote?: (entry: JournalEntry) => void;
  } = $props();

  let error = $state<string | null>(null);

  async function handleDelete() {
    const result = await onDelete!(entry);
    error = result.ok ? null : result.error;
  }

  async function handleMove(direction: "up" | "down") {
    const allowed = direction === "up" ? canMoveUp : canMoveDown;
    if (!allowed) return;
    const action = direction === "up" ? onMoveUp! : onMoveDown!;
    const result = await action(entry);
    error = result.ok ? null : result.error;
  }
</script>

<div class="ml-auto flex items-center gap-2">
  {#if onMoveUp || onMoveDown}
    <button
      type="button"
      onclick={() => handleMove("up")}
      disabled={!canMoveUp}
      aria-label={`Move up: ${snippet}`}
      class="font-header text-nano font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-primary disabled:opacity-30 disabled:hover:text-theme-muted"
      data-testid="journal-entry-move-up"
    >
      <span aria-hidden="true" class="icon-[lucide--chevron-up] h-3 w-3"></span>
    </button>
    <button
      type="button"
      onclick={() => handleMove("down")}
      disabled={!canMoveDown}
      aria-label={`Move down: ${snippet}`}
      class="font-header text-nano font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-primary disabled:opacity-30 disabled:hover:text-theme-muted"
      data-testid="journal-entry-move-down"
    >
      <span aria-hidden="true" class="icon-[lucide--chevron-down] h-3 w-3"
      ></span>
    </button>
  {/if}
  {#if canEdit}
    <button
      type="button"
      onclick={onStartEdit}
      aria-label={`Edit: ${snippet}`}
      class="font-header text-nano font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-primary"
      data-testid="journal-entry-edit"
    >
      Edit
    </button>
  {/if}
  {#if onDelete}
    <button
      type="button"
      onclick={handleDelete}
      aria-label={`Delete: ${snippet}`}
      class="font-header text-nano font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-danger"
      data-testid="journal-entry-delete"
    >
      Delete
    </button>
  {/if}
  {#if onPromote}
    <button
      type="button"
      onclick={() => onPromote(entry)}
      aria-label={`Make entity from: ${snippet}`}
      class="font-header text-nano font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-primary"
      data-testid="journal-entry-promote"
    >
      Make entity
    </button>
  {/if}
</div>
{#if error}
  <p role="alert" class="text-micro text-theme-danger">{error}</p>
{/if}
