<script lang="ts">
  import type {
    AdventureArchiveEntry,
    AdventureSessionRepository,
  } from "$lib/services/adventure/adventure-session-repository";
  import AdventureTranscript from "./AdventureTranscript.svelte";
  import {
    createPlayerTranscript,
    type AdventureSession,
  } from "@codex/adventure-engine";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

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
    confirm = (options) => notificationStore.confirm(options),
  }: {
    repository: AdventureSessionRepository;
    vaultId: string;
    onResume?: (sessionId: string) => Promise<void>;
    confirm?: Confirm;
  } = $props();
  let entries = $state<AdventureArchiveEntry[]>([]);
  let selected = $state<string | null>(null);
  let selectedSession = $state<AdventureSession | null>(null);
  let deletingId = $state<string | null>(null);
  let deleteError = $state<string | null>(null);
  let refreshRequest = 0;
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
  $effect(() => {
    const requestedVaultId = vaultId;
    selected = null;
    selectedSession = null;
    deleteError = null;
    void refresh(requestedVaultId);
  });
</script>

<section class="space-y-3" aria-labelledby="adventure-archive-heading">
  <h2
    id="adventure-archive-heading"
    class="text-lg font-semibold text-theme-primary"
  >
    Adventure archive
  </h2>
  {#if entries.length === 0}<p class="text-sm text-theme-secondary">
      No archived adventures yet.
    </p>{:else}<ul class="space-y-2">
      {#each entries as entry (entry.id)}<li class="flex gap-2">
          <button
            class="flex min-h-12 min-w-0 flex-1 items-center justify-between rounded-md border border-theme-border px-3 text-left text-theme-primary"
            type="button"
            onclick={() => void open(entry.id)}
            aria-label={`Open adventure ${entry.title}`}
            ><span>{entry.title}</span><span
              class="text-xs text-theme-secondary"
              >{entry.loadCondition === "unreadable"
                ? "Unreadable"
                : entry.status}</span
            ></button
          >
          {#if entry.status === "active" && entry.loadCondition === "normal" && onResume}
            <button
              class="flex min-h-12 items-center justify-center rounded-md border border-theme-primary/50 px-3 text-sm text-theme-primary transition hover:bg-theme-primary/10"
              type="button"
              onclick={() => void onResume(entry.id)}
              aria-label="Resume active adventure {entry.title}"
            >
              Resume
            </button>
          {/if}
          {#if entry.loadCondition === "unreadable" || (entry.status === "archived" && entry.revision !== undefined)}
            <button
              class="flex min-h-12 min-w-12 items-center justify-center rounded-md border border-theme-danger/50 px-3 text-theme-danger transition hover:bg-theme-danger/10 disabled:opacity-50"
              type="button"
              onclick={() => void deleteAdventure(entry)}
              disabled={deletingId === entry.id}
              aria-label="Delete {entry.loadCondition === 'unreadable'
                ? 'unreadable'
                : 'archived'} adventure {entry.title}"
              title="Delete adventure"
            >
              <span class="icon-[lucide--trash-2] h-4 w-4" aria-hidden="true"
              ></span>
            </button>
          {/if}
        </li>{/each}
    </ul>{/if}
  {#if deleteError}<p class="text-sm text-theme-danger" role="alert">
      {deleteError}
    </p>{/if}
  {#if selected}<p class="text-sm text-theme-secondary">
      This transcript is read-only. Resume and edit controls are unavailable.
    </p>{/if}
  {#if selectedSession}<AdventureTranscript
      transcript={createPlayerTranscript(selectedSession)}
    />{/if}
</section>
