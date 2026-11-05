<script lang="ts">
  import type { Snippet } from "svelte";
  import type {
    Diagnostic,
    ExportFormat,
    RandomSource,
  } from "random-source-engine";
  import type {
    EditorContext,
    PlayerContext,
    SourceMode,
  } from "./source-workspace";
  import SourceWorkspaceNotices from "./SourceWorkspaceNotices.svelte";
  import SourceWorkspaceToolbar from "./SourceWorkspaceToolbar.svelte";
  import ImportWizard from "./ImportWizard.svelte";
  import ExportDialog from "./ExportDialog.svelte";
  import EmptyState from "#lib/components/ui/EmptyState.svelte";
  let {
    noun,
    draft,
    mode,
    importing,
    exporting,
    exportFormat = $bindable(),
    deleteImpact,
    pendingRename,
    diagnostics,
    icon,
    emptyBody,
    editor,
    player,
    completeImport,
    cancelImport,
    closeExport,
    openRenameModal,
    duplicate,
    openDeleteModal,
    setMode,
    confirmDelete,
    cancelDelete,
    commitRename,
    cancelRename,
    onChange,
    requestRename,
    create,
  }: {
    noun: "table" | "deck";
    draft?: RandomSource;
    mode: SourceMode;
    importing: boolean;
    exporting: boolean;
    exportFormat: ExportFormat;
    deleteImpact?: RandomSource[];
    pendingRename?: { name: string; referencedBy: RandomSource[] };
    diagnostics: Diagnostic[];
    icon: string;
    emptyBody: string;
    editor: Snippet<[EditorContext]>;
    player: Snippet<[PlayerContext]>;
    completeImport: (source: RandomSource) => void;
    cancelImport: () => void;
    closeExport: () => void;
    openRenameModal: (source: RandomSource) => void;
    duplicate: (source: RandomSource) => void;
    openDeleteModal: (source: RandomSource) => void;
    setMode: (mode: SourceMode) => void;
    confirmDelete: (source: RandomSource) => void;
    cancelDelete: () => void;
    commitRename: (name: string) => void;
    cancelRename: () => void;
    onChange: (source: RandomSource) => void;
    requestRename: (name: string) => boolean;
    create: () => void;
  } = $props();
</script>

<section class="min-h-0 flex-1 overflow-y-auto p-4">
  {#if exporting && draft}
    <ExportDialog
      source={draft}
      bind:format={exportFormat}
      onClose={closeExport}
    />
  {:else if importing}
    <ImportWizard
      kind={noun}
      onImport={completeImport}
      onCancel={cancelImport}
    />
  {:else if draft}
    {#key mode}
      <SourceWorkspaceToolbar
        {noun}
        {mode}
        onRename={() => openRenameModal(draft!)}
        onDuplicate={() => duplicate(draft!)}
        onDelete={() => openDeleteModal(draft!)}
        onMode={setMode}
      />

      {#if mode === "use"}
        {@render player({ source: draft })}
      {:else}
        <SourceWorkspaceNotices
          source={draft}
          {deleteImpact}
          {pendingRename}
          onDelete={confirmDelete}
          onCancelDelete={cancelDelete}
          onRename={commitRename}
          onCancelRename={cancelRename}
        />

        {@render editor({
          source: draft,
          diagnostics,
          onChange,
          onRename: requestRename,
        })}
      {/if}
    {/key}
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
