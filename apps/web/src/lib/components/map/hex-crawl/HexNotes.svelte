<script lang="ts">
  import { onDestroy } from "svelte";
  import { NOTES_MAX_LENGTH } from "hex-crawl-engine";
  import { createDebouncedTextSave } from "./debounced-text-save";

  let {
    notes,
    aiNotes,
    onSaveNotes,
    onSaveAiNotes,
  }: {
    notes: string;
    aiNotes: string;
    onSaveNotes: (text: string) => void;
    onSaveAiNotes: (text: string) => void;
  } = $props();

  // The panel remounts per hex, so the initial values are the committed ones.
  // svelte-ignore state_referenced_locally
  let notesText = $state(notes);
  // svelte-ignore state_referenced_locally
  let aiText = $state(aiNotes);

  const notesSaver = createDebouncedTextSave({
    save: (text) => onSaveNotes(text),
    committed: () => notes,
  });
  const aiSaver = createDebouncedTextSave({
    save: (text) => onSaveAiNotes(text),
    committed: () => aiNotes,
  });

  onDestroy(() => {
    notesSaver.flush();
    aiSaver.flush();
  });

  function clearAi() {
    aiText = "";
    aiSaver.change("");
    aiSaver.flush();
  }
</script>

<div class="space-y-3">
  <label class="block space-y-1">
    <span
      class="text-micro uppercase tracking-widest font-bold text-theme-muted"
    >
      Your notes
    </span>
    <textarea
      rows="4"
      maxlength={NOTES_MAX_LENGTH}
      bind:value={notesText}
      oninput={() => notesSaver.change(notesText)}
      onblur={() => notesSaver.flush()}
      class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none focus:border-theme-primary"
    ></textarea>
  </label>

  {#if aiNotes}
    <section
      class="space-y-2 rounded-lg border border-dashed border-theme-primary/50 bg-theme-primary/5 p-3"
      aria-label="AI-drafted notes"
    >
      <div class="flex items-center justify-between gap-2">
        <h4
          class="text-micro uppercase tracking-widest font-bold text-theme-primary"
        >
          AI-drafted
        </h4>
        <button
          type="button"
          aria-label="Clear AI notes"
          onclick={clearAi}
          class="text-micro font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text"
        >
          Clear
        </button>
      </div>
      <textarea
        rows="3"
        maxlength={NOTES_MAX_LENGTH}
        bind:value={aiText}
        oninput={() => aiSaver.change(aiText)}
        onblur={() => aiSaver.flush()}
        aria-label="Edit AI-drafted notes"
        class="w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none focus:border-theme-primary"
      ></textarea>
    </section>
  {/if}
</div>
