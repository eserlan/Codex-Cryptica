<script lang="ts">
  import type {
    ColumnMapping,
    ImportFormat,
    RandomSource,
    TableEntry,
  } from "random-source-engine";
  import type { RowChoice } from "./import-wizard-logic";
  type Preview = ReturnType<
    (typeof import("random-source-engine"))["parseImport"]
  >;
  type Props = {
    kind: "table" | "deck";
    preview: Preview | undefined;
    choices: Record<number, RowChoice>;
    entries: TableEntry[];
    problemCount: number;
    columnCount: number;
    existing: RandomSource | undefined;
    collision: "replace" | "merge" | "new" | undefined;
    setFormat: (format: ImportFormat) => void;
    setColumn: (role: keyof ColumnMapping, value: number | undefined) => void;
    resolved: (index: number) => boolean;
    choose: (index: number, choice: RowChoice) => void;
    editCardPart: (
      index: number,
      current: string,
      part: "title" | "body",
      value: string,
    ) => void;
    splitCard: (text: string) => { title: string; body: string };
    onCollisionChange: (value: "replace" | "merge" | "new") => void;
  };
  let {
    kind,
    preview,
    choices,
    entries,
    problemCount,
    columnCount,
    existing,
    collision,
    setFormat,
    setColumn,
    resolved,
    choose,
    editCardPart,
    splitCard,
    onCollisionChange,
  }: Props = $props();

  const columnIndexes = $derived(
    Array.from({ length: columnCount }, (_, index) => index),
  );

  function selectFormat(format: ImportFormat) {
    setFormat(format);
  }

  function selectColumn(role: keyof ColumnMapping, value: number | undefined) {
    setColumn(role, value);
  }

  function isCollisionSelected(value: "replace" | "merge" | "new") {
    return collision === value;
  }

  function selectCollision(value: "replace" | "merge" | "new") {
    onCollisionChange(value);
  }
</script>

{#snippet skipRow(index: number, skipped: boolean)}
  <button
    type="button"
    class="shrink-0 rounded p-1 text-theme-muted transition-colors hover:text-red-500"
    onclick={() => choose(index, { skipped: !skipped })}
    aria-label="{skipped ? 'Include' : 'Skip'} row {index + 1}"
  >
    <span
      aria-hidden="true"
      class="{skipped
        ? 'icon-[lucide--undo-2]'
        : 'icon-[lucide--trash-2]'} h-3.5 w-3.5"
    ></span>
  </button>
{/snippet}

<!-- fallow-ignore-next-line complexity -->
{#if preview && kind === "table"}
  <div class="flex flex-wrap items-end gap-4">
    <div class="flex flex-col gap-1">
      <span
        class="font-header text-nano font-bold uppercase tracking-[0.2em] text-theme-muted"
        >Shape</span
      >
      <div class="flex overflow-hidden rounded border border-theme-border">
        {#each [{ id: "lines" as const, label: "One per line" }, { id: "delimited" as const, label: "Columns" }, { id: "markdown-table" as const, label: "Markdown table" }] as option}
          <button
            type="button"
            class="px-2.5 py-1.5 font-header text-micro uppercase tracking-widest transition-colors {preview.format ===
            option.id
              ? 'bg-theme-primary text-theme-bg'
              : 'bg-theme-bg text-theme-muted hover:text-theme-text'}"
            onclick={() => selectFormat(option.id)}
            data-testid="import-format-{option.id}"
          >
            {option.label}
          </button>
        {/each}
      </div>
    </div>

    {#if preview.format !== "lines"}
      <!-- Column mapping, because the guess is only a guess (FR-034). -->
      {#each [{ role: "text" as const, label: "Result text" }, { role: "range" as const, label: "Die numbers" }, { role: "weight" as const, label: "Weight" }] as column}
        <label class="flex flex-col gap-1">
          <span
            class="font-header text-nano font-bold uppercase tracking-[0.2em] text-theme-muted"
            >{column.label}</span
          >
          <select
            class="rounded border border-theme-border bg-theme-bg px-2 py-1.5 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
            value={preview.columns[column.role] ?? ""}
            onchange={(e) =>
              selectColumn(
                column.role,
                e.currentTarget.value === ""
                  ? undefined
                  : Number(e.currentTarget.value),
              )}
            data-testid="import-column-{column.role}"
          >
            {#if column.role !== "text"}
              <option value="">None</option>
            {/if}
            {#each columnIndexes as index}
              <option value={index}>Column {index + 1}</option>
            {/each}
          </select>
        </label>
      {/each}
    {/if}
  </div>
{/if}

{#if preview}
  <div class="flex items-center justify-between">
    <span
      class="font-header text-nano font-bold uppercase tracking-[0.2em] text-theme-muted"
      data-testid="import-summary"
    >
      {entries.length} ready{problemCount > 0
        ? ` · ${problemCount} need a look`
        : ""}
    </span>
  </div>

  <div
    class="max-h-64 overflow-y-auto rounded border border-theme-border"
    data-testid="import-preview"
  >
    {#each preview.rows as row, index}
      {@const choice = choices[index]}
      <div
        class="flex items-center gap-2 border-b border-theme-border/40 px-2 py-1.5 {choice?.skipped
          ? 'opacity-40'
          : ''}"
        data-testid="import-row"
      >
        <span
          class="w-8 shrink-0 text-right font-mono text-micro text-theme-muted/60"
          >{index + 1}</span
        >

        {#if row.problem && !resolved(index)}
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <span
              class="truncate font-mono text-meta text-theme-text/80"
              title={row.raw}>{row.raw}</span
            >
            <span
              class="text-micro text-amber-600 dark:text-amber-400"
              data-testid="import-problem">{row.problem}</span
            >
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              class="rounded border border-theme-border px-2 py-0.5 font-header text-nano uppercase tracking-widest text-theme-text hover:border-theme-primary hover:text-theme-primary"
              onclick={() => choose(index, { text: row.raw.trim() })}
              data-testid="import-accept"
            >
              Keep as text
            </button>
            <button
              type="button"
              class="rounded border border-theme-border px-2 py-0.5 font-header text-nano uppercase tracking-widest text-theme-muted hover:border-red-500 hover:text-red-500"
              onclick={() => choose(index, { skipped: true })}
              data-testid="import-skip"
            >
              Skip
            </button>
          </div>
        {:else if kind === "deck"}
          {@const text = choice?.text ?? row.entry?.text ?? row.raw}
          {@const card = splitCard(text)}
          <input
            class="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-header text-xs font-bold text-theme-text focus:border-theme-primary focus:bg-theme-bg focus:outline-none"
            value={card.title}
            oninput={(e) =>
              editCardPart(index, text, "title", e.currentTarget.value)}
            aria-label="Card name for row {index + 1}"
            data-testid="import-row-title"
          />
          <input
            class="min-w-0 flex-[2] rounded border border-transparent bg-transparent px-1 py-0.5 font-body text-xs text-theme-muted focus:border-theme-primary focus:bg-theme-bg focus:text-theme-text focus:outline-none"
            value={card.body}
            placeholder="What it means"
            oninput={(e) =>
              editCardPart(index, text, "body", e.currentTarget.value)}
            aria-label="Card meaning for row {index + 1}"
            data-testid="import-row-body"
          />
          {@render skipRow(index, choice?.skipped ?? false)}
        {:else}
          <input
            class="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-body text-xs text-theme-text focus:border-theme-primary focus:bg-theme-bg focus:outline-none"
            value={choice?.text ?? row.entry?.text ?? row.raw}
            oninput={(e) => choose(index, { text: e.currentTarget.value })}
            aria-label="Result text for row {index + 1}"
            data-testid="import-row-text"
          />
          {#if row.entry?.range}
            <span class="shrink-0 font-mono text-micro text-theme-muted"
              >{row.entry.range.min}–{row.entry.range.max}</span
            >
          {:else if row.entry?.weight !== undefined && row.entry.weight !== 1}
            <span class="shrink-0 font-mono text-micro text-theme-muted"
              >×{row.entry.weight}</span
            >
          {/if}
          {@render skipRow(index, choice?.skipped ?? false)}
        {/if}
      </div>
    {/each}
  </div>

  {#if existing}
    <!-- A name collision is a decision only the author can make (FR-037). -->
    <div
      class="flex flex-col gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-3"
      data-testid="import-collision"
    >
      <p class="text-xs text-amber-600 dark:text-amber-400">
        "{existing.name}" already exists. What should happen to it?
      </p>
      <div class="flex flex-wrap gap-2">
        {#each kind === "deck" ? [{ id: "merge" as const, label: "Add these cards to it" }, { id: "replace" as const, label: "Replace its cards" }, { id: "new" as const, label: "Save as a new deck" }] : [{ id: "merge" as const, label: "Add to it" }, { id: "replace" as const, label: "Replace its entries" }, { id: "new" as const, label: "Save as a new table" }] as option}
          <button
            type="button"
            class="rounded border px-2.5 py-1 font-header text-micro uppercase tracking-widest transition-colors {isCollisionSelected(
              option.id,
            )
              ? 'border-theme-primary bg-theme-primary text-theme-bg'
              : 'border-theme-border text-theme-text hover:border-theme-primary'}"
            onclick={() => selectCollision(option.id)}
            data-testid="import-collision-{option.id}"
          >
            {option.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}
{/if}
