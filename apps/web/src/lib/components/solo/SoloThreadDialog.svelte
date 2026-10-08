<script lang="ts">
  import {
    THREAD_KINDS,
    THREAD_LIMITS,
    type Thread,
    type ThreadKind,
  } from "solo-session-engine";

  interface Props {
    /** The thread being edited, or null for a new one. */
    thread: Thread | null;
    /** Vault entries that can be linked, with their titles. */
    entityOptions: { id: string; title: string }[];
    onSave: (values: {
      title: string;
      kind: ThreadKind;
      note: string;
    }) => string | null;
    onLink: (entityId: string) => string | null;
    onUnlink: (entityId: string) => void;
    onClose: () => void;
  }

  let { thread, entityOptions, onSave, onLink, onUnlink, onClose }: Props =
    $props();

  const KIND_LABELS: Record<ThreadKind, string> = {
    question: "Question",
    lead: "Lead",
    objective: "Objective",
    mystery: "Mystery",
  };

  // svelte-ignore state_referenced_locally
  let title = $state(thread?.title ?? "");
  // svelte-ignore state_referenced_locally
  let kind = $state<ThreadKind>(thread?.kind ?? "question");
  // svelte-ignore state_referenced_locally
  let note = $state(thread?.note ?? "");
  let error = $state<string | null>(null);
  let linkChoice = $state("");

  const titleLeft = $derived(THREAD_LIMITS.title - title.length);
  const noteLeft = $derived(THREAD_LIMITS.note - note.length);

  const linked = $derived(
    entityOptions.filter((entity) => thread?.entityIds.includes(entity.id)),
  );
  const linkable = $derived(
    entityOptions.filter((entity) => !thread?.entityIds.includes(entity.id)),
  );

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (title.trim().length === 0) {
      error = "Give the thread a title.";
      return;
    }
    error = onSave({ title, kind, note });
  }

  function addLink() {
    if (!linkChoice) return;
    error = onLink(linkChoice);
    linkChoice = "";
  }
</script>

<form
  class="flex flex-col gap-2 rounded-md border border-theme-border bg-theme-surface p-3 text-sm"
  data-testid="solo-thread-dialog"
  aria-label={thread ? "Edit thread" : "New thread"}
  onsubmit={submit}
>
  <label class="flex flex-col gap-1 text-theme-text">
    <span>Title</span>
    <input
      type="text"
      maxlength={THREAD_LIMITS.title}
      bind:value={title}
      class="rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
      data-testid="solo-thread-title"
    />
    <span class="text-xs text-theme-muted" data-testid="solo-thread-title-left"
      >{titleLeft} characters left</span
    >
  </label>

  <label class="flex flex-col gap-1 text-theme-text">
    <span>Kind</span>
    <select
      bind:value={kind}
      class="rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
      data-testid="solo-thread-kind"
    >
      {#each THREAD_KINDS as option (option)}
        <option value={option}>{KIND_LABELS[option]}</option>
      {/each}
    </select>
  </label>

  <label class="flex flex-col gap-1 text-theme-text">
    <span>Note</span>
    <textarea
      rows="3"
      maxlength={THREAD_LIMITS.note}
      bind:value={note}
      class="rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
      data-testid="solo-thread-note"
    ></textarea>
    <span class="text-xs text-theme-muted" data-testid="solo-thread-note-left"
      >{noteLeft} characters left</span
    >
  </label>

  {#if thread}
    <div class="flex flex-col gap-1 text-theme-text">
      <span>Linked entries</span>
      {#if linked.length === 0}
        <span class="text-xs text-theme-muted">None yet.</span>
      {/if}
      {#each linked as entity (entity.id)}
        <div class="flex items-center justify-between gap-2">
          <span class="min-w-0 flex-1 truncate">{entity.title}</span>
          <button
            type="button"
            class="text-xs text-theme-muted underline hover:text-theme-text"
            onclick={() => onUnlink(entity.id)}
          >
            Unlink {entity.title}
          </button>
        </div>
      {/each}
      {#if linkable.length > 0}
        <div class="flex gap-2">
          <select
            bind:value={linkChoice}
            aria-label="Entry to link"
            class="min-w-0 flex-1 rounded-md border border-theme-border bg-theme-bg px-2 py-1 text-theme-text"
            data-testid="solo-thread-link-choice"
          >
            <option value="">Choose an entry</option>
            {#each linkable as entity (entity.id)}
              <option value={entity.id}>{entity.title}</option>
            {/each}
          </select>
          <button
            type="button"
            class="rounded-md border border-theme-border px-2 py-1 text-theme-text hover:bg-theme-bg"
            onclick={addLink}
          >
            Link
          </button>
        </div>
      {/if}
    </div>
  {/if}

  {#if error}
    <p
      class="text-xs text-theme-danger"
      role="alert"
      data-testid="solo-thread-error"
    >
      {error}
    </p>
  {/if}

  <div class="flex justify-end gap-2">
    <button
      type="button"
      class="rounded-md px-3 py-1 text-theme-text hover:bg-theme-bg"
      onclick={onClose}
    >
      Cancel
    </button>
    <button
      type="submit"
      class="rounded-md border border-theme-primary/60 px-3 py-1 font-bold text-theme-primary hover:bg-theme-primary/10"
      data-testid="solo-thread-save"
    >
      Save thread
    </button>
  </div>
</form>
