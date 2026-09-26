<script lang="ts">
  import { entryTypeLabel, type JournalEntry } from "session-journal-engine";

  /**
   * One entry in the Session Journal (#3402 slice 3, #3408; promote controls
   * from slice 4, #3409). A typed note looks as it always has; an automatic
   * entry (a roll, draw or table result) is marked with a label and an icon, so
   * the two are told apart at a glance without relying on colour (spec 163,
   * FR-028).
   */
  let {
    entry,
    sectionName,
    onPromote,
    selectable = false,
    selected = false,
    onToggleSelect,
  }: {
    entry: JournalEntry;
    sectionName?: string;
    /** When given, the row offers "Make entity". */
    onPromote?: (entry: JournalEntry) => void;
    /** True while "Choose parts" is on: the row shows a checkbox. */
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: (entry: JournalEntry) => void;
  } = $props();

  // The label comes from the engine, so the journal and the text built for an
  // entity always agree. Only the icon is chosen here. A type the journal has
  // never seen is still shown, as a generic automatic entry.
  const ICONS: Record<string, string> = {
    "dice-roll": "icon-[lucide--dices]",
    "card-draw": "icon-[lucide--layers]",
    "table-result": "icon-[lucide--table]",
  };
  const GENERIC_ICON = "icon-[lucide--zap]";

  const label = $derived(entryTypeLabel(entry.type));
  const isAutomatic = $derived(label !== undefined);
  const kind = $derived(
    label ? { label, icon: ICONS[entry.type] ?? GENERIC_ICON } : undefined,
  );
  const snippet = $derived(
    entry.content.length > 40
      ? `${entry.content.slice(0, 40)}…`
      : entry.content,
  );
</script>

<div
  class="rounded border p-2 text-xs {isAutomatic
    ? 'border-theme-accent/40 border-l-2 bg-theme-accent/5'
    : 'border-theme-border/30'}"
  data-testid="journal-entry"
  data-entry-type={entry.type}
  data-automatic={isAutomatic ? "true" : "false"}
>
  <div class="flex items-center justify-between text-[9px] text-theme-muted">
    <span class="flex items-center gap-1.5">
      {#if kind}
        <span
          class="flex items-center gap-1 font-bold uppercase tracking-wider text-theme-accent"
          data-testid="journal-entry-label"
        >
          <span aria-hidden="true" class="{kind.icon} h-3 w-3"></span>
          {kind.label}
        </span>
      {/if}
      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
    </span>
    {#if sectionName}
      <span class="text-theme-accent">{sectionName}</span>
    {/if}
  </div>
  <p class="text-theme-text">{entry.content}</p>
  {#if selectable || onPromote}
    <div class="mt-1.5 flex items-center justify-between gap-2">
      {#if selectable}
        <label class="flex items-center gap-1.5 text-[10px] text-theme-muted">
          <input
            type="checkbox"
            checked={selected}
            onchange={() => onToggleSelect?.(entry)}
            aria-label={`Choose: ${snippet}`}
          />
          Choose
        </label>
      {/if}
      {#if onPromote}
        <button
          type="button"
          onclick={() => onPromote(entry)}
          aria-label={`Make entity from: ${snippet}`}
          class="ml-auto font-header text-[9px] font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-primary"
          data-testid="journal-entry-promote"
        >
          Make entity
        </button>
      {/if}
    </div>
  {/if}
</div>
