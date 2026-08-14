<script lang="ts">
  import { onMount } from "svelte";
  import type { Diagnostic, RandomSource } from "random-source-engine";
  import {
    ensureRandomSourcesLoaded,
    randomSources,
  } from "$lib/features/random";
  import TableEditor from "$lib/components/random/TableEditor.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";

  /**
   * Authoring home for random tables (#2247, FR-003, FR-009).
   *
   * The route owns persistence: the editor is controlled, so a save, a rename,
   * or a delete is decided here where the whole collection is in view.
   */

  let query = $state("");
  let activeLabels = $state<string[]>([]);
  let selectedId = $state<string | undefined>();
  let draft = $state<RandomSource | undefined>();
  let diagnostics = $state<Diagnostic[]>([]);
  let saving = $state(false);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  let inFlight = 0;
  let deleteImpact = $state<RandomSource[] | undefined>();

  onMount(() => {
    void ensureRandomSourcesLoaded();
    return () => clearTimeout(saveTimer);
  });

  const labels = $derived(
    [...new Set(randomSources.tables.flatMap((t) => t.labels))].sort(),
  );

  const visible = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    return randomSources.tables
      .filter((t) => !needle || t.name.toLowerCase().includes(needle))
      .filter((t) => activeLabels.every((l) => t.labels.includes(l)))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  function toggleLabel(label: string) {
    activeLabels = activeLabels.includes(label)
      ? activeLabels.filter((l) => l !== label)
      : [...activeLabels, label];
  }

  function select(table: RandomSource) {
    flushPendingSave();
    selectedId = table.id;
    draft = $state.snapshot(table) as RandomSource;
    diagnostics = randomSources.validate(draft);
    deleteImpact = undefined;
  }

  function createTable() {
    const created = randomSources.create("table", uniqueName("New table"));
    // Selected before it is written: the editor has to switch on the click, or
    // the first thing typed lands in the table the author just left.
    select(created);
    enqueue(() => randomSources.save(created));
  }

  function uniqueName(base: string): string {
    if (!randomSources.findByName(base)) return base;
    let n = 2;
    while (randomSources.findByName(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  }

  /**
   * Saves on a short delay so typing does not write a file per keystroke.
   * Diagnostics update immediately, because an editor that reports a problem
   * only after a pause reports it too late to help.
   */
  function onChange(next: RandomSource) {
    draft = next;
    diagnostics = randomSources.validate(next);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void persist(next), 400);
  }

  function flushPendingSave() {
    clearTimeout(saveTimer);
    if (draft) persist(draft);
  }

  /**
   * One write at a time, in the order they were asked for.
   *
   * Creating a table and editing it are two writes to the same collection, and
   * a create still in flight while an edit lands would leave the file and the
   * in-memory list disagreeing.
   */
  function enqueue(op: () => Promise<unknown>) {
    inFlight++;
    saving = true;
    writes = writes
      .then(op, op)
      .catch((err) => console.error("[RandomSources] Write failed", err))
      .finally(() => {
        if (--inFlight === 0) saving = false;
      });
  }

  function persist(next: RandomSource) {
    enqueue(async () => {
      const stored = randomSources.findById(next.id);
      // A rename moves the file, so it cannot go through the plain save path.
      diagnostics =
        stored && stored.name !== next.name
          ? await randomSources.rename(
              { ...next, name: stored.name },
              next.name,
            )
          : await randomSources.save(next);
    });
  }

  function askToDelete(table: RandomSource) {
    // Naming what would break is the whole point of the prompt (FR-042).
    deleteImpact = randomSources.referencesTo(table.name);
  }

  function confirmDelete(table: RandomSource) {
    clearTimeout(saveTimer);
    enqueue(() => randomSources.remove(table));
    deleteImpact = undefined;
    selectedId = undefined;
    draft = undefined;
  }
</script>

<svelte:head>
  <title>Codex Cryptica | Random Tables</title>
</svelte:head>

<div class="flex h-full min-h-0 flex-col bg-theme-bg font-body">
  <header
    class="flex shrink-0 items-center justify-between gap-3 border-b border-theme-border bg-theme-surface p-4"
  >
    <div class="flex items-center gap-2">
      <span
        aria-hidden="true"
        class="icon-[lucide--list-tree] h-5 w-5 text-theme-primary"
      ></span>
      <h1
        class="font-header text-sm font-bold uppercase tracking-widest text-theme-text"
      >
        Random Tables
      </h1>
    </div>
    {#if saving}
      <span
        class="font-mono text-[9px] uppercase tracking-widest text-theme-muted/60"
        >Saving…</span
      >
    {/if}
  </header>

  <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden md:flex-row">
    <aside
      class="flex w-full shrink-0 flex-col gap-3 border-theme-border p-4 md:w-72 md:border-r"
    >
      <input
        class="rounded border border-theme-border bg-theme-surface px-3 py-2 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
        placeholder="Search tables..."
        bind:value={query}
        data-testid="table-search"
      />

      {#if labels.length > 0}
        <div class="flex flex-wrap gap-1.5">
          {#each labels as label}
            <button
              type="button"
              onclick={() => toggleLabel(label)}
              class="rounded px-2 py-0.5 font-mono text-[10px] tracking-wider transition-colors {activeLabels.includes(
                label,
              )
                ? 'bg-theme-primary text-theme-bg'
                : 'bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20'}"
            >
              {label}
            </button>
          {/each}
        </div>
      {/if}

      <button
        type="button"
        onclick={createTable}
        class="flex items-center justify-center gap-2 rounded border border-theme-primary/30 bg-theme-primary/10 px-3 py-2 font-header text-[10px] font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg"
        data-testid="new-table"
      >
        <span aria-hidden="true" class="icon-[lucide--plus] h-3.5 w-3.5"></span>
        New table
      </button>

      <ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {#each visible as table (table.id)}
          <li>
            <button
              type="button"
              onclick={() => select(table)}
              class="w-full rounded px-2 py-1.5 text-left text-xs transition-colors {selectedId ===
              table.id
                ? 'bg-theme-primary/15 text-theme-primary'
                : 'text-theme-text hover:bg-theme-surface'}"
              data-testid="table-list-item"
            >
              {table.name}
              <span class="ml-1 font-mono text-[9px] text-theme-muted/60">
                {(table.entries ?? []).length}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </aside>

    <section class="min-h-0 flex-1 overflow-y-auto p-4">
      {#if draft}
        <div class="mb-3 flex justify-end">
          <button
            type="button"
            onclick={() => askToDelete(draft!)}
            class="flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-theme-muted transition-colors hover:border-red-500 hover:text-red-500"
            data-testid="delete-table"
          >
            <span aria-hidden="true" class="icon-[lucide--trash-2] h-3 w-3"
            ></span>
            Delete
          </button>
        </div>

        {#if deleteImpact}
          <div
            class="mb-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-500"
            data-testid="delete-impact"
          >
            {#if deleteImpact.length > 0}
              <p class="mb-2">
                {deleteImpact.map((s) => s.name).join(", ")}
                {deleteImpact.length === 1 ? "refers" : "refer"} to "{draft.name}".
                Deleting it leaves those references unresolved.
              </p>
            {:else}
              <p class="mb-2">Delete "{draft.name}"? This cannot be undone.</p>
            {/if}
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded bg-red-500 px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-white"
                onclick={() => confirmDelete(draft!)}
                data-testid="confirm-delete"
              >
                Delete
              </button>
              <button
                type="button"
                class="rounded border border-theme-border px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-theme-muted"
                onclick={() => (deleteImpact = undefined)}
              >
                Keep it
              </button>
            </div>
          </div>
        {/if}

        <TableEditor source={draft} {diagnostics} {onChange} />
      {:else}
        <EmptyState
          icon="icon-[lucide--list-tree]"
          headline="No table open"
          body="Tables live in your vault as plain files. Make one, add a few entries, and roll it."
          cta="New table"
          onCta={createTable}
          ctaTestId="empty-new-table"
        />
      {/if}
    </section>
  </div>
</div>

<style>
  @reference "../../../app.css";
</style>
