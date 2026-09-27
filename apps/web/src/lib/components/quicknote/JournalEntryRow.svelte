<script lang="ts">
  import { entryTypeLabel, type JournalEntry } from "session-journal-engine";
  import DiceBreakdownDisclosure from "$lib/components/dice/DiceBreakdownDisclosure.svelte";
  import JournalEntryEditForm from "./JournalEntryEditForm.svelte";
  import JournalEntryActions from "./JournalEntryActions.svelte";
  import { parseBreakdownParts } from "$lib/utils/dice-breakdown";
  import { renderMarkdown } from "$lib/utils/markdown";

  /**
   * One entry in the Session Journal (#3402 slice 3, #3408; promote controls
   * from slice 4, #3409). A typed note looks as it always has; an automatic
   * entry (a roll, draw or table result) is marked with a label and an icon, so
   * the two are told apart at a glance without relying on colour (spec 163,
   * FR-028).
   */
  type ActionResult = { ok: true } | { ok: false; error: string };

  let {
    entry,
    sectionName,
    onPromote,
    selectable = false,
    selected = false,
    onToggleSelect,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    canMoveUp = false,
    canMoveDown = false,
  }: {
    entry: JournalEntry;
    sectionName?: string;
    /** When given, the row offers "Make entity". */
    onPromote?: (entry: JournalEntry) => void;
    /** True while "Choose parts" is on: the row shows a checkbox. */
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: (entry: JournalEntry) => void;
    /** When given, a typed note offers Edit (#3476). Automatic entries never
     *  do, since they are a record of what actually happened. */
    onEdit?: (entry: JournalEntry, content: string) => Promise<ActionResult>;
    /** When given, every entry offers Delete (#3476). */
    onDelete?: (entry: JournalEntry) => Promise<ActionResult>;
    /** When given, every entry offers Move up/down (#3476). Moving keeps the
     *  entry's original timestamp. */
    onMoveUp?: (entry: JournalEntry) => Promise<ActionResult>;
    onMoveDown?: (entry: JournalEntry) => Promise<ActionResult>;
    /** Whether this entry is not already first/last, so Move up/down is
     *  offered rather than silently doing nothing at the boundary. */
    canMoveUp?: boolean;
    canMoveDown?: boolean;
  } = $props();

  let isEditing = $state(false);

  function startEdit() {
    isEditing = true;
  }

  function cancelEdit() {
    isEditing = false;
  }

  /** Passed to the edit form: saves, then leaves edit mode on success. */
  async function saveEdit(content: string): Promise<ActionResult> {
    const result = await onEdit!(entry, content);
    if (result.ok) isEditing = false;
    return result;
  }

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
  // A roll or table result carries the dice as they were rolled (#3443). Old
  // entries without a trace, and other entry types, show no breakdown.
  const rollParts = $derived(
    entry.type === "dice-roll" || entry.type === "table-result"
      ? parseBreakdownParts(entry.sourceRef?.parts, entry.sourceRef?.total)
      : undefined,
  );
  const rollTotal = $derived(
    typeof entry.sourceRef?.total === "number" ? entry.sourceRef.total : 0,
  );
  const rollFormula = $derived(
    typeof entry.sourceRef?.formula === "string"
      ? entry.sourceRef.formula
      : undefined,
  );
  const snippet = $derived(
    entry.content.length > 40
      ? `${entry.content.slice(0, 40)}…`
      : entry.content,
  );
  const canEdit = $derived(!!onEdit && entry.type === "manual-note");
  // A typed note may carry basic Markdown (#3481: bold, italic, bullets, and
  // line breaks via `breaks`); an automatic entry is plain, system-generated
  // text and is left exactly as it renders today.
  const renderedContent = $derived(
    isAutomatic ? undefined : renderMarkdown(entry.content, { breaks: true }),
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
  {#if isEditing}
    <JournalEntryEditForm
      content={entry.content}
      {snippet}
      onSave={saveEdit}
      onCancel={cancelEdit}
    />
  {:else if renderedContent !== undefined}
    <div
      class="prose prose-sm max-w-none text-theme-text prose-p:my-1 prose-p:text-theme-text prose-strong:text-theme-text prose-em:text-theme-text prose-ul:my-1 prose-li:my-0 prose-li:text-theme-text prose-li:marker:text-theme-muted"
      data-testid="journal-entry-content"
    >
      {@html renderedContent}
    </div>
  {:else}
    <p class="text-theme-text">{entry.content}</p>
  {/if}
  {#if rollParts}
    <DiceBreakdownDisclosure
      parts={rollParts}
      total={rollTotal}
      formula={rollFormula}
    />
  {/if}
  <JournalEntryActions
    {entry}
    {snippet}
    {isEditing}
    {selectable}
    {selected}
    {onToggleSelect}
    {canEdit}
    onStartEdit={startEdit}
    {onDelete}
    {onMoveUp}
    {onMoveDown}
    {canMoveUp}
    {canMoveDown}
    {onPromote}
  />
</div>
