<script lang="ts">
  import type { StatSheetTemplate } from "schema";
  import type { useVisualLayout } from "./use-visual-layout.svelte";
  import type { VisualCard, VisualCell } from "./visual-card-parser";
  import { getUnusedFields } from "./visual-card-parser";
  import type { VisualFieldOptions } from "./editor-source";

  let {
    schema,
    visualLayout,
    card,
    rowFields,
    rIdx,
    fieldOptions,
  }: {
    schema: StatSheetTemplate;
    visualLayout: ReturnType<typeof useVisualLayout>;
    card: VisualCard;
    rowFields: VisualCell[];
    rIdx: number;
    fieldOptions: VisualFieldOptions;
  } = $props();
  const unusedFields = $derived(
    getUnusedFields(visualLayout.visualCards, schema.fields),
  );
  const hasTableCapacity = $derived(
    card.mode !== "table" || rowFields.length < card.columns,
  );
</script>

<div class="flex items-center gap-1.5">
  <span class="text-nano font-bold uppercase tracking-wider text-theme-muted"
    >Row {rIdx + 1}</span
  >
  <div
    role="list"
    tabindex="-1"
    class="flex flex-1 flex-wrap items-center gap-1.5 min-h-[36px] rounded border border-dashed border-theme-border/60 bg-theme-bg/40 p-1.5 transition-colors"
    ondragover={(e) => e.preventDefault()}
    ondrop={(e) => visualLayout.handleFieldDropRow(e, card.id, rIdx)}
  >
    {#each rowFields as cell, cIdx (`${cell.kind}-${cIdx}`)}
      {#if cell.kind === "field"}
        {@render fieldChip(cell.fieldId)}
      {:else}
        <div
          class="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5"
        >
          <input
            type="text"
            class="w-24 bg-transparent text-xs text-theme-text outline-none placeholder:text-theme-muted"
            value={cell.value}
            aria-label={`Value for table row ${rIdx + 1}`}
            placeholder="Table value"
            oninput={(event) =>
              visualLayout.updateValueInTableRow(
                card.id,
                rIdx,
                cIdx,
                (event.target as HTMLInputElement).value,
              )}
          />
          <button
            type="button"
            class="text-micro text-theme-muted hover:text-red-400"
            onclick={() =>
              visualLayout.removeValueFromTableRow(card.id, rIdx, cIdx)}
            aria-label={`Remove value from table row ${rIdx + 1}`}
          >
            ✕
          </button>
        </div>
      {/if}
    {/each}
    {#if hasTableCapacity && unusedFields.length > 0}
      <select
        class="rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-muted hover:text-theme-text"
        value=""
        onchange={(e) => {
          const val = (e.target as HTMLSelectElement).value;
          if (val) visualLayout.addFieldToCardRow(card.id, rIdx, val);
          (e.target as HTMLSelectElement).value = "";
        }}
      >
        <option value="" disabled selected>+ Add Field...</option>
        {#each unusedFields as uf (uf.id)}
          <option value={uf.id}>{uf.label}</option>
        {/each}
      </select>
    {/if}
    {#if card.mode === "table" && hasTableCapacity}
      <button
        type="button"
        class="rounded border border-dashed border-amber-500/40 px-1.5 py-0.5 text-xs text-amber-700 hover:border-amber-500 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
        onclick={() => visualLayout.addValueToTableRow(card.id, rIdx)}
        data-testid="presentation-editor-add-table-value"
      >
        + Add Value
      </button>
    {/if}
  </div>
  {#if card.rows.length > 1}
    <button
      type="button"
      class="rounded px-1.5 py-1 text-micro text-theme-muted hover:text-red-400"
      onclick={() => visualLayout.removeRowFromCard(card.id, rIdx)}
      title="Delete Row"
    >
      ✕
    </button>
  {/if}
</div>

{#snippet fieldChip(fid: string)}
  {@const f = schema?.fields?.find((x) => x.id === fid)}
  {@const override = fieldOptions.overrides[fid]}
  <div
    class="inline-flex items-center gap-1 rounded {f
      ? 'bg-theme-primary/10 border border-theme-primary/20 text-theme-text hover:border-theme-primary'
      : 'bg-amber-500/10 border border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 hover:border-amber-500'} px-2 py-0.5 text-xs font-medium transition-colors select-none"
  >
    <button
      type="button"
      draggable="true"
      ondragstart={(e) =>
        visualLayout.handleFieldDragStart(e, card.id, rIdx, fid)}
      oncontextmenu={(e) => fieldOptions.onContextMenu(e, card.id, rIdx, fid)}
      onkeydown={(e) => fieldOptions.onKeyDown(e, card.id, rIdx, fid)}
      class="inline-flex items-center gap-1 cursor-grab active:cursor-grabbing"
      aria-label={`${f?.label ?? fid} field options`}
      title={f
        ? "Right-click for display options"
        : "Field no longer exists in schema"}
    >
      <span
        class="icon-[lucide--grip-vertical] h-3 w-3 text-theme-muted"
        aria-hidden="true"
      ></span>
      {#if !f}
        <span
          class="icon-[lucide--alert-triangle] h-3 w-3 text-amber-500 shrink-0"
          aria-hidden="true"
        ></span>
        <span class="italic">{fid} (missing)</span>
      {:else}
        {f.label}
      {/if}
      {#if override?.displayMode && override.displayMode !== "plain"}
        <span
          class="rounded bg-theme-primary/20 px-1 py-0.2 text-nano font-mono text-theme-primary font-bold"
        >
          {override.displayMode}
        </span>
      {/if}
      {#if override?.hideLabel}
        <span
          class="rounded bg-theme-muted/20 px-1 py-0.2 text-nano font-mono text-theme-muted"
          title="Label hidden"
        >
          no-lbl
        </span>
      {/if}
    </button>
    <button
      type="button"
      class="ml-0.5 text-micro text-theme-muted hover:text-red-400"
      onclick={() => visualLayout.removeFieldFromCardRow(card.id, rIdx, fid)}
      title="Remove field"
    >
      ✕
    </button>
  </div>
{/snippet}
