<script lang="ts">
  import type { Thread } from "solo-session-engine";

  interface Props {
    thread: Thread;
    /** False in a read-only vault: the thread can be read but not changed. */
    editable: boolean;
    kindLabel: string;
    /** The linked entries that still exist, with their titles. */
    links: { id: string; title: string }[];
    onOpenEntity: (id: string) => void;
    onEdit: () => void;
    onClose: (note: string) => void;
    onReopen: () => void;
    onDelete: () => void;
  }

  let {
    thread,
    editable,
    kindLabel,
    links,
    onOpenEntity,
    onEdit,
    onClose,
    onReopen,
    onDelete,
  }: Props = $props();

  let closing = $state(false);
  let closingNote = $state("");
  let confirming = $state(false);

  function confirmClose() {
    onClose(closingNote);
    closing = false;
    closingNote = "";
  }
</script>

<li
  class="flex flex-col gap-1 rounded-md border border-theme-border p-2"
  class:opacity-80={thread.status === "closed"}
>
  <div class="flex items-start justify-between gap-2">
    <span class="font-bold text-theme-text">{thread.title}</span>
    <span class="text-xs text-theme-muted">{kindLabel}</span>
  </div>
  {#if thread.note}
    <p class="text-xs text-theme-muted">{thread.note}</p>
  {/if}
  {#if thread.status === "closed" && thread.closingNote}
    <p class="text-xs text-theme-muted">{thread.closingNote}</p>
  {/if}
  {#each links as link (link.id)}
    <button
      type="button"
      class="w-fit text-left text-xs text-theme-primary underline"
      onclick={() => onOpenEntity(link.id)}
    >
      Open {link.title}
    </button>
  {/each}

  {#if !editable}
    <!-- Read-only: nothing to change. -->
  {:else if thread.status === "closed"}
    {#if confirming}
      {@render deleteConfirm()}
    {:else}
      <div class="flex justify-end gap-3 text-xs">
        <button type="button" class="text-theme-primary" onclick={onReopen}
          >Reopen</button
        >
        <button
          type="button"
          class="text-theme-muted"
          onclick={() => (confirming = true)}>Delete</button
        >
      </div>
    {/if}
  {:else if closing}
    <label class="flex flex-col gap-1 text-xs text-theme-text">
      <span>How did it end? (optional)</span>
      <input
        type="text"
        maxlength={500}
        bind:value={closingNote}
        class="rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
        data-testid="solo-thread-closing-note"
      />
    </label>
    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="text-xs text-theme-muted"
        onclick={() => (closing = false)}>Cancel</button
      >
      <button
        type="button"
        class="rounded-md border border-theme-border px-2 py-1 text-xs text-theme-text hover:bg-theme-bg"
        data-testid="solo-thread-confirm-close"
        onclick={confirmClose}
      >
        Close thread
      </button>
    </div>
  {:else if confirming}
    {@render deleteConfirm()}
  {:else}
    <div class="flex justify-end gap-3 text-xs">
      <button type="button" class="text-theme-primary" onclick={onEdit}
        >Edit</button
      >
      <button
        type="button"
        class="text-theme-primary"
        onclick={() => (closing = true)}>Close</button
      >
      <button
        type="button"
        class="text-theme-muted"
        onclick={() => (confirming = true)}>Delete</button
      >
    </div>
  {/if}
</li>

{#snippet deleteConfirm()}
  <div class="flex items-center justify-end gap-2 text-xs">
    <span class="text-theme-text">Delete this thread?</span>
    <button
      type="button"
      class="text-theme-muted"
      onclick={() => (confirming = false)}>No</button
    >
    <button
      type="button"
      class="rounded-md border border-theme-border px-2 py-1 text-theme-danger hover:bg-theme-bg"
      data-testid="solo-thread-confirm-delete"
      onclick={() => {
        confirming = false;
        onDelete();
      }}
    >
      Delete
    </button>
  </div>
{/snippet}
