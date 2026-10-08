<script lang="ts">
  import {
    filterThreads,
    type Thread,
    type ThreadKind,
  } from "solo-session-engine";
  import { soloThreads } from "$lib/stores/solo-session-instance";
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import SoloMenu from "./SoloMenu.svelte";
  import SoloThreadDialog from "./SoloThreadDialog.svelte";
  import SoloThreadFilters from "./SoloThreadFilters.svelte";
  import SoloThreadList from "./SoloThreadList.svelte";

  let kindFilter = $state<ThreadKind | "all">("all");
  let search = $state("");
  let showClosed = $state(false);
  /** The thread being edited by id (null for a new one), read from the store so links show at once. */
  let editing = $state<{ id: string | null } | null>(null);
  const editingThread = $derived(
    editing?.id
      ? (soloThreads.threads.find((t) => t.id === editing?.id) ?? null)
      : null,
  );
  let message = $state<string | null>(null);

  const visible = $derived(
    filterThreads(soloThreads.threads, {
      kind: kindFilter === "all" ? undefined : kindFilter,
      search,
    }),
  );
  const openList = $derived(visible.filter((t) => t.status === "open"));
  const closedList = $derived(visible.filter((t) => t.status === "closed"));
  const entityOptions = $derived(
    Object.values(vault.entities ?? {}).map((entity) => ({
      id: entity.id,
      title: entity.title,
    })),
  );

  function openEntity(id: string) {
    vault.selectedEntityId = id;
    modalUIStore.openZenMode(id);
  }

  function report(result: { ok: boolean; error?: string }): string | null {
    message = result.ok ? null : (result.error ?? "That did not save.");
    return message;
  }

  function saveEdit(values: { title: string; kind: ThreadKind; note: string }) {
    const id = editing?.id;
    const result = id ? soloThreads.edit(id, values) : soloThreads.add(values);
    if (!result.ok) return report(result);
    editing = null;
    return null;
  }

  /** Links an entry to the thread being edited. */
  function linkEntry(entityId: string): string | null {
    return editing?.id ? report(soloThreads.link(editing.id, entityId)) : null;
  }

  function unlinkEntry(entityId: string) {
    if (editing?.id) soloThreads.unlink(editing.id, entityId);
  }

  function closeThread(id: string, note: string) {
    report(soloThreads.close(id, note));
  }

  /** What both thread lists do when a row's action is chosen. */
  const listActions = {
    onOpenEntity: openEntity,
    onEdit: (thread: Thread) => (editing = { id: thread.id }),
    onClose: (thread: Thread, note: string) => closeThread(thread.id, note),
    onReopen: (thread: Thread) => report(soloThreads.reopen(thread.id)),
    onDelete: (thread: Thread) => report(soloThreads.remove(thread.id)),
  };
</script>

<SoloMenu
  label="Threads"
  testId="solo-threads-menu"
  helpTarget="solo-threads-menu"
>
  <div class="flex w-80 flex-col gap-2 text-sm">
    {#if !soloThreads.editable}
      <p class="text-xs text-theme-muted" data-testid="solo-threads-readonly">
        Threads can be viewed here, but they cannot be changed in this vault.
      </p>
    {/if}

    {#if soloThreads.threads.length === 0}
      <p class="text-xs text-theme-muted" data-testid="solo-threads-empty">
        Threads keep the story's open questions, leads, objectives and mysteries
        between sessions. Random events can point at them.
      </p>
    {:else}
      <SoloThreadFilters bind:search bind:kindFilter />
    {/if}

    {#if message}
      <p class="text-xs text-theme-danger" role="alert">{message}</p>
    {/if}

    {#if editing}
      <!-- Keyed by thread, so editing another thread starts a fresh draft. -->
      {#key editing.id ?? "new"}
        <SoloThreadDialog
          thread={editingThread}
          {entityOptions}
          onSave={saveEdit}
          onLink={linkEntry}
          onUnlink={unlinkEntry}
          onClose={() => (editing = null)}
        />
      {/key}
    {:else if soloThreads.editable}
      <button
        type="button"
        class="rounded-md border border-theme-primary/60 px-3 py-1.5 font-bold text-theme-primary hover:bg-theme-primary/10"
        data-testid="solo-thread-add"
        onclick={() => (editing = { id: null })}
      >
        Add a thread
      </button>
    {/if}

    <SoloThreadList
      threads={openList}
      testId="solo-threads-open"
      editable={soloThreads.editable}
      emptyMessage={soloThreads.threads.length > 0
        ? "No open threads match."
        : null}
      {...listActions}
    />

    {#if soloThreads.closed.length > 0}
      <button
        type="button"
        class="w-fit text-xs text-theme-primary underline"
        aria-expanded={showClosed}
        data-testid="solo-threads-toggle-closed"
        onclick={() => (showClosed = !showClosed)}
      >
        {showClosed ? "Hide" : "Show"} closed threads ({soloThreads.closed
          .length})
      </button>
    {/if}

    {#if showClosed}
      <SoloThreadList
        threads={closedList}
        testId="solo-threads-closed"
        editable={soloThreads.editable}
        emptyMessage={null}
        {...listActions}
      />
    {/if}
  </div>
</SoloMenu>
