<script lang="ts">
  /* eslint-disable svelte/no-useless-mustaches -- Class expressions retain the inline contrast-review notes for inherited styles. */
  import { SourceWorkspaceSession } from "./source-workspace-session.svelte";
  import { SourceWorkspacePrompts } from "./source-workspace-prompts.svelte";
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

  import type { ExportFormat, RandomSource } from "random-source-engine";
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

  let importing = $state(false);
  let exporting = $state(false);
  // Held here rather than inside ExportDialog so it survives switching to
  // Import and back — the two share one panel, and the format choice is the
  // one bit of export state worth keeping.
  let exportFormat = $state<ExportFormat>("codex");
  let generatingTable = $state(false);
  const session = new SourceWorkspaceSession(randomSources, () => idGenerator);
  const prompts = new SourceWorkspacePrompts(
    session,
    () => noun,
    confirmDelete,
  );

  function duplicate(source: RandomSource) {
    prompts.closeContextMenu();
    adoptSource(session.copy(source));
  }

  onMount(() => {
    // A close or a navigation within the debounce window must not lose the
    // last edit.
    const flush = () => session.flushPendingSave();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      session.flushPendingSave();
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
    session.select(source);
    importing = false;
    exporting = false;
    generatingTable = false;
    // Picking something is the end of browsing, so the list gets out of the
    // way and hands the screen to what was picked. Desktop ignores this.
    listOpen = false;
  }

  // All newly authored sources enter the same selection/build/write sequence.
  function adoptSource(source: RandomSource) {
    select(source);
    openBuild();
    session.saveNew(source);
  }

  function create() {
    adoptSource(session.create(kind));
  }

  function completeImport(source: RandomSource) {
    importing = false;
    adoptSource(source);
  }

  function handleCreateGeneratedTable(
    candidates: CandidateTableEntry[],
    tableTitle?: string,
    tableDescription?: string,
  ) {
    generatingTable = false;
    adoptSource(
      session.createGenerated(kind, candidates, tableTitle, tableDescription),
    );
  }

  function confirmDelete(source: RandomSource) {
    if (session.confirmDelete(source)) listOpen = true;
  }
</script>

<svelte:window onkeydown={prompts.handleWindowKeydown} />

<div class="flex h-full min-h-0 flex-col bg-theme-bg font-body">
  <SourceWorkspaceHeader
    {kind}
    {heading}
    {mode}
    saving={session.saving}
    onMode={setMode}
  />

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
      {session.draft ? session.draft.name : `All ${noun}s`}
      <span
        class={// ui-check-ignore: Existing SourceWorkspace colours preserved during decomposition; contrast repair is separate work.
        "font-mono text-theme-muted/60"}>({all.length})</span
      >
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
      draft={session.draft}
      selectedId={session.selectedId}
      {listOpen}
      {allowImport}
      onCreate={create}
      onGenerate={openGenerate}
      onImport={openImport}
      onExport={openExport}
      onSelect={select}
      onContextMenu={prompts.showContextMenu}
    />

    <SourceWorkspaceContent
      {noun}
      draft={session.draft}
      {mode}
      {importing}
      {exporting}
      bind:exportFormat
      deleteImpact={session.deleteImpact}
      pendingRename={session.pendingRename}
      diagnostics={session.diagnostics}
      {icon}
      {emptyBody}
      {editor}
      {player}
      {completeImport}
      cancelImport={() => (importing = false)}
      closeExport={() => (exporting = false)}
      openRenameModal={prompts.openRenameModal}
      {duplicate}
      openDeleteModal={prompts.openDeleteModal}
      {setMode}
      {confirmDelete}
      cancelDelete={() => (session.deleteImpact = undefined)}
      commitRename={session.commitRename}
      cancelRename={() => (session.pendingRename = undefined)}
      onChange={session.onChange}
      requestRename={session.requestRename}
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

  {#if prompts.contextMenu}
    <SourceWorkspaceContextMenu
      contextMenu={prompts.contextMenu}
      onClose={prompts.closeContextMenu}
      onSelect={select}
      onRename={prompts.openRenameModal}
      onDuplicate={duplicate}
      onExport={(source) => {
        select(source);
        exporting = true;
      }}
      onDelete={prompts.openDeleteModal}
    />
  {/if}

  {#if prompts.deleteModalTarget}
    <SourceWorkspaceDeleteModal
      {noun}
      target={prompts.deleteModalTarget}
      impact={prompts.deleteModalImpact}
      onClose={prompts.closeDeleteModal}
      onConfirm={prompts.executeDelete}
    />
  {/if}

  {#if prompts.renameModalTarget}
    <SourceWorkspaceRenameModal
      {noun}
      target={prompts.renameModalTarget}
      bind:draft={prompts.renameModalDraft}
      error={prompts.renameModalError}
      impact={prompts.renameModalImpact}
      onClose={prompts.closeRenameModal}
      onConfirm={prompts.executeRename}
    />
  {/if}
</div>
