<script lang="ts">
  import MarkdownFormatToolbar from "$lib/components/editor/MarkdownFormatToolbar.svelte";
  import { createMarkdownEditingController } from "$lib/utils/markdown-editing";

  /**
   * The inline edit form for a typed journal entry (#3476; basic Markdown
   * formatting per #3481). Shown by `JournalEntryRow` in place of the
   * entry's text while editing; it knows nothing about the row's other
   * state (move, delete, selection).
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
  let textarea = $state<HTMLTextAreaElement | undefined>(undefined);

  // Basic Markdown formatting (#3481): shares its glue with the composer's
  // note field — see `markdown-editing.ts`'s `createMarkdownEditingController`.
  const editing = createMarkdownEditingController({
    getTextarea: () => textarea,
    getText: () => draft,
    setText: (text) => (draftOverride = text),
  });

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
  <MarkdownFormatToolbar
    label="Edit formatting"
    onBold={editing.bold}
    onItalic={editing.italic}
    onBullet={editing.bullet}
  />
  <textarea
    bind:this={textarea}
    value={draft}
    oninput={(e) => (draftOverride = e.currentTarget.value)}
    onkeydown={editing.handleKeydown}
    aria-label={`Edit: ${snippet}`}
    rows="3"
    class="w-full resize-y rounded border border-theme-border bg-theme-bg px-2 py-1 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
    data-testid="journal-entry-edit-input"
  ></textarea>
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
