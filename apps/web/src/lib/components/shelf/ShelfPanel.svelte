<script lang="ts">
  import type { ImportPlan } from "@codex/entity-shelf";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import { shelf as defaultShelf } from "$lib/features/shelf";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import type { ShelfStore } from "$lib/features/shelf/shelf.svelte";
  import ShelfEntryCard from "./ShelfEntryCard.svelte";
  import ImportOutcomeSummary from "./ImportOutcomeSummary.svelte";
  import TemplateConflictStep from "./TemplateConflictStep.svelte";

  let { shelf = defaultShelf }: { shelf?: ShelfStore } = $props();

  let selected = $state<Set<string>>(new Set());
  let plan = $state<ImportPlan | null>(null);

  const conflicts = $derived(
    plan?.templateDecisions.filter((decision) => decision.unresolved) ?? [],
  );
  const canImport = $derived(selected.size > 0 && !shelf.busy);

  // Entries can vanish under us — removed here, or in another tab, since the
  // Shelf is live across tabs. A selection holding a ghost would fail the
  // import on an entry that no longer exists.
  $effect(() => {
    const live = new Set(shelf.entries.map((entry) => entry.id));
    const pruned = new Set([...selected].filter((id) => live.has(id)));
    if (pruned.size !== selected.size) selected = pruned;
  });

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  async function beginImport() {
    // `plan` throws when an entry has gone — removed in another tab between
    // this list rendering and the button being pressed.
    try {
      const built = await shelf.plan([...selected]);
      if (built.templateDecisions.some((decision) => decision.unresolved)) {
        plan = built;
        return;
      }
      await runImport(built);
    } catch (err) {
      shelf.error = err instanceof Error ? err.message : String(err);
    }
  }

  async function runImport(ready: ImportPlan) {
    plan = null;
    if (await shelf.import(ready)) selected = new Set();
  }

  function choose(templateId: string, choice: "keep-existing" | "bring-in") {
    if (!plan) return;
    const next = shelf.choose(plan, templateId, choice);
    plan = next;
    if (!next.templateDecisions.some((decision) => decision.unresolved)) {
      void runImport(next);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<section class="flex flex-col gap-4" data-testid="shelf-panel">
  <header class="space-y-1">
    <div class="flex items-start justify-between gap-2">
      <h2 class="text-sm uppercase tracking-widest text-theme-text-muted">
        The Shelf
      </h2>
      <!--
        On a phone the sidebar fills the screen, so without this the panel is a
        dead end: the activity bar it was opened from is no longer visible.
        Matches the close control the Explorer and Oracle panels already carry.
      -->
      <button
        type="button"
        onclick={() => layoutUIStore.closeSidebar()}
        class="p-1.5 -mt-1 -mr-1 rounded-md transition-all shrink-0"
        style:color="var(--theme-icon-default)"
        aria-label="Close the Shelf"
        data-testid="shelf-close"
      >
        <span aria-hidden="true" class="icon-[lucide--x] w-4 h-4"></span>
      </button>
    </div>
    <p class="text-xs text-theme-text-muted">
      Entities waiting to be brought into a vault. The Shelf lives in this
      browser — it is not a backup, and it cannot send anything to anyone else.
    </p>
  </header>

  <FeatureHint hintId="entity-shelf" />

  {#if shelf.entries.length === 0}
    <div
      class="border border-dashed border-theme-border rounded-lg p-6 text-center"
      data-testid="shelf-empty"
    >
      <p class="text-sm text-theme-text">Nothing on the Shelf yet.</p>
      <p class="text-xs text-theme-text-muted mt-1">
        Open an entity, or select several in the graph or table, and choose
        “Send to Shelf”. Then switch vault and import them here.
      </p>
    </div>
  {:else}
    <!-- Flat list, newest first: the Shelf is something you work through and
         empty, not a library to curate. -->
    <div class="flex flex-col gap-2">
      {#each shelf.entries as entry (entry.id)}
        <ShelfEntryCard
          {entry}
          selected={selected.has(entry.id)}
          onToggle={() => toggle(entry.id)}
          onRemove={() => shelf.removeEntry(entry.id)}
        />
      {/each}
    </div>

    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-[11px] text-theme-text-muted">
        {shelf.entries.length}
        {shelf.entries.length === 1 ? "entry" : "entries"} · {formatSize(
          shelf.totalBytes,
        )}
      </p>

      <div class="flex gap-2">
        <button
          type="button"
          class="px-3 py-1.5 text-xs uppercase tracking-widest border border-theme-border rounded hover:border-theme-danger hover:text-theme-danger transition-colors"
          onclick={() => shelf.clear()}
          disabled={shelf.busy}
        >
          Clear the Shelf
        </button>
        <button
          type="button"
          data-testid="shelf-import"
          class="px-3 py-1.5 text-xs uppercase tracking-widest border border-theme-primary text-theme-primary rounded hover:bg-theme-primary/10 transition-colors disabled:opacity-50"
          onclick={beginImport}
          disabled={!canImport}
        >
          Import into this vault
        </button>
      </div>
    </div>
  {/if}

  {#if shelf.nearingStorageLimit}
    <p
      class="text-xs text-theme-warning border border-theme-warning/40 rounded p-2"
      role="status"
    >
      The Shelf is using most of the space this browser will give it. Clear
      entries you no longer need.
    </p>
  {/if}

  {#if shelf.progress}
    <p class="text-xs text-theme-text-muted" role="status">
      {shelf.progress.label
        ? `${shelf.progress.label} — ${shelf.progress.completed} of ${shelf.progress.total}`
        : "Working…"}
    </p>
  {/if}

  {#if shelf.error}
    <p class="text-xs text-theme-danger" role="alert">{shelf.error}</p>
  {/if}

  {#if conflicts.length > 0}
    <TemplateConflictStep {conflicts} onChoose={choose} />
  {/if}

  {#if shelf.lastOutcome}
    <ImportOutcomeSummary outcome={shelf.lastOutcome} />
  {/if}
</section>
