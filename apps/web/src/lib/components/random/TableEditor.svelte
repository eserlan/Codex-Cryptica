<script lang="ts">
  import type {
    Diagnostic,
    RandomSource,
    TableEntry,
  } from "random-source-engine";
  import { parseReferences, toRanged, toWeighted } from "random-source-engine";
  import { systemIdGenerator, type IdGenerator } from "$lib/utils/runtime-deps";
  import { computeWindow } from "./virtual-window";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import SourceIdentityFields from "./SourceIdentityFields.svelte";
  import TableRoller from "./TableRoller.svelte";
  import TableGenerateDialog from "./TableGenerateDialog.svelte";
  import type { CandidateTableEntry } from "generator-engine";

  /**
   * Authoring surface for one table (#2247, FR-005).
   *
   * Controlled: every edit hands the parent a new source rather than mutating
   * in place, so persistence, rename, and undo stay the route's business.
   */
  let {
    source,
    diagnostics = [],
    onChange,
    onRename,
    idGenerator = systemIdGenerator,
  }: {
    source: RandomSource;
    diagnostics?: Diagnostic[];
    onChange: (next: RandomSource) => void;
    /** Passed through to the name field; see `SourceIdentityFields`. */
    onRename?: (name: string) => boolean;
    idGenerator?: IdGenerator;
  } = $props();

  const ROW_HEIGHT = 60;

  let scrollTop = $state(0);
  let viewportHeight = $state(600);
  let showGenerateDialog = $state(false);

  const entries = $derived(source.entries ?? []);
  const isRanged = $derived(source.selection?.mode === "ranged");
  const dieSides = $derived(
    source.selection?.mode === "ranged" ? source.selection.die.sides : 100,
  );

  /** Diagnostics that belong to no particular entry, shown above the list. */
  const generalDiagnostics = $derived(diagnostics.filter((d) => !d.entryId));

  const diagnosticsByEntry = $derived.by(() => {
    const map = new Map<string, Diagnostic[]>();
    for (const d of diagnostics) {
      if (!d.entryId) continue;
      map.set(d.entryId, [...(map.get(d.entryId) ?? []), d]);
    }
    return map;
  });

  // Only the visible slice is rendered: a 1,000-entry table is an ordinary
  // import result, and a thousand live inputs would blow the frame budget
  // (SC-004, R7).
  const view = $derived(
    computeWindow({
      itemCount: entries.length,
      rowHeight: ROW_HEIGHT,
      scrollTop,
      viewportHeight,
    }),
  );

  /** The `{names}` an entry pulls in, shown beneath its text. */
  function references(text: string): string[] {
    return parseReferences(text).map((r) => r.name);
  }

  function update(changes: Partial<RandomSource>) {
    onChange({ ...source, ...changes });
  }

  function updateEntries(next: TableEntry[]) {
    update({ entries: next });
  }

  function patchEntry(id: string, changes: Partial<TableEntry>) {
    updateEntries(entries.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  }

  function addEntry() {
    const entry: TableEntry = { id: idGenerator.uuid(), text: "" };
    if (isRanged) {
      const highest = entries.reduce(
        (max, e) => Math.max(max, e.range?.max ?? 0),
        0,
      );
      entry.range = { min: highest + 1, max: highest + 1 };
    } else {
      entry.weight = 1;
    }
    updateEntries([...entries, entry]);
  }

  function handleAcceptGenerated(candidates: CandidateTableEntry[]) {
    let nextEntries = [...entries];
    let currentHighest = isRanged
      ? entries.reduce((max, e) => Math.max(max, e.range?.max ?? 0), 0)
      : 0;

    for (const candidate of candidates) {
      const newEntry: TableEntry = {
        id: candidate.id || idGenerator.uuid(),
        text: candidate.text,
      };
      if (isRanged) {
        currentHighest += 1;
        newEntry.range = { min: currentHighest, max: currentHighest };
      } else {
        newEntry.weight = candidate.weight ?? 1;
      }
      nextEntries.push(newEntry);
    }
    updateEntries(nextEntries);
  }

  function removeEntry(id: string) {
    updateEntries(entries.filter((e) => e.id !== id));
  }

  /** Moves an entry one place. Ranges stay with their entry, so a ranged
   *  table's coverage is unchanged by a reorder. */
  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= entries.length) return;
    const next = [...entries];
    [next[index], next[target]] = [next[target], next[index]];
    updateEntries(next);
  }

  function setMode(mode: "weighted" | "ranged") {
    if (mode === (isRanged ? "ranged" : "weighted")) return;
    onChange(mode === "ranged" ? toRanged(source) : toWeighted(source));
  }

  function setDie(sides: number) {
    if (!Number.isFinite(sides) || sides < 1) return;
    update({ selection: { mode: "ranged", die: { sides } } });
  }
</script>

<div class="flex flex-col gap-4" data-testid="table-editor">
  <!-- Reference syntax is exactly the kind of interaction a first-time author
       cannot guess at, which is what this clause is for (Constitution IX). -->
  <FeatureHint hintId="random-tables-and-decks" />

  <SourceIdentityFields {source} {onChange} {onRename} />

  <div class="flex flex-wrap items-end gap-4">
    <div class="flex flex-col gap-1">
      <span
        class="text-[9px] font-bold font-header uppercase tracking-[0.2em] text-theme-muted"
        >How entries are picked</span
      >
      <div class="flex overflow-hidden rounded border border-theme-border">
        {#each [{ mode: "weighted" as const, help: "Each entry has a weight" }, { mode: "ranged" as const, help: "Each entry covers die numbers" }] as option}
          <button
            type="button"
            title={option.help}
            class="px-3 py-1.5 font-header text-[10px] uppercase tracking-widest transition-colors {(isRanged
              ? 'ranged'
              : 'weighted') === option.mode
              ? 'bg-theme-primary text-theme-bg'
              : 'bg-theme-bg text-theme-muted hover:text-theme-text'}"
            onclick={() => setMode(option.mode)}
            data-testid="mode-{option.mode}"
          >
            {option.mode}
          </button>
        {/each}
      </div>
    </div>

    {#if isRanged}
      <label class="flex flex-col gap-1">
        <span
          class="text-[9px] font-bold font-header uppercase tracking-[0.2em] text-theme-muted"
          >Die</span
        >
        <div class="flex items-center gap-1">
          <span class="font-header text-sm text-theme-muted">d</span>
          <input
            type="number"
            min="1"
            class="w-24 rounded border border-theme-border bg-theme-bg px-2 py-1.5 font-header text-sm text-theme-text focus:border-theme-primary focus:outline-none"
            value={dieSides}
            oninput={(e) => setDie(Number(e.currentTarget.value))}
            data-testid="table-die"
          />
        </div>
      </label>
    {/if}
  </div>

  {#each generalDiagnostics as diagnostic}
    <p
      class="rounded border px-3 py-2 font-body text-xs {diagnostic.severity ===
      'error'
        ? 'border-red-500/40 bg-red-500/10 text-red-500'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'}"
      data-testid="table-diagnostic"
    >
      {diagnostic.message}
    </p>
  {/each}

  <div class="flex items-center justify-between">
    <span
      class="text-[9px] font-bold font-header uppercase tracking-[0.2em] text-theme-muted"
    >
      Entries ({entries.length})
    </span>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary"
        onclick={() => (showGenerateDialog = true)}
        data-testid="table-generate-entries-btn"
      >
        <span
          aria-hidden="true"
          class="icon-[lucide--sparkles] h-3 w-3 text-theme-primary"
        ></span>
        Generate entries
      </button>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary"
        onclick={addEntry}
        data-testid="add-entry"
      >
        <span aria-hidden="true" class="icon-[lucide--plus] h-3 w-3"></span>
        Add entry
      </button>
    </div>
  </div>

  <div
    class="max-h-[26rem] overflow-y-auto rounded border border-theme-border"
    onscroll={(e) => (scrollTop = e.currentTarget.scrollTop)}
    bind:clientHeight={viewportHeight}
    data-testid="entry-list"
  >
    <div style="height: {view.paddingTop}px"></div>
    {#each entries.slice(view.start, view.end) as entry, offset (entry.id)}
      {@const index = view.start + offset}
      {@const problems = diagnosticsByEntry.get(entry.id) ?? []}
      <div
        class="flex items-center gap-2 border-b border-theme-border/40 px-2"
        style="height: {ROW_HEIGHT}px"
      >
        <span
          class="w-8 shrink-0 text-right font-mono text-[10px] text-theme-muted/60"
          >{index + 1}</span
        >

        {#if isRanged}
          <div class="flex shrink-0 items-center gap-1">
            <input
              type="number"
              aria-label="Lowest number for entry {index + 1}"
              class="w-14 rounded border border-theme-border bg-theme-bg px-1.5 py-1 text-center font-mono text-xs text-theme-text focus:border-theme-primary focus:outline-none"
              value={entry.range?.min ?? 1}
              oninput={(e) =>
                patchEntry(entry.id, {
                  range: {
                    min: Number(e.currentTarget.value),
                    max: entry.range?.max ?? Number(e.currentTarget.value),
                  },
                })}
            />
            <span class="text-[10px] text-theme-muted">–</span>
            <input
              type="number"
              aria-label="Highest number for entry {index + 1}"
              class="w-14 rounded border border-theme-border bg-theme-bg px-1.5 py-1 text-center font-mono text-xs text-theme-text focus:border-theme-primary focus:outline-none"
              value={entry.range?.max ?? 1}
              oninput={(e) =>
                patchEntry(entry.id, {
                  range: {
                    min: entry.range?.min ?? Number(e.currentTarget.value),
                    max: Number(e.currentTarget.value),
                  },
                })}
            />
          </div>
        {:else}
          <input
            type="number"
            min="1"
            aria-label="Weight for entry {index + 1}"
            class="w-16 shrink-0 rounded border border-theme-border bg-theme-bg px-1.5 py-1 text-center font-mono text-xs text-theme-text focus:border-theme-primary focus:outline-none"
            value={entry.weight ?? 1}
            oninput={(e) =>
              patchEntry(entry.id, { weight: Number(e.currentTarget.value) })}
          />
        {/if}

        <div class="flex min-w-0 flex-1 flex-col">
          <input
            aria-label="Text for entry {index + 1}"
            class="w-full rounded border border-theme-border bg-theme-bg px-2 py-1 font-body text-sm text-theme-text focus:border-theme-primary focus:outline-none"
            value={entry.text}
            oninput={(e) =>
              patchEntry(entry.id, { text: e.currentTarget.value })}
            data-testid="entry-text"
          />
          {#if problems.length > 0}
            <span
              class="truncate text-[10px] {problems.some(
                (p) => p.severity === 'error',
              )
                ? 'text-red-500'
                : 'text-amber-600 dark:text-amber-400'}"
              data-testid="entry-diagnostic"
            >
              {problems[0].message}
            </span>
          {:else if references(entry.text).length > 0}
            <!-- References are invisible inside a plain input, so the names
                 this entry pulls in are named under it (FR-013). -->
            <span
              class="truncate font-mono text-[10px] text-theme-primary/80"
              data-testid="entry-references"
            >
              pulls in {references(entry.text).join(", ")}
            </span>
          {/if}
        </div>

        <div class="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Move entry {index + 1} up"
            disabled={index === 0}
            onclick={() => move(index, -1)}
            class="rounded p-1 text-theme-muted transition-colors hover:text-theme-primary disabled:opacity-25"
          >
            <span
              aria-hidden="true"
              class="icon-[lucide--chevron-up] h-3.5 w-3.5"
            ></span>
          </button>
          <button
            type="button"
            aria-label="Move entry {index + 1} down"
            disabled={index === entries.length - 1}
            onclick={() => move(index, 1)}
            class="rounded p-1 text-theme-muted transition-colors hover:text-theme-primary disabled:opacity-25"
          >
            <span
              aria-hidden="true"
              class="icon-[lucide--chevron-down] h-3.5 w-3.5"
            ></span>
          </button>
          <button
            type="button"
            aria-label="Delete entry {index + 1}"
            onclick={() => removeEntry(entry.id)}
            class="rounded p-1 text-theme-muted transition-colors hover:text-red-500"
          >
            <span aria-hidden="true" class="icon-[lucide--trash-2] h-3.5 w-3.5"
            ></span>
          </button>
        </div>
      </div>
    {/each}
    <div style="height: {view.paddingBottom}px"></div>
  </div>

  <!-- Rolling belongs beside authoring: a table is checked by rolling it, not
       by reading it (SC-010). -->
  <TableRoller {source} />

  <TableGenerateDialog
    open={showGenerateDialog}
    mode="append"
    existingTableName={source.name}
    selectionMode={isRanged ? "ranged" : "weighted"}
    existingRowCount={entries.length}
    onAccept={handleAcceptGenerated}
    onClose={() => (showGenerateDialog = false)}
  />
</div>

<style>
  @reference "../../../app.css";
</style>
