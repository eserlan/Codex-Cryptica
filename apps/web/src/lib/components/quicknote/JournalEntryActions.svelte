<script lang="ts">
  import type { JournalEntry } from "session-journal-engine";
  import JournalEntryButtonGroup from "./JournalEntryButtonGroup.svelte";

  /**
   * A journal entry's action row (#3402 slice 4 promote; #3476 edit, delete,
   * move): the "Choose parts" checkbox, and, while not editing, Move up/down,
   * Edit, Delete and Make entity. Shown by `JournalEntryRow`, which owns
   * whether the entry is currently being edited.
   */
  type ActionResult = { ok: true } | { ok: false; error: string };

  let {
    entry,
    snippet,
    isEditing,
    selectable = false,
    selected = false,
    onToggleSelect,
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
    isEditing: boolean;
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: (entry: JournalEntry) => void;
    canEdit?: boolean;
    onStartEdit?: () => void;
    onDelete?: (entry: JournalEntry) => Promise<ActionResult>;
    onMoveUp?: (entry: JournalEntry) => Promise<ActionResult>;
    onMoveDown?: (entry: JournalEntry) => Promise<ActionResult>;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    onPromote?: (entry: JournalEntry) => void;
  } = $props();

  const hasAnyAction = $derived(
    selectable ||
      !!onPromote ||
      canEdit ||
      !!onDelete ||
      !!onMoveUp ||
      !!onMoveDown,
  );
</script>

{#if hasAnyAction}
  <div class="mt-1.5 flex items-center justify-between gap-2">
    {#if selectable}
      <label class="flex items-center gap-1.5 text-micro text-theme-muted">
        <input
          type="checkbox"
          checked={selected}
          onchange={() => onToggleSelect?.(entry)}
          aria-label={`Choose: ${snippet}`}
        />
        Choose
      </label>
    {/if}
    {#if !isEditing}
      <JournalEntryButtonGroup
        {entry}
        {snippet}
        {canEdit}
        {onStartEdit}
        {onDelete}
        {onMoveUp}
        {onMoveDown}
        {canMoveUp}
        {canMoveDown}
        {onPromote}
      />
    {/if}
  </div>
{/if}
