<script lang="ts">
  import SourceWorkspaceHeader from "./SourceWorkspaceHeader.svelte";
  import SourceWorkspaceList from "./SourceWorkspaceList.svelte";
  import SourceWorkspaceContent from "./SourceWorkspaceContent.svelte";
  import { onMount, type Snippet } from "svelte";
  import { page } from "$app/state";
  import {
    browserStorage,
    systemIdGenerator,
    type IdGenerator,
    type StorageLike,
  } from "#lib/utils/runtime-deps.js";

  import { browser } from "$app/env";
  import type {
    Diagnostic,
    ExportFormat,
    RandomSource,
  } from "random-source-engine";
  import {
    ensureRandomSourcesLoaded,
    randomSources,
  } from "#lib/features/random/index.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import TableGenerateDialog from "./TableGenerateDialog.svelte";
  import type { CandidateTableEntry } from "generator-engine";
  import {
    MODE_STORAGE_KEY,
    resolveMode,
    type EditorContext,
    type PlayerContext,
    type SourceMode,
  } from "./source-workspace";
  import SourceWorkspaceDeleteModal from "./SourceWorkspaceDeleteModal.svelte";
  import SourceWorkspaceRenameModal from "./SourceWorkspaceRenameModal.svelte";
  import SourceWorkspaceContextMenu from "./SourceWorkspaceContextMenu.svelte";

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
    storage,
    idGenerator = systemIdGenerator,
  }: {
    kind: "table" | "deck";
    heading: string;
    icon: string;
    emptyBody: string;
    allowImport?: boolean;
    editor: Snippet<[EditorContext]>;
    player: Snippet<[PlayerContext]>;
    storage?: StorageLike;
    idGenerator?: IdGenerator;
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
      (storage ?? browserStorage).getItem(MODE_STORAGE_KEY),
    ),
  );

  /**
   * Whether the list and its controls are showing. Only consulted below `md`;
   * the desktop rail is always open.
   */
  let listOpen = $state(true);

  function setMode(next: SourceMode) {
    if (next === mode) return;
    mode = next;
    (storage ?? browserStorage).setItem(MODE_STORAGE_KEY, next);
  }

  /**
   * Authoring is what the author just asked for, so creating or importing
   * overrides the play default rather than leaving them in a view with no way
   * to type anything.
   */
  function openBuild() {
    setMode("build");
  }

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
  // Held here rather than inside ExportDialog so it survives switching to
  // Import and back — the two share one panel, and the format choice is the
  // one bit of export state worth keeping.
  let exportFormat = $state<ExportFormat>("codex");
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

  const CONTEXT_MENU_WIDTH = 176;
  const CONTEXT_MENU_HEIGHT = 272;

  function showContextMenu(source: RandomSource, x: number, y: number) {
    const maxX = browser
      ? Math.max(0, window.innerWidth - CONTEXT_MENU_WIDTH)
      : x;
    const maxY = browser
      ? Math.max(0, window.innerHeight - CONTEXT_MENU_HEIGHT)
      : y;
    contextMenu = {
      x: Math.min(x, maxX),
      y: Math.min(y, maxY),
      source,
    };
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

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    if (deleteModalTarget) {
      closeDeleteModal();
    } else if (renameModalTarget) {
      closeRenameModal();
    }
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
      id: idGenerator.uuid(),
      name: copyName,
      entries: source.entries?.map((e) => ({ ...e, id: idGenerator.uuid() })),
      cards: source.cards?.map((c) => ({ ...c, id: idGenerator.uuid() })),
      spreads: source.spreads?.map((s) => ({ ...s, id: idGenerator.uuid() })),
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

  function openGenerate() {
    generatingTable = true;
    listOpen = false;
  }

  function openImport() {
    importing = true;
    exporting = false;
    listOpen = false;
  }

  function openExport() {
    exporting = true;
    importing = false;
    listOpen = false;
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
      id: c.id || idGenerator.uuid(),
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
    const normalized: RandomSource =
      draft && draft.id === next.id ? { ...next, name: draft.name } : next;
    draft = normalized;
    diagnostics = randomSources.validate(normalized);
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      dirty = false;
      persist(normalized);
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
    const removesSelectedSource = source.id === selectedId;
    if (removesSelectedSource) flushPendingSave();
    enqueue(() => randomSources.remove(source));
    deleteImpact = undefined;
    if (removesSelectedSource) {
      selectedId = undefined;
      draft = undefined;
      // Nothing is open now, so the list comes back rather than leaving a phone
      // showing an empty pane with no way out of it.
      listOpen = true;
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="flex h-full min-h-0 flex-col bg-theme-bg font-body">
  <SourceWorkspaceHeader {kind} {heading} {mode} {saving} onMode={setMode} />

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
      class="min-w-0 truncate font-header text-micro font-bold uppercase tracking-widest text-theme-text"
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
    <SourceWorkspaceList
      {kind}
      {all}
      {draft}
      {selectedId}
      {listOpen}
      {allowImport}
      onCreate={create}
      onGenerate={openGenerate}
      onImport={openImport}
      onExport={openExport}
      onSelect={select}
      onContextMenu={showContextMenu}
    />

    <SourceWorkspaceContent
      {noun}
      {draft}
      {mode}
      {importing}
      {exporting}
      bind:exportFormat
      {deleteImpact}
      {pendingRename}
      {diagnostics}
      {icon}
      {emptyBody}
      {editor}
      {player}
      {completeImport}
      cancelImport={() => (importing = false)}
      closeExport={() => (exporting = false)}
      {openRenameModal}
      {duplicate}
      {openDeleteModal}
      {setMode}
      {confirmDelete}
      cancelDelete={() => (deleteImpact = undefined)}
      {commitRename}
      cancelRename={() => (pendingRename = undefined)}
      {onChange}
      {requestRename}
      {create}
    />
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
    <SourceWorkspaceContextMenu
      {contextMenu}
      onClose={closeContextMenu}
      onSelect={select}
      onRename={openRenameModal}
      onDuplicate={duplicate}
      onExport={(source) => {
        select(source);
        exporting = true;
      }}
      onDelete={openDeleteModal}
    />
  {/if}

  {#if deleteModalTarget}
    <SourceWorkspaceDeleteModal
      {noun}
      target={deleteModalTarget}
      impact={deleteModalImpact}
      onClose={closeDeleteModal}
      onConfirm={executeDelete}
    />
  {/if}

  {#if renameModalTarget}
    <SourceWorkspaceRenameModal
      {noun}
      target={renameModalTarget}
      bind:draft={renameModalDraft}
      error={renameModalError}
      impact={renameModalImpact}
      onClose={closeRenameModal}
      onConfirm={executeRename}
    />
  {/if}
</div>
