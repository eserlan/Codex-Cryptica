<script lang="ts">
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";

  /**
   * The inline edit form for a typed journal entry (#3476). Edits with the
   * same rich-text editor as entity content, in its compact variant. Shown by
   * `JournalEntryRow` in place of the entry's text while editing; it knows
   * nothing about the row's other state (move, delete, selection).
   */
  type ActionResult = { ok: true } | { ok: false; error: string };

  let {
    content,
    snippet,
    onSave,
    onCancel,
  }: {
    /** The entry's current text, to seed the draft. */
    content: string;
    /** For the fields' accessible names. */
    snippet: string;
    /** Returning `{ ok: true }` is the form's only signal to close; the
     *  caller decides what that means (e.g. leaving edit mode). */
    onSave: (content: string) => Promise<ActionResult>;
    onCancel: () => void;
  } = $props();

  let draftOverride = $state<string | undefined>(undefined);
  const draft = $derived(draftOverride ?? content);
  let error = $state<string | null>(null);
  let isSaving = $state(false);

  async function save() {
    if (isSaving) return;
    isSaving = true;
    try {
      const result = await onSave(draft);
      error = result.ok ? null : result.error;
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="flex flex-col gap-1">
  <MarkdownEditor
    content={draft}
    onUpdate={(markdown) => (draftOverride = markdown)}
    label={`Edit: ${snippet}`}
    compact
    testId="journal-entry-edit-input"
  />
  {#if error}
    <p role="alert" class="text-[10px] text-theme-danger">{error}</p>
  {/if}
  <div class="flex justify-end gap-2">
    <button
      type="button"
      onclick={onCancel}
      class="font-header text-[9px] font-bold uppercase tracking-wider text-theme-muted transition-colors hover:text-theme-text"
      data-testid="journal-entry-edit-cancel"
    >
      Cancel
    </button>
    <button
      type="button"
      onclick={save}
      disabled={isSaving}
      class="font-header text-[9px] font-bold uppercase tracking-wider text-theme-primary transition-colors hover:text-theme-secondary disabled:opacity-40"
      data-testid="journal-entry-edit-save"
    >
      Save
    </button>
  </div>
</div>
