<script lang="ts">
  import type {
    AdventureArchiveEntry,
    AdventureSessionRepository,
  } from "#lib/services/adventure/adventure-session-repository.js";
  import AdventureTranscript from "./AdventureTranscript.svelte";
  import AdventureArchiveEntryRow from "./AdventureArchiveEntryRow.svelte";
  import AdventureArchiveEmptyState from "./AdventureArchiveEmptyState.svelte";
  import {
    createPlayerTranscript,
    type AdventureSession,
  } from "@codex/adventure-engine";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

  type Confirm = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
  }) => Promise<boolean>;

  let {
    repository,
    vaultId,
    onResume,
    onResumeArchived,
    confirm = (options) => notificationStore.confirm(options),
  }: {
    repository: AdventureSessionRepository;
    vaultId: string;
    onResume?: (sessionId: string) => Promise<void>;
    onResumeArchived?: (sessionId: string) => Promise<void>;
    confirm?: Confirm;
  } = $props();
  let entries = $state<AdventureArchiveEntry[]>([]);
  let selected = $state<string | null>(null);
  let selectedSession = $state<AdventureSession | null>(null);
  let deletingId = $state<string | null>(null);
  let deleteError = $state<string | null>(null);
  let searchQuery = $state("");
  let renamingId = $state<string | null>(null);
  let renameDraft = $state("");
  let renameError = $state<string | null>(null);
  let duplicatingId = $state<string | null>(null);
  let duplicateError = $state<string | null>(null);
  let resumingId = $state<string | null>(null);
  let resumeError = $state<string | null>(null);
  let refreshRequest = 0;

  const filteredEntries = $derived.by(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        (entry.premise?.toLowerCase().includes(query) ?? false),
    );
  });

  async function refresh(requestedVaultId = vaultId) {
    const request = ++refreshRequest;
    const result = await repository.list(requestedVaultId);
    if (request !== refreshRequest || requestedVaultId !== vaultId) return;
    entries = result.entries;
  }
  async function open(id: string) {
    selected = id;
    const loaded = await repository.load(vaultId, id);
    selectedSession = loaded.condition === "unreadable" ? null : loaded.session;
  }
  async function deleteAdventure(entry: AdventureArchiveEntry) {
    const unreadable = entry.loadCondition === "unreadable";
    if (
      !unreadable &&
      (entry.status !== "archived" || entry.revision === undefined)
    )
      return;
    const confirmed = await confirm({
      title: unreadable
        ? "Delete unreadable adventure?"
        : "Delete archived adventure?",
      message: unreadable
        ? "Delete this unreadable adventure permanently? Its transcript cannot be recovered."
        : `Delete “${entry.title}” permanently? This cannot be undone.`,
      confirmLabel: unreadable
        ? "Delete unreadable adventure"
        : "Delete adventure",
      cancelLabel: unreadable ? "Keep unreadable adventure" : "Keep adventure",
      isDangerous: true,
    });
    if (!confirmed) return;
    deletingId = entry.id;
    deleteError = null;
    const result = unreadable
      ? await repository.deleteUnreadable(vaultId, entry.id)
      : await repository.deleteArchived(vaultId, entry.id, entry.revision!);
    deletingId = null;
    if (!result.ok) {
      deleteError = result.error.message;
      return;
    }
    if (selected === entry.id) {
      selected = null;
      selectedSession = null;
    }
    await refresh();
  }

  function describeArchiveError(message: string): string {
    switch (message) {
      case "revision-conflict":
        return "This adventure changed somewhere else just now. Refresh and try again.";
      case "title-required":
        return "Title cannot be empty.";
      case "unreadable-session-preserved":
        return "This adventure couldn't be read, so nothing was changed.";
      default:
        return "Something went wrong. Please try again.";
    }
  }

  function startRename(entry: AdventureArchiveEntry) {
    renamingId = entry.id;
    renameDraft = entry.title;
    renameError = null;
  }

  function cancelRename() {
    renamingId = null;
    renameDraft = "";
    renameError = null;
  }

  async function confirmRename(entry: AdventureArchiveEntry) {
    if (entry.revision === undefined) return;
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      renameError = "Title cannot be empty.";
      return;
    }
    const result = await repository.rename(
      vaultId,
      entry.id,
      entry.revision,
      trimmed,
    );
    if (!result.ok) {
      renameError = describeArchiveError(result.error.message);
      return;
    }
    renamingId = null;
    renameDraft = "";
    renameError = null;
    await refresh();
  }

  async function duplicateAdventure(entry: AdventureArchiveEntry) {
    duplicatingId = entry.id;
    duplicateError = null;
    const result = await repository.duplicate(vaultId, entry.id);
    duplicatingId = null;
    if (result.condition === "unreadable") {
      duplicateError = describeArchiveError(result.error.message);
      return;
    }
    await refresh();
  }

  async function resumeArchivedAdventure(entry: AdventureArchiveEntry) {
    if (!onResumeArchived) return;
    resumingId = entry.id;
    resumeError = null;
    try {
      await onResumeArchived(entry.id);
    } catch (cause) {
      resumeError =
        cause instanceof Error
          ? cause.message
          : "Unable to resume this adventure.";
    } finally {
      resumingId = null;
    }
  }

  $effect(() => {
    const requestedVaultId = vaultId;
    selected = null;
    selectedSession = null;
    deleteError = null;
    searchQuery = "";
    renamingId = null;
    renameDraft = "";
    renameError = null;
    duplicateError = null;
    resumeError = null;
    void refresh(requestedVaultId);
  });
</script>

<section class="space-y-3" aria-labelledby="adventure-archive-heading">
  <h2
    id="adventure-archive-heading"
    class="text-lg font-semibold text-theme-text"
  >
    Adventure archive
  </h2>
  {#if entries.length > 0}
    <input
      type="search"
      bind:value={searchQuery}
      placeholder="Search by title or premise…"
      aria-label="Search adventure archive"
      class="min-h-12 w-full rounded-md border border-theme-border bg-theme-surface px-3 text-sm text-theme-text"
    />
  {/if}
  <AdventureArchiveEmptyState
    hasEntries={entries.length > 0}
    hasResults={filteredEntries.length > 0}
    query={searchQuery}
  />
  {#if filteredEntries.length > 0}
    <ul class="space-y-2">
      {#each filteredEntries as entry (entry.id)}
        <AdventureArchiveEntryRow
          {entry}
          renaming={renamingId === entry.id}
          bind:renameDraft
          renameError={renamingId === entry.id ? renameError : null}
          duplicating={duplicatingId === entry.id}
          deleting={deletingId === entry.id}
          resuming={resumingId === entry.id}
          onSave={() => void confirmRename(entry)}
          onCancelRename={cancelRename}
          onStartRename={() => startRename(entry)}
          onDuplicate={() => void duplicateAdventure(entry)}
          onResume={onResume ? () => void onResume(entry.id) : undefined}
          onResumeArchived={() => void resumeArchivedAdventure(entry)}
          onDelete={() => void deleteAdventure(entry)}
          onOpen={() => void open(entry.id)}
        />
      {/each}
    </ul>
  {/if}
  {#if deleteError}<p class="text-sm text-theme-danger" role="alert">
      {deleteError}
    </p>{/if}
  {#if duplicateError}<p class="text-sm text-theme-danger" role="alert">
      {duplicateError}
    </p>{/if}
  {#if resumeError}<p class="text-sm text-theme-danger" role="alert">
      {resumeError}
    </p>{/if}
  {#if selected}<p class="text-sm text-theme-text">
      This transcript is read-only. Resume and edit controls are unavailable.
    </p>{/if}
  {#if selectedSession}<AdventureTranscript
      transcript={createPlayerTranscript(selectedSession)}
    />{/if}
</section>
