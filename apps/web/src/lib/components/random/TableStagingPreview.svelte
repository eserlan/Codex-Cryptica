<script lang="ts">
  import type { CandidateTableEntry } from "generator-engine";

  let {
    candidates: initialCandidates,
    selectionMode: _selectionMode = "weighted",
    onAccept,
    onCancel,
  }: {
    candidates: CandidateTableEntry[];
    selectionMode?: "weighted" | "ranged";
    onAccept: (selectedEntries: CandidateTableEntry[]) => void;
    onCancel: () => void;
  } = $props();

  let rows = $state<CandidateTableEntry[]>([]);

  $effect.pre(() => {
    rows = initialCandidates.map((c) => ({ ...c }));
  });

  const selectedCount = $derived(rows.filter((r) => r.selected).length);

  function toggleAll(selected: boolean) {
    rows = rows.map((r) => ({ ...r, selected }));
  }

  function handleAccept() {
    const selected = rows.filter((r) => r.selected && r.text.trim().length > 0);
    if (selected.length === 0) return;
    onAccept(selected);
  }
</script>

<div class="flex flex-col gap-4">
  <div
    class="flex flex-wrap items-center justify-between gap-2 border-b border-theme-border pb-3"
  >
    <div>
      <h3 class="text-sm font-semibold text-theme-text">
        Review Generated Entries
      </h3>
      <p class="text-xs text-theme-muted">
        Select, refine, or edit entries before adding them to your table.
      </p>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => toggleAll(true)}
        data-testid="staging-select-all"
        class="text-xs text-theme-primary hover:underline"
      >
        Select all
      </button>
      <span class="text-xs text-theme-muted">•</span>
      <button
        type="button"
        onclick={() => toggleAll(false)}
        data-testid="staging-deselect-all"
        class="text-xs text-theme-muted hover:underline hover:text-theme-text"
      >
        Deselect all
      </button>
    </div>
  </div>

  <div class="max-h-[380px] overflow-y-auto space-y-2 pr-1">
    {#each rows as row, index (row.id)}
      <div
        class="flex items-start gap-3 rounded-lg border p-2.5 transition-colors {row.selected
          ? 'border-theme-border bg-theme-surface/50'
          : 'border-theme-border/40 bg-theme-bg/30 opacity-60'}"
      >
        <div class="pt-1">
          <input
            type="checkbox"
            bind:checked={row.selected}
            aria-label={`Select entry ${index + 1}`}
            class="h-4 w-4 rounded border-theme-border text-theme-primary focus:ring-theme-accent"
          />
        </div>

        <div class="flex-1 min-w-0 space-y-1.5">
          <textarea
            bind:value={row.text}
            rows={Math.max(1, Math.ceil(row.text.length / 50))}
            class="w-full resize-y rounded border border-theme-border/60 bg-theme-bg px-2.5 py-1.5 text-xs text-theme-text focus:border-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary"
            placeholder="Entry text..."
          ></textarea>

          {#if (row.matchedSubTables && row.matchedSubTables.length > 0) || (row.matchedEntities && row.matchedEntities.length > 0)}
            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
              {#if row.matchedSubTables}
                {#each row.matchedSubTables as subTable}
                  <span
                    class="inline-flex items-center gap-1 rounded bg-theme-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-theme-accent"
                  >
                    <span class="icon-[lucide--dices] h-3 w-3"></span>
                    &#123;{subTable}&#125;
                  </span>
                {/each}
              {/if}
              {#if row.matchedEntities}
                {#each row.matchedEntities as entityName}
                  <span
                    class="inline-flex items-center gap-1 rounded bg-theme-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-theme-primary"
                  >
                    <span class="icon-[lucide--book-open] h-3 w-3"></span>
                    {entityName}
                  </span>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div
    class="flex items-center justify-between border-t border-theme-border pt-3"
  >
    <span class="text-xs text-theme-muted">
      {selectedCount} of {rows.length} entries selected
    </span>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={onCancel}
        data-testid="staging-cancel-btn"
        class="rounded-lg border border-theme-border px-3 py-1.5 text-xs font-medium text-theme-text hover:bg-theme-surface transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleAccept}
        disabled={selectedCount === 0}
        data-testid="staging-accept-btn"
        class="inline-flex items-center gap-1.5 rounded-lg bg-theme-primary px-3.5 py-1.5 text-xs font-medium text-theme-primary-contrast transition-colors hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
        Accept {selectedCount}
        {selectedCount === 1 ? "entry" : "entries"}
      </button>
    </div>
  </div>
</div>
