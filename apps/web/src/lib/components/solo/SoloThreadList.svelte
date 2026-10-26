<script lang="ts">
  import type { Thread, ThreadKind } from "solo-session-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import SoloThreadRow from "./SoloThreadRow.svelte";

  const KIND_LABELS: Record<ThreadKind, string> = {
    question: "Question",
    lead: "Lead",
    objective: "Objective",
    mystery: "Mystery",
  };

  interface Props {
    /** The threads to list, already filtered. */
    threads: Thread[];
    testId: string;
    editable: boolean;
    /** Shown when the list is empty. Null shows nothing. */
    emptyMessage: string | null;
    onOpenEntity: (id: string) => void;
    onEdit: (thread: Thread) => void;
    onClose: (thread: Thread, note: string) => void;
    onReopen: (thread: Thread) => void;
    onDelete: (thread: Thread) => void;
  }

  let {
    threads,
    testId,
    editable,
    emptyMessage,
    onOpenEntity,
    onEdit,
    onClose,
    onReopen,
    onDelete,
  }: Props = $props();

  /** The thread's links that still exist in the vault. */
  function linksOf(thread: Thread) {
    return thread.entityIds.flatMap((id) => {
      const entity = vault.entities?.[id];
      return entity ? [{ id, title: entity.title }] : [];
    });
  }
</script>

<ul class="flex flex-col gap-2" data-testid={testId}>
  {#each threads as thread (thread.id)}
    <SoloThreadRow
      {thread}
      {editable}
      kindLabel={KIND_LABELS[thread.kind]}
      links={linksOf(thread)}
      {onOpenEntity}
      onEdit={() => onEdit(thread)}
      onClose={(note) => onClose(thread, note)}
      onReopen={() => onReopen(thread)}
      onDelete={() => onDelete(thread)}
    />
  {:else}
    {#if emptyMessage}
      <li class="text-xs text-theme-muted">{emptyMessage}</li>
    {/if}
  {/each}
</ul>
