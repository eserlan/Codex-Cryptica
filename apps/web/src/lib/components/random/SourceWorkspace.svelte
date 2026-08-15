<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { base } from "$app/paths";
  import type { Diagnostic, RandomSource } from "random-source-engine";
  import {
    ensureRandomSourcesLoaded,
    randomSources,
  } from "$lib/features/random";
  import { vault } from "$lib/stores/vault.svelte";
  import ImportWizard from "./ImportWizard.svelte";
  import type { EditorContext } from "./source-workspace";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";

  /**
   * The shell both tables and decks live in (#2247, FR-003, FR-009).
   *
   * Tables and decks are two modes of one content model, so the list, the
   * search, the labels, the write queue, and the rename and delete prompts are
   * one implementation with the editor passed in — the alternative was two
   * routes drifting apart (Constitution DRY rule).
   */
  let {
    kind,
    heading,
    icon,
    emptyBody,
    allowImport = false,
    editor,
  }: {
    kind: "table" | "deck";
    heading: string;
    icon: string;
    emptyBody: string;
    allowImport?: boolean;
    editor: Snippet<[EditorContext]>;
  } = $props();

  const noun = $derived(kind === "table" ? "table" : "deck");

  /**
   * The two kinds share one Activity Bar slot, so switching between them
   * happens here instead. Plain links rather than local state: each kind keeps
   * its own URL, so a deck is still something you can bookmark and link to.
   */
  const KINDS = [
    { id: "table", label: "Tables", icon: "icon-[lucide--list-tree]" },
    { id: "deck", label: "Decks", icon: "icon-[lucide--layers]" },
  ] as const;

  let query = $state("");
  let activeLabels = $state<string[]>([]);
  let selectedId = $state<string | undefined>();
  let draft = $state<RandomSource | undefined>();
  let diagnostics = $state<Diagnostic[]>([]);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  /** An edit is typed but not yet handed to the queue. */
  let dirty = $state(false);
  let inFlight = $state(0);

  // "Saving" covers the debounce too: between the keystroke and the write there
  // is real unsaved work, and saying otherwise would be a lie the user could
  // act on by closing the tab.
  const saving = $derived(dirty || inFlight > 0);
  let deleteImpact = $state<RandomSource[] | undefined>();
  let importing = $state(false);
  let pendingRename = $state<
    { name: string; referencedBy: RandomSource[] } | undefined
  >();

  onMount(() => {
    // A close or a navigation within the debounce window must not lose the
    // last edit.
    const flush = () => flushPendingSave();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flushPendingSave();
    };
  });

  // Keyed on the open vault rather than on mount alone: this view often mounts
  // before the vault has finished opening, and a switch replaces the whole
  // collection.
  $effect(() => {
    void vault.activeVaultId;
    void ensureRandomSourcesLoaded();
  });

  const all = $derived(
    kind === "table" ? randomSources.tables : randomSources.decks,
  );

  const labels = $derived([...new Set(all.flatMap((s) => s.labels))].sort());

  const visible = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    return all
      .filter((s) => !needle || s.name.toLowerCase().includes(needle))
      .filter((s) => activeLabels.every((l) => s.labels.includes(l)))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  function countOf(source: RandomSource): number {
    return (kind === "table" ? source.entries : source.cards)?.length ?? 0;
  }

  function toggleLabel(label: string) {
    activeLabels = activeLabels.includes(label)
      ? activeLabels.filter((l) => l !== label)
      : [...activeLabels, label];
  }

  function select(source: RandomSource) {
    flushPendingSave();
    selectedId = source.id;
    draft = $state.snapshot(source) as RandomSource;
    diagnostics = randomSources.validate(draft);
    deleteImpact = undefined;
    pendingRename = undefined;
    importing = false;
  }

  function create() {
    const created = randomSources.create(kind, uniqueName(`New ${noun}`));
    // Selected before it is written: the editor has to switch on the click, or
    // the first thing typed lands in the source the author just left.
    select(created);
    enqueue(() => randomSources.save(created));
  }

  /** An imported source lands selected, so the author sees what arrived. */
  function completeImport(source: RandomSource) {
    importing = false;
    select(source);
    enqueue(() => randomSources.save(source));
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
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      dirty = false;
      persist(next);
    }, 400);
  }

  function flushPendingSave() {
    clearTimeout(saveTimer);
    if (!dirty) return;
    dirty = false;
    if (draft) persist(draft);
  }

  /**
   * One write at a time, in the order they were asked for.
   *
   * Creating a source and editing it are two writes to the same collection, and
   * a create still in flight while an edit lands would leave the file and the
   * in-memory list disagreeing.
   */
  function enqueue(op: () => Promise<unknown>) {
    inFlight++;
    writes = writes
      .then(op, op)
      .catch((err) => console.error("[RandomSources] Write failed", err))
      .finally(() => inFlight--);
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

  /**
   * A rename is not a rebind: sources point at the old name and keep pointing
   * at it. So the sources that would break are named before it happens (FR-042).
   */
  function requestRename(name: string): boolean {
    // Judged from the draft, not the stored copy: a source created a moment ago
    // may still be in the write queue, and renaming it must not have to wait.
    if (!draft || draft.name === name) return false;

    const impact = randomSources.impactOf(draft);
    if (impact.safe) {
      commitRename(name);
      return true;
    }
    pendingRename = { name, referencedBy: impact.referencedBy };
    return false;
  }

  function commitRename(name: string) {
    if (!draft) return;
    // Pending edits land under the old name first, so the rename moves a file
    // whose contents are already current.
    flushPendingSave();
    const id = draft.id;
    draft = { ...draft, name };
    pendingRename = undefined;

    enqueue(async () => {
      const stored = randomSources.findById(id);
      if (!stored) return;
      const result = await randomSources.rename(stored, name);
      diagnostics = result;
      // A rejected rename must not leave the editor showing a name the vault
      // does not have.
      if (result.some((d) => d.severity === "error") && draft?.id === id) {
        draft = { ...draft, name: stored.name };
      }
    });
  }

  function askToDelete(source: RandomSource) {
    // Naming what would break is the whole point of the prompt (FR-042).
    deleteImpact = randomSources.impactOf(source).referencedBy;
  }

  function confirmDelete(source: RandomSource) {
    clearTimeout(saveTimer);
    dirty = false;
    enqueue(() => randomSources.remove(source));
    deleteImpact = undefined;
    selectedId = undefined;
    draft = undefined;
  }
</script>

<div class="flex h-full min-h-0 flex-col bg-theme-bg font-body">
  <header
    class="flex shrink-0 items-center justify-between gap-3 border-b border-theme-border bg-theme-surface p-4"
  >
    <h1 class="sr-only">{heading}</h1>
    <nav
      class="flex items-center gap-0.5 rounded-md border border-theme-border bg-theme-bg p-0.5"
      aria-label="Random source kind"
    >
      {#each KINDS as option}
        {@const current = option.id === kind}
        <a
          href="{base}/{option.id}s"
          aria-current={current ? "page" : undefined}
          class="flex items-center gap-1.5 rounded px-2.5 py-1.5 font-header text-[10px] font-bold uppercase tracking-widest transition-colors {current
            ? 'bg-theme-primary/15 text-theme-primary'
            : 'text-theme-muted hover:text-theme-text'}"
          data-testid="source-kind-{option.id}"
        >
          <span aria-hidden="true" class="{option.icon} h-3.5 w-3.5"></span>
          {option.label}
        </a>
      {/each}
    </nav>
    {#if saving}
      <span
        class="font-mono text-[9px] uppercase tracking-widest text-theme-muted/60"
        data-testid="workspace-saving">Saving…</span
      >
    {/if}
  </header>

  <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden md:flex-row">
    <aside
      class="flex w-full shrink-0 flex-col gap-3 border-theme-border p-4 md:w-72 md:border-r"
    >
      <input
        class="rounded border border-theme-border bg-theme-surface px-3 py-2 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
        placeholder="Search {noun}s..."
        bind:value={query}
        data-testid="{noun}-search"
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
        onclick={create}
        class="flex items-center justify-center gap-2 rounded border border-theme-primary/30 bg-theme-primary/10 px-3 py-2 font-header text-[10px] font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg"
        data-testid="new-{noun}"
      >
        <span aria-hidden="true" class="icon-[lucide--plus] h-3.5 w-3.5"></span>
        New {noun}
      </button>

      {#if allowImport}
        <button
          type="button"
          onclick={() => (importing = true)}
          class="flex items-center justify-center gap-2 rounded border border-theme-border px-3 py-2 font-header text-[10px] font-bold uppercase tracking-widest text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary"
          data-testid="open-import"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--clipboard-paste] h-3.5 w-3.5"
          ></span>
          Import
        </button>
      {/if}

      <ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {#each visible as source (source.id)}
          <li>
            <button
              type="button"
              onclick={() => select(source)}
              class="w-full rounded px-2 py-1.5 text-left text-xs transition-colors {selectedId ===
              source.id
                ? 'bg-theme-primary/15 text-theme-primary'
                : 'text-theme-text hover:bg-theme-surface'}"
              data-testid="{noun}-list-item"
            >
              {source.name}
              <span class="ml-1 font-mono text-[9px] text-theme-muted/60">
                {countOf(source)}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </aside>

    <section class="min-h-0 flex-1 overflow-y-auto p-4">
      {#if importing}
        <ImportWizard
          {kind}
          onImport={completeImport}
          onCancel={() => (importing = false)}
        />
      {:else if draft}
        <div class="mb-3 flex justify-end">
          <button
            type="button"
            onclick={() => askToDelete(draft!)}
            class="flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-theme-muted transition-colors hover:border-red-500 hover:text-red-500"
            data-testid="delete-{noun}"
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

        {#if pendingRename}
          <div
            class="mb-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400"
            data-testid="rename-impact"
          >
            <p class="mb-2">
              {pendingRename.referencedBy.map((s) => s.name).join(", ")}
              {pendingRename.referencedBy.length === 1 ? "refers" : "refer"} to "{draft.name}"
              by name. Renaming it to "{pendingRename.name}" leaves those
              references pointing at nothing.
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded bg-amber-500 px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-white"
                onclick={() => commitRename(pendingRename!.name)}
                data-testid="confirm-rename"
              >
                Rename anyway
              </button>
              <button
                type="button"
                class="rounded border border-theme-border px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-theme-muted"
                onclick={() => (pendingRename = undefined)}
              >
                Keep the name
              </button>
            </div>
          </div>
        {/if}

        {@render editor({
          source: draft,
          diagnostics,
          onChange,
          onRename: requestRename,
        })}
      {:else}
        <EmptyState
          {icon}
          headline="No {noun} open"
          body={emptyBody}
          cta="New {noun}"
          onCta={create}
          ctaTestId="empty-new-{noun}"
        />
      {/if}
    </section>
  </div>
</div>

<style>
  @reference "../../../app.css";
</style>
