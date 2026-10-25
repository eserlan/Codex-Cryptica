<script lang="ts">
  import type { StatSheetTemplate } from "schema";
  import type { useVisualLayout } from "./use-visual-layout.svelte";
  import type { VisualCard } from "./visual-card-parser";
  import type { VisualFieldOptions } from "./editor-source";
  import PresentationVisualRow from "./PresentationVisualRow.svelte";

  let {
    schema,
    visualLayout,
    card,
    idx,
    fieldOptions,
    onTitleChange,
  }: {
    schema: StatSheetTemplate;
    visualLayout: ReturnType<typeof useVisualLayout>;
    card: VisualCard;
    idx: number;
    fieldOptions: VisualFieldOptions;
    onTitleChange: (card: VisualCard, title: string) => void;
  } = $props();
</script>

<div
  role="button"
  tabindex="0"
  draggable="true"
  ondragstart={() => visualLayout.handleCardDragStart(idx)}
  ondragover={(e) => visualLayout.handleCardDragOver(e, idx)}
  ondragend={visualLayout.handleCardDragEnd}
  class="flex flex-col gap-2 rounded border border-theme-border bg-theme-surface p-2.5 shadow-sm transition-shadow cursor-grab active:cursor-grabbing hover:border-theme-primary/50"
>
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-1.5 min-w-0">
      <span
        class="icon-[lucide--grip-vertical] h-3.5 w-3.5 text-theme-muted"
        aria-hidden="true"
      ></span>
      <span
        class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-nano font-bold uppercase tracking-wider {card.mode ===
        'table'
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
          : 'bg-theme-primary/15 text-theme-primary border border-theme-primary/30'}"
      >
        <span
          class="{card.mode === 'table'
            ? 'icon-[lucide--table]'
            : 'icon-[lucide--layout-grid]'} h-3 w-3"
          aria-hidden="true"
        ></span>
        {card.mode === "table" ? "Table" : "Card"}
      </span>
      <input
        type="text"
        class="rounded border border-theme-border bg-theme-bg px-2 py-0.5 text-xs font-bold text-theme-text"
        value={card.title}
        placeholder={card.mode === "table"
          ? "Table Title (optional)"
          : "Section Title (optional)"}
        aria-label={card.mode === "table" ? "Table Title" : "Section Title"}
        oninput={(e) => {
          onTitleChange(card, (e.target as HTMLInputElement).value);
        }}
      />
    </div>
    <div class="flex items-center gap-1">
      <label class="flex items-center gap-1 text-micro text-theme-muted">
        Cols:
        <input
          type="number"
          min="1"
          max="6"
          step="1"
          inputmode="numeric"
          aria-label={`Columns for ${card.title || (card.mode === "table" ? "table" : "card")}`}
          class="w-12 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
          value={card.columns}
          oninput={(event) => {
            visualLayout.updateCardColumns(
              card.id,
              Number((event.target as HTMLInputElement).value),
            );
          }}
        />
      </label>
      <button
        type="button"
        class="rounded px-1 text-xs text-theme-muted hover:text-theme-text"
        disabled={idx === 0}
        onclick={() => visualLayout.moveCard(idx, -1)}
        title="Move Up"
      >
        ▲
      </button>
      <button
        type="button"
        class="rounded px-1 text-xs text-theme-muted hover:text-theme-text"
        disabled={idx === visualLayout.visualCards.length - 1}
        onclick={() => visualLayout.moveCard(idx, 1)}
        title="Move Down"
      >
        ▼
      </button>
      <button
        type="button"
        class="rounded px-1 text-xs text-red-400 hover:text-red-300"
        onclick={() => visualLayout.removeVisualCard(card.id)}
        title="Remove Card"
      >
        ✕
      </button>
    </div>
  </div>

  {#if card.mode === "table"}
    <div
      class="flex flex-wrap items-center gap-1.5 rounded border border-amber-500/25 bg-amber-500/5 p-1.5"
    >
      <span
        class="text-nano font-bold uppercase tracking-wider text-theme-muted"
      >
        Headers
      </span>
      {#each card.tableHeaders ?? [] as header, headerIndex (`${card.id}-header-${headerIndex}`)}
        <input
          type="text"
          class="min-w-20 flex-1 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
          value={header}
          aria-label={`Header ${headerIndex + 1} for ${card.title || "table"}`}
          placeholder={`Column ${headerIndex + 1}`}
          oninput={(event) =>
            visualLayout.updateTableHeader(
              card.id,
              headerIndex,
              (event.target as HTMLInputElement).value,
            )}
        />
      {/each}
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    {#each card.rows as rowFields, rIdx (rIdx)}
      <PresentationVisualRow
        {schema}
        {visualLayout}
        {card}
        {rowFields}
        {rIdx}
        {fieldOptions}
      />
    {/each}
    <button
      type="button"
      class="self-start rounded border border-theme-border/60 px-2 py-0.5 text-micro font-bold text-theme-muted hover:border-theme-primary hover:text-theme-primary"
      onclick={() => visualLayout.addRowToCard(card.id)}
    >
      + Add Row to {card.mode === "table" ? "Table" : "Card"}
    </button>
  </div>
</div>
