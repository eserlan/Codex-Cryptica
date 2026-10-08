<script lang="ts">
  import {
    filterThreads,
    THREAD_KINDS,
    type Thread,
    type ThreadKind,
  } from "solo-session-engine";
  import { soloThreads } from "$lib/stores/solo-session-instance";
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import SoloMenu from "./SoloMenu.svelte";
  import SoloThreadDialog from "./SoloThreadDialog.svelte";
  import SoloThreadList from "./SoloThreadList.svelte";

  const KIND_LABELS: Record<ThreadKind, string> = {
    question: "Question",
    lead: "Lead",
    objective: "Objective",
    mystery: "Mystery",
  };

  let kindFilter = $state<ThreadKind | "all">("all");
  let search = $state("");
  let showClosed = $state(false);
  let editing = $state<{ thread: Thread | null } | null>(null);
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
    const current = editing?.thread;
    const result = current
      ? soloThreads.edit(current.id, values)
      : soloThreads.add(values);
    if (!result.ok) return report(result);
    editing = null;
    return null;
  }

  /** Links an entry to the thread being edited. */
  function linkEntry(entityId: string): string | null {
    return editing?.thread
      ? report(soloThreads.link(editing.thread.id, entityId))
      : null;
  }

  function unlinkEntry(entityId: string) {
    if (editing?.thread) soloThreads.unlink(editing.thread.id, entityId);
  }

  function closeThread(id: string, note: string) {
    report(soloThreads.close(id, note));
  }
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
      <div class="flex gap-2">
        <input
          type="search"
          placeholder="Search threads"
          aria-label="Search threads"
          bind:value={search}
          class="min-w-0 flex-1 rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
          data-testid="solo-threads-search"
        />
        <select
          bind:value={kindFilter}
          aria-label="Filter by kind"
          class="rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
          data-testid="solo-threads-filter"
        >
          <option value="all">All kinds</option>
          {#each THREAD_KINDS as option (option)}
            <option value={option}>{KIND_LABELS[option]}s</option>
          {/each}
        </select>
      </div>
    {/if}

    {#if message}
      <p class="text-xs text-theme-danger" role="alert">{message}</p>
    {/if}

    {#if editing}
      <SoloThreadDialog
        thread={editing.thread}
        {entityOptions}
        onSave={saveEdit}
        onLink={linkEntry}
        onUnlink={unlinkEntry}
        onClose={() => (editing = null)}
      />
    {:else if soloThreads.editable}
      <button
        type="button"
        class="rounded-md border border-theme-primary/60 px-3 py-1.5 font-bold text-theme-primary hover:bg-theme-primary/10"
        data-testid="solo-thread-add"
        onclick={() => (editing = { thread: null })}
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
      onOpenEntity={openEntity}
      onEdit={(thread) => (editing = { thread })}
      onClose={(thread, note) => closeThread(thread.id, note)}
      onReopen={(thread) => report(soloThreads.reopen(thread.id))}
      onDelete={(thread) => report(soloThreads.remove(thread.id))}
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
        onOpenEntity={openEntity}
        onEdit={(thread) => (editing = { thread })}
        onClose={(thread, note) => closeThread(thread.id, note)}
        onReopen={(thread) => report(soloThreads.reopen(thread.id))}
        onDelete={(thread) => report(soloThreads.remove(thread.id))}
      />
    {/if}
  </div>
</SoloMenu>
