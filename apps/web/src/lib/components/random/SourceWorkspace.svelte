<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { browser } from "$app/environment";
  import type { Diagnostic, RandomSource } from "random-source-engine";
  import {
    ensureRandomSourcesLoaded,
    randomSources,
  } from "$lib/features/random";
  import { vault } from "$lib/stores/vault.svelte";
  import ImportWizard from "./ImportWizard.svelte";
  import ExportDialog from "./ExportDialog.svelte";
  import TableGenerateDialog from "./TableGenerateDialog.svelte";
  import type { CandidateTableEntry } from "generator-engine";
  import {
    MODE_STORAGE_KEY,
    resolveMode,
    type EditorContext,
    type PlayerContext,
    type SourceMode,
  } from "./source-workspace";
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
    player,
  }: {
    kind: "table" | "deck";
    heading: string;
    icon: string;
    emptyBody: string;
    allowImport?: boolean;
    editor: Snippet<[EditorContext]>;
    player: Snippet<[PlayerContext]>;
  } = $props();

  const noun = $derived(kind === "table" ? "table" : "deck");

  /**
   * Authoring and playing want opposite layouts, so they are two modes of this
   * one shell rather than one screen doing both (issue 2258). The list, the
   * search, the write queue and the prompts are shared; only the right pane
   * swaps.
   *
   * A `?mode=build` link is honoured on arrival, but switching writes to
   * storage rather than back to the URL. Changing the URL in this app costs a
   * webfont request — measured, not assumed — and rolling a table has to work
   * with the machine offline (FR-020, SC-005). Storage gets the half that
   * actually matters: come back later and you are where you left off.
   */
  let mode = $state<SourceMode>(
    resolveMode(
      page.url.searchParams,
      browser ? localStorage.getItem(MODE_STORAGE_KEY) : null,
    ),
  );

  const MODES = [
    { id: "use", label: "Use", icon: "icon-[lucide--dices]" },
    { id: "build", label: "Build", icon: "icon-[lucide--pencil]" },
  ] as const;

  /** Both toggles share one shape so the header reads as one control strip. */
  const toggleClass = (current: boolean) =>
    `flex items-center rounded px-2 py-1 font-header text-[10px] font-bold uppercase tracking-wider transition-colors ${
      current
        ? "bg-theme-primary/15 text-theme-primary"
        : "text-theme-muted hover:text-theme-text"
    }`;

  /**
   * Whether the list and its controls are showing. Only consulted below `md`;
   * the desktop rail is always open.
   */
  let listOpen = $state(true);

  function setMode(next: SourceMode) {
    if (next === mode) return;
    mode = next;
    if (browser) localStorage.setItem(MODE_STORAGE_KEY, next);
  }

  /**
   * Authoring is what the author just asked for, so creating or importing
   * overrides the play default rather than leaving them in a view with no way
   * to type anything.
   */
  function openBuild() {
    setMode("build");
  }

  /**
   * The two kinds share one Activity Bar slot, so switching between them
   * happens here instead. Plain links rather than local state: each kind keeps
   * its own URL, so a deck is still something you can bookmark and link to.
   */
  const KINDS = [
    {
      id: "table",
      label: "Tables",
      href: "/tables",
      icon: "icon-[lucide--list-tree]",
    },
    {
      id: "deck",
      label: "Decks",
      href: "/decks",
      icon: "icon-[lucide--layers]",
    },
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
  let exporting = $state(false);
  let generatingTable = $state(false);
  let pendingRename = $state<
    { name: string; referencedBy: RandomSource[] } | undefined
  >();

  type ContextMenuState = {
    x: number;
    y: number;
    source: RandomSource;
  };
  let contextMenu = $state<ContextMenuState | null>(null);
  let deleteModalTarget = $state<RandomSource | null>(null);
  const deleteModalImpact = $derived(
    deleteModalTarget
      ? randomSources.impactOf(deleteModalTarget).referencedBy
      : [],
  );

  let renameModalTarget = $state<RandomSource | null>(null);
  let renameModalDraft = $state("");
  let renameModalError = $state("");
  const renameModalImpact = $derived.by(() => {
    if (!renameModalTarget) return [];
    return randomSources.impactOf(renameModalTarget).referencedBy;
  });

  function openContextMenu(e: MouseEvent, source: RandomSource) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      source,
    };
  }

  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  let longPressTriggered = false;
  let touchStartX = 0;
  let touchStartY = 0;

  function handleItemTouchStart(e: TouchEvent, source: RandomSource) {
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : 0;
    const clientY = touch ? touch.clientY : 0;
    touchStartX = clientX;
    touchStartY = clientY;
    longPressTriggered = false;
    clearTimeout(longPressTimer);

    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // ignore
        }
      }
      contextMenu = {
        x: clientX,
        y: clientY,
        source,
      };
    }, 450);
  }

  function handleItemTouchMove(e: TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer);
    }
  }

  function handleItemTouchEnd() {
    clearTimeout(longPressTimer);
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function openDeleteModal(source: RandomSource) {
    deleteModalTarget = source;
    closeContextMenu();
  }

  function closeDeleteModal() {
    deleteModalTarget = null;
  }

  function executeDelete() {
    if (!deleteModalTarget) return;
    const target = deleteModalTarget;
    confirmDelete(target);
    closeDeleteModal();
  }

  function openRenameModal(source: RandomSource) {
    renameModalTarget = source;
    renameModalDraft = source.name;
    renameModalError = "";
    closeContextMenu();
  }

  function closeRenameModal() {
    renameModalTarget = null;
    renameModalDraft = "";
    renameModalError = "";
  }

  function executeRename() {
    const trimmed = renameModalDraft.trim();
    if (!renameModalTarget || !trimmed) return;
    if (trimmed === renameModalTarget.name) {
      closeRenameModal();
      return;
    }
    const existing = randomSources.findByName(trimmed);
    if (existing && existing.id !== renameModalTarget.id) {
      renameModalError = `A ${noun} named "${trimmed}" already exists.`;
      return;
    }

    if (draft && draft.id === renameModalTarget.id) {
      commitRename(trimmed);
    } else {
      const target = renameModalTarget;
      enqueue(async () => {
        const stored = randomSources.findById(target.id);
        if (!stored) return;
        await randomSources.rename(stored, trimmed);
      });
    }
    closeRenameModal();
  }

  function duplicate(source: RandomSource) {
    closeContextMenu();
    const copyName = uniqueName(`${source.name} (Copy)`);
    const copy: RandomSource = {
      ...($state.snapshot(source) as RandomSource),
      id: crypto.randomUUID(),
      name: copyName,
      entries: source.entries?.map((e) => ({ ...e, id: crypto.randomUUID() })),
      cards: source.cards?.map((c) => ({ ...c, id: crypto.randomUUID() })),
      spreads: source.spreads?.map((s) => ({ ...s, id: crypto.randomUUID() })),
    };
    select(copy);
    openBuild();
    enqueue(() => randomSources.save(copy));
  }

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
    exporting = false;
    generatingTable = false;
    // Picking something is the end of browsing, so the list gets out of the
    // way and hands the screen to what was picked. Desktop ignores this.
    listOpen = false;
  }

  function create() {
    const created = randomSources.create(kind, uniqueName(`New ${noun}`));
    // Selected before it is written: the editor has to switch on the click, or
    // the first thing typed lands in the source the author just left.
    select(created);
    openBuild();
    enqueue(() => randomSources.save(created));
  }

  /** An imported source lands selected, so the author sees what arrived. */
  function completeImport(source: RandomSource) {
    importing = false;
    select(source);
    openBuild();
    enqueue(() => randomSources.save(source));
  }

  function handleCreateGeneratedTable(
    candidates: CandidateTableEntry[],
    tableTitle?: string,
    tableDescription?: string,
  ) {
    generatingTable = false;
    const name = uniqueName(tableTitle?.trim() || `New ${noun}`);
    const created = randomSources.create("table", name);
    created.description = tableDescription;
    created.entries = candidates.map((c) => ({
      id: c.id || crypto.randomUUID(),
      text: c.text,
      weight: c.weight ?? 1,
    }));
    select(created);
    openBuild();
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

  function confirmDelete(source: RandomSource) {
    clearTimeout(saveTimer);
    dirty = false;
    enqueue(() => randomSources.remove(source));
    deleteImpact = undefined;
    selectedId = undefined;
    draft = undefined;
    // Nothing is open now, so the list comes back rather than leaving a phone
    // showing an empty pane with no way out of it.
    listOpen = true;
  }
</script>

<div class="flex h-full min-h-0 flex-col bg-theme-bg font-body">
  <header
    class="flex shrink-0 items-center justify-between gap-2 border-b border-theme-border bg-theme-surface px-3 py-2"
  >
    <h1 class="sr-only">{heading}</h1>

    <!-- Both toggles on one row: on a phone this bar is pure chrome, and two
         rows of it push the thing you came for below the fold. -->
    <div class="flex min-w-0 items-center gap-1.5">
      <nav
        class="flex shrink-0 items-center gap-0.5 rounded-md border border-theme-border bg-theme-bg p-0.5"
        aria-label="Random source kind"
      >
        {#each KINDS as option}
          {@const current = option.id === kind}
          <a
            href="{base}{option.href}"
            aria-current={current ? "page" : undefined}
            class="{toggleClass(current)} gap-1"
            data-testid="source-kind-{option.id}"
          >
            <span aria-hidden="true" class="{option.icon} h-3.5 w-3.5"></span>
            {option.label}
          </a>
        {/each}
      </nav>

      <nav
        class="flex shrink-0 items-center gap-0.5 rounded-md border border-theme-border bg-theme-bg p-0.5"
        aria-label="Workspace mode"
      >
        {#each MODES as option}
          {@const current = option.id === mode}
          <button
            type="button"
            aria-pressed={current}
            onclick={() => setMode(option.id)}
            class="{toggleClass(current)} gap-1"
            data-testid="source-mode-{option.id}"
          >
            <span aria-hidden="true" class="{option.icon} h-3.5 w-3.5"></span>
            {option.label}
          </button>
        {/each}
      </nav>
    </div>

    {#if saving}
      <span
        class="shrink-0 font-mono text-[9px] uppercase tracking-widest text-theme-muted/60"
        data-testid="workspace-saving">Saving…</span
      >
    {/if}
  </header>

  <!-- The list and its controls are chrome too. On a phone they collapse once
       something is open, so the roll or the draw gets the screen; the rail is
       always there from `md:` up, where there is width to spare. -->
  <button
    type="button"
    onclick={() => (listOpen = !listOpen)}
    aria-expanded={listOpen}
    aria-controls="source-list"
    class="flex shrink-0 items-center justify-between gap-2 border-b border-theme-border bg-theme-surface px-3 py-2 text-left md:hidden"
    data-testid="toggle-source-list"
  >
    <span
      class="min-w-0 truncate font-header text-[10px] font-bold uppercase tracking-widest text-theme-text"
    >
      {draft ? draft.name : `All ${noun}s`}
      <span class="font-mono text-theme-muted/60">({all.length})</span>
    </span>
    <span
      aria-hidden="true"
      class="h-4 w-4 shrink-0 text-theme-muted {listOpen
        ? 'icon-[lucide--chevron-up]'
        : 'icon-[lucide--chevron-down]'}"
    ></span>
  </button>

  <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden md:flex-row">
    <aside
      id="source-list"
      class="w-full shrink-0 flex-col gap-3 border-theme-border p-4 md:flex md:w-72 md:border-r {listOpen
        ? 'flex'
        : 'hidden'}"
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

      {#if kind === "table"}
        <button
          type="button"
          onclick={() => {
            generatingTable = true;
            listOpen = false;
          }}
          class="flex items-center justify-center gap-2 rounded border border-theme-border px-3 py-2 font-header text-[10px] font-bold uppercase tracking-widest text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary"
          data-testid="generate-table-btn"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--sparkles] h-3.5 w-3.5 text-theme-primary"
          ></span>
          Generate with AI
        </button>
      {/if}

      {#if allowImport}
        <button
          type="button"
          onclick={() => {
            importing = true;
            listOpen = false;
          }}
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

      <!-- Beside Import, because they are the same job in two directions.
           Disabled rather than hidden when nothing is open, so it is
           discoverable before it is needed (issue 2263). -->
      <button
        type="button"
        onclick={() => {
          exporting = true;
          listOpen = false;
        }}
        disabled={!draft}
        title={draft ? `Export "${draft.name}"` : `Open a ${noun} to export it`}
        class="flex items-center justify-center gap-2 rounded border border-theme-border px-3 py-2 font-header text-[10px] font-bold uppercase tracking-widest text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-theme-border disabled:hover:text-theme-text"
        data-testid="open-export"
      >
        <span aria-hidden="true" class="icon-[lucide--download] h-3.5 w-3.5"
        ></span>
        Export
      </button>

      <ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {#each visible as source (source.id)}
          {@const isSelected = selectedId === source.id}
          <li
            class="group relative flex items-center justify-between rounded px-2 py-1.5 text-xs transition-colors select-none {isSelected
              ? 'bg-theme-primary/15 text-theme-primary font-medium'
              : 'text-theme-text hover:bg-theme-surface'}"
            oncontextmenu={(e) => openContextMenu(e, source)}
            ontouchstart={(e) => handleItemTouchStart(e, source)}
            ontouchmove={handleItemTouchMove}
            ontouchend={handleItemTouchEnd}
            ontouchcancel={handleItemTouchEnd}
          >
            <button
              type="button"
              onclick={() => {
                if (longPressTriggered) {
                  longPressTriggered = false;
                  return;
                }
                select(source);
              }}
              class="flex flex-1 min-w-0 items-center justify-between text-left focus:outline-none"
              data-testid="{noun}-list-item"
            >
              <span class="truncate pr-1">{source.name}</span>
              <span
                class="ml-1 font-mono text-[9px] text-theme-muted/60 shrink-0"
              >
                {countOf(source)}
              </span>
            </button>

            <button
              type="button"
              onclick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                contextMenu = {
                  x: rect.right,
                  y: rect.bottom,
                  source,
                };
              }}
              class="ml-1 flex h-7 w-7 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded p-1 text-theme-muted opacity-100 sm:opacity-0 transition-opacity hover:bg-theme-bg hover:text-theme-text group-hover:opacity-100 focus:opacity-100 active:scale-95"
              aria-label="Actions for {source.name}"
              data-testid="item-actions-{source.id}"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--more-vertical] h-3.5 w-3.5"
              ></span>
            </button>
          </li>
        {/each}
      </ul>
    </aside>

    <section class="min-h-0 flex-1 overflow-y-auto p-4">
      {#if exporting && draft}
        <ExportDialog source={draft} onClose={() => (exporting = false)} />
      {:else if importing}
        <ImportWizard
          {kind}
          onImport={completeImport}
          onCancel={() => (importing = false)}
        />
      {:else if draft && mode === "use"}
        <div
          class="mb-3 flex items-center justify-between border-b border-theme-border pb-2"
        >
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={() => openRenameModal(draft!)}
              class="flex items-center gap-1 rounded border border-theme-border px-2 py-1 font-header text-[10px] uppercase tracking-wider text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
              title="Rename {noun}"
              data-testid="header-rename-{noun}"
            >
              <span aria-hidden="true" class="icon-[lucide--pencil] h-3 w-3"
              ></span>
              <span>Rename</span>
            </button>
            <button
              type="button"
              onclick={() => duplicate(draft!)}
              class="flex items-center gap-1 rounded border border-theme-border px-2 py-1 font-header text-[10px] uppercase tracking-wider text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
              title="Duplicate {noun}"
              data-testid="header-duplicate-{noun}"
            >
              <span aria-hidden="true" class="icon-[lucide--copy] h-3 w-3"
              ></span>
              <span>Duplicate</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={() => setMode("build")}
              class="flex items-center gap-1.5 rounded bg-theme-primary/10 px-2.5 py-1 font-header text-[10px] font-bold uppercase tracking-wider text-theme-primary transition-colors hover:bg-theme-primary hover:text-theme-bg"
              data-testid="header-edit-{noun}"
            >
              <span
                aria-hidden="true"
                class="icon-[lucide--pencil-ruler] h-3 w-3"
              ></span>
              <span>Edit {noun}</span>
            </button>
            <button
              type="button"
              onclick={() => openDeleteModal(draft!)}
              class="flex items-center gap-1 rounded border border-theme-border px-2 py-1 font-header text-[10px] uppercase tracking-wider text-theme-muted transition-colors hover:border-red-500 hover:text-red-500"
              title="Delete {noun}"
              data-testid="delete-{noun}"
            >
              <span aria-hidden="true" class="icon-[lucide--trash-2] h-3 w-3"
              ></span>
              <span>Delete</span>
            </button>
          </div>
        </div>
        {@render player({ source: draft })}
      {:else if draft}
        <div
          class="mb-3 flex items-center justify-between border-b border-theme-border pb-2"
        >
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={() => openRenameModal(draft!)}
              class="flex items-center gap-1 rounded border border-theme-border px-2 py-1 font-header text-[10px] uppercase tracking-wider text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
              title="Rename {noun}"
              data-testid="header-rename-{noun}"
            >
              <span aria-hidden="true" class="icon-[lucide--pencil] h-3 w-3"
              ></span>
              <span>Rename</span>
            </button>
            <button
              type="button"
              onclick={() => duplicate(draft!)}
              class="flex items-center gap-1 rounded border border-theme-border px-2 py-1 font-header text-[10px] uppercase tracking-wider text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
              title="Duplicate {noun}"
              data-testid="header-duplicate-{noun}"
            >
              <span aria-hidden="true" class="icon-[lucide--copy] h-3 w-3"
              ></span>
              <span>Duplicate</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={() => setMode("use")}
              class="flex items-center gap-1.5 rounded bg-theme-primary/10 px-2.5 py-1 font-header text-[10px] font-bold uppercase tracking-wider text-theme-primary transition-colors hover:bg-theme-primary hover:text-theme-bg"
              data-testid="header-use-{noun}"
            >
              <span aria-hidden="true" class="icon-[lucide--dices] h-3 w-3"
              ></span>
              <span>Use {noun}</span>
            </button>
            <button
              type="button"
              onclick={() => openDeleteModal(draft!)}
              class="flex items-center gap-1.5 rounded border border-theme-border px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-theme-muted transition-colors hover:border-red-500 hover:text-red-500"
              data-testid="delete-{noun}"
            >
              <span aria-hidden="true" class="icon-[lucide--trash-2] h-3 w-3"
              ></span>
              <span>Delete</span>
            </button>
          </div>
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

  {#if kind === "table"}
    <TableGenerateDialog
      open={generatingTable}
      mode="new"
      onAccept={handleCreateGeneratedTable}
      onClose={() => (generatingTable = false)}
    />
  {/if}

  {#if contextMenu}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="fixed inset-0 z-50"
      onclick={closeContextMenu}
      oncontextmenu={(e) => {
        e.preventDefault();
        closeContextMenu();
      }}
    >
      <div
        class="fixed z-50 flex min-w-[170px] max-w-[calc(100vw-32px)] flex-col rounded-xl border border-theme-border bg-theme-surface p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        style="left: {Math.max(
          16,
          Math.min(
            contextMenu.x,
            (typeof window !== 'undefined' ? window.innerWidth : 600) - 190,
          ),
        )}px; top: {Math.max(
          16,
          Math.min(
            contextMenu.y,
            (typeof window !== 'undefined' ? window.innerHeight : 600) - 220,
          ),
        )}px;"
        onclick={(e) => e.stopPropagation()}
        role="menu"
        tabindex="-1"
      >
        <div
          class="px-2.5 py-1 text-[10px] font-header font-bold uppercase tracking-wider text-theme-muted truncate border-b border-theme-border/50 mb-1"
        >
          {contextMenu.source.name}
        </div>
        <button
          type="button"
          onclick={() => {
            select(contextMenu!.source);
            closeContextMenu();
          }}
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
          data-testid="ctx-open"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--folder-open] h-3.5 w-3.5 text-theme-muted"
          ></span>
          <span>Open</span>
        </button>
        <button
          type="button"
          onclick={() => openRenameModal(contextMenu!.source)}
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
          data-testid="ctx-rename"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--pencil] h-3.5 w-3.5 text-theme-muted"
          ></span>
          <span>Rename</span>
        </button>
        <button
          type="button"
          onclick={() => {
            const target = contextMenu!.source;
            duplicate(target);
          }}
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
          data-testid="ctx-duplicate"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--copy] h-3.5 w-3.5 text-theme-muted"
          ></span>
          <span>Duplicate</span>
        </button>
        <button
          type="button"
          onclick={() => {
            const target = contextMenu!.source;
            closeContextMenu();
            draft = $state.snapshot(target) as RandomSource;
            exporting = true;
            listOpen = false;
          }}
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
          data-testid="ctx-export"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--download] h-3.5 w-3.5 text-theme-muted"
          ></span>
          <span>Export</span>
        </button>
        <div class="my-1 border-t border-theme-border/50"></div>
        <button
          type="button"
          onclick={() => openDeleteModal(contextMenu!.source)}
          class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-red-500 transition-colors hover:bg-red-500/10"
          data-testid="ctx-delete"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--trash-2] h-3.5 w-3.5 text-red-500"
          ></span>
          <span>Delete</span>
        </button>
      </div>
    </div>
  {/if}

  {#if deleteModalTarget}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onclick={closeDeleteModal}
      onkeydown={(e) => e.key === "Escape" && closeDeleteModal()}
      tabindex="-1"
    >
      <div
        class="w-full max-w-md rounded-xl border border-theme-border bg-theme-surface p-5 shadow-2xl animate-in zoom-in-95 duration-150"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-labelledby="delete-modal-title"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-500"
          >
            <span
              aria-hidden="true"
              class="icon-[lucide--alert-triangle] h-5 w-5"
            ></span>
          </div>
          <div class="flex-1 min-w-0">
            <h3
              id="delete-modal-title"
              class="font-header text-sm font-bold uppercase tracking-wider text-theme-text"
            >
              Delete {noun}
            </h3>
            <p class="mt-1 font-body text-xs text-theme-muted">
              Are you sure you want to delete <strong
                class="text-theme-text font-semibold"
                >"{deleteModalTarget.name}"</strong
              >?
            </p>

            {#if deleteModalImpact.length > 0}
              <div
                class="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 font-body text-xs text-red-500"
                data-testid="modal-delete-impact"
              >
                <div
                  class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]"
                >
                  <span
                    aria-hidden="true"
                    class="icon-[lucide--alert-circle] h-3.5 w-3.5"
                  ></span>
                  <span>Unresolved references warning</span>
                </div>
                <p class="mt-1">
                  {deleteModalImpact.map((s) => s.name).join(", ")}
                  {deleteModalImpact.length === 1 ? "refers" : "refer"} to "{deleteModalTarget.name}".
                  Deleting it will break these table references.
                </p>
              </div>
            {:else}
              <p class="mt-2 text-[11px] text-theme-muted/80">
                This action cannot be undone and will permanently remove this {noun}
                from your vault.
              </p>
            {/if}
          </div>
        </div>

        <div
          class="mt-5 flex justify-end gap-2.5 border-t border-theme-border/60 pt-3.5"
        >
          <button
            type="button"
            onclick={closeDeleteModal}
            class="rounded-lg border border-theme-border px-3.5 py-1.5 font-header text-xs font-semibold text-theme-muted transition-colors hover:bg-theme-bg hover:text-theme-text"
            data-testid="modal-delete-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={executeDelete}
            class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 font-header text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-red-700 active:scale-95"
            data-testid="modal-delete-confirm"
          >
            <span aria-hidden="true" class="icon-[lucide--trash-2] h-3.5 w-3.5"
            ></span>
            Delete {noun}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if renameModalTarget}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onclick={closeRenameModal}
      onkeydown={(e) => e.key === "Escape" && closeRenameModal()}
      tabindex="-1"
    >
      <div
        class="w-full max-w-md rounded-xl border border-theme-border bg-theme-surface p-5 shadow-2xl animate-in zoom-in-95 duration-150"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-labelledby="rename-modal-title"
      >
        <form
          onsubmit={(e) => {
            e.preventDefault();
            executeRename();
          }}
        >
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-theme-primary/15 text-theme-primary"
            >
              <span aria-hidden="true" class="icon-[lucide--pencil] h-5 w-5"
              ></span>
            </div>
            <div class="flex-1 min-w-0">
              <h3
                id="rename-modal-title"
                class="font-header text-sm font-bold uppercase tracking-wider text-theme-text"
              >
                Rename {noun}
              </h3>
              <p class="mt-0.5 font-body text-xs text-theme-muted">
                Choose a unique name for this {noun}.
              </p>

              <div class="mt-3 flex flex-col gap-1">
                <label
                  for="rename-input"
                  class="font-header text-[9px] font-bold uppercase tracking-wider text-theme-muted"
                >
                  New Name
                </label>
                <input
                  id="rename-input"
                  type="text"
                  bind:value={renameModalDraft}
                  class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-xs font-medium text-theme-text focus:border-theme-primary focus:outline-none"
                  placeholder="Enter {noun} name..."
                  required
                  data-testid="modal-rename-input"
                />
              </div>

              {#if renameModalError}
                <p class="mt-2 text-xs text-red-500 font-body">
                  {renameModalError}
                </p>
              {/if}

              {#if renameModalImpact.length > 0}
                <div
                  class="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 font-body text-xs text-amber-600 dark:text-amber-400"
                  data-testid="modal-rename-impact"
                >
                  <div
                    class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]"
                  >
                    <span
                      aria-hidden="true"
                      class="icon-[lucide--alert-circle] h-3.5 w-3.5"
                    ></span>
                    <span>Reference Notice</span>
                  </div>
                  <p class="mt-1">
                    {renameModalImpact.map((s) => s.name).join(", ")}
                    {renameModalImpact.length === 1 ? "refers" : "refer"} to "{renameModalTarget.name}".
                    Existing references might need updating if renamed.
                  </p>
                </div>
              {/if}
            </div>
          </div>

          <div
            class="mt-5 flex justify-end gap-2.5 border-t border-theme-border/60 pt-3.5"
          >
            <button
              type="button"
              onclick={closeRenameModal}
              class="rounded-lg border border-theme-border px-3.5 py-1.5 font-header text-xs font-semibold text-theme-muted transition-colors hover:bg-theme-bg hover:text-theme-text"
              data-testid="modal-rename-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!renameModalDraft.trim() ||
                renameModalDraft.trim() === renameModalTarget.name}
              class="inline-flex items-center gap-1.5 rounded-lg bg-theme-primary px-4 py-1.5 font-header text-xs font-bold uppercase tracking-wider text-theme-bg shadow-sm transition-all hover:bg-theme-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="modal-rename-confirm"
            >
              <span aria-hidden="true" class="icon-[lucide--check] h-3.5 w-3.5"
              ></span>
              Rename {noun}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  @reference "../../../app.css";
</style>
