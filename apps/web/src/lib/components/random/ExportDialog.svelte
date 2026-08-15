<script lang="ts">
  import {
    EXPORT_FORMATS,
    exportSource,
    imageCount,
    referencedNames,
    type ExportFormat,
    type RandomSource,
  } from "random-source-engine";
  import { downloadText } from "$lib/utils/download";

  /**
   * Getting one table or deck back out of the vault (issue 2263).
   *
   * A table somebody built is real work, and the only ways out were a
   * whole-vault archive or opening the vault directory by hand. The format
   * choice is put in front of the user rather than guessed, because the two
   * jobs are genuinely different: keeping a copy that comes back intact, and
   * handing the text to somewhere that is not this app.
   */
  let {
    source,
    onClose,
  }: {
    source: RandomSource;
    onClose: () => void;
  } = $props();

  let format = $state<ExportFormat>("codex");

  const noun = $derived(source.kind === "table" ? "table" : "deck");
  const chosen = $derived(
    EXPORT_FORMATS.find((f) => f.id === format) ?? EXPORT_FORMATS[0],
  );

  /**
   * What a reader would not get. Only worth saying for the lossy formats —
   * the Codex file carries the reference text and the image paths as written,
   * so the copy is as complete as the original.
   */
  const missingReferences = $derived(
    format === "codex" ? [] : referencedNames(source),
  );
  const missingImages = $derived(format === "codex" ? 0 : imageCount(source));

  function download() {
    const file = exportSource(source, format);
    downloadText(file.content, file.filename, file.mimeType);
    onClose();
  }
</script>

<div
  class="flex flex-col gap-4 rounded-xl border border-theme-border bg-theme-surface p-4"
  data-testid="export-dialog"
>
  <div class="flex items-start justify-between gap-3">
    <div class="flex flex-col gap-0.5">
      <h2
        class="font-header text-sm font-bold uppercase tracking-widest text-theme-text"
      >
        Export {noun}
      </h2>
      <p class="font-body text-xs text-theme-muted">
        {source.name}
      </p>
    </div>
    <button
      type="button"
      onclick={onClose}
      class="rounded border border-theme-border px-2.5 py-1 font-header text-[10px] uppercase tracking-widest text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
      data-testid="export-cancel"
    >
      Cancel
    </button>
  </div>

  <div class="flex flex-col gap-1.5">
    {#each EXPORT_FORMATS as option}
      {@const current = option.id === format}
      <label
        class="flex cursor-pointer items-start gap-2.5 rounded border p-2.5 transition-colors {current
          ? 'border-theme-primary bg-theme-primary/5'
          : 'border-theme-border hover:border-theme-primary/40'}"
        data-testid="export-format-{option.id}"
      >
        <input
          type="radio"
          name="export-format"
          value={option.id}
          checked={current}
          onchange={() => (format = option.id)}
          class="mt-0.5 accent-theme-primary"
        />
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="font-header text-xs font-bold text-theme-text">
            {option.label}
            <span class="font-mono text-[10px] text-theme-muted/70"
              >{option.extension}</span
            >
          </span>
          <span class="font-body text-[11px] text-theme-muted"
            >{option.summary}</span
          >
        </span>
      </label>
    {/each}
  </div>

  <!-- Said before the download, not after: the point is to let somebody pick
       a different format, or export the other tables too. -->
  {#if missingReferences.length > 0 || missingImages > 0}
    <div
      class="flex flex-col gap-1 rounded border border-amber-500/30 bg-amber-500/10 p-2.5 font-body text-[11px] text-amber-700 dark:text-amber-400"
      data-testid="export-warning"
    >
      {#if missingReferences.length > 0}
        <p data-testid="export-warning-references">
          This {noun} pulls in {missingReferences.join(", ")}. A {chosen.label}
          carries the text but not {missingReferences.length === 1
            ? "that source"
            : "those sources"}, so
          {missingReferences.length === 1 ? "it" : "they"} will not resolve for whoever
          opens this — export {missingReferences.length === 1 ? "it" : "them"} as
          well.
        </p>
      {/if}
      {#if missingImages > 0}
        <p data-testid="export-warning-images">
          {missingImages}
          {missingImages === 1 ? "card has" : "cards have"} a picture. Pictures live
          in your vault, so no text format can carry them.
        </p>
      {/if}
    </div>
  {/if}

  <button
    type="button"
    onclick={download}
    class="flex items-center justify-center gap-2 rounded border border-theme-primary/30 bg-theme-primary/10 px-3 py-2 font-header text-[10px] font-bold uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg"
    data-testid="export-download"
  >
    <span aria-hidden="true" class="icon-[lucide--download] h-3.5 w-3.5"></span>
    Download
  </button>
</div>

<style>
  @reference "../../../app.css";
</style>
