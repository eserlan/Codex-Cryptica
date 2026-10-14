<script lang="ts">
  type Props = {
    kind: "table" | "deck";
    isDraggingFile: boolean;
    selectedFileName: string;
    imagesCount: number;
    fileAccept: string;
    onDragOver: (event: DragEvent) => void;
    onDragLeave: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
    onAcceptFiles: (files: File[]) => void;
    onClearSelectedFile: () => void;
  };
  let {
    kind,
    isDraggingFile,
    selectedFileName,
    imagesCount,
    fileAccept,
    onDragOver,
    onDragLeave,
    onDrop,
    onAcceptFiles,
    onClearSelectedFile,
  }: Props = $props();

  const fileHeading = $derived(
    kind === "deck" ? "Open a file or a folder" : "Open a file",
  );
  const addLabel = $derived(kind === "deck" ? "Add more" : "Replace file");
  const chooseLabel = $derived(
    kind === "deck" ? "Choose files" : "Choose file",
  );
  const emptyPrompt = $derived(
    kind === "deck"
      ? "Drag a file, or a folder of card art, here"
      : "Drag and drop your file here",
  );
  const emptyDescription = $derived(
    kind === "deck"
      ? "A file exported from Codex Cryptica comes back whole, other text lands in the paste box, and pictures are matched to cards by name. A folder can hold both."
      : "A file exported from Codex Cryptica comes back whole. Anything else lands in the paste box below.",
  );
  const loadedMessage = $derived(
    imagesCount > 0
      ? `${imagesCount} ${imagesCount === 1 ? "picture" : "pictures"} ready${selectedFileName ? " · file loaded" : ""}`
      : "File loaded ready for import",
  );
  const dropzoneClass = $derived(
    isDraggingFile
      ? "border-theme-primary bg-theme-primary/10 shadow-inner"
      : selectedFileName || imagesCount > 0
        ? "border-theme-primary/40 bg-theme-primary/5"
        : "border-theme-border/70 bg-theme-bg/40 hover:border-theme-primary/50 hover:bg-theme-primary/5",
  );
</script>

{#snippet fileInput()}
  <input
    type="file"
    accept={fileAccept}
    multiple={kind === "deck"}
    class="sr-only"
    onchange={(e) => onAcceptFiles(Array.from(e.currentTarget.files ?? []))}
    data-testid="import-file"
  />
{/snippet}

<div class="flex flex-col gap-1.5">
  <span
    class="font-header text-nano font-bold uppercase tracking-[0.2em] text-theme-muted"
    >{fileHeading}</span
  >
  <!-- One drop target for the whole import: the text of the deck, its art, or
         a folder holding both. What each file is decides where it goes. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-5 text-center transition-all duration-150 {dropzoneClass}"
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
    data-testid="import-file-dropzone"
  >
    {#if selectedFileName || imagesCount > 0}
      <div class="flex flex-col items-center gap-2">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-theme-primary/20 text-theme-primary"
        >
          <span aria-hidden="true" class="icon-[lucide--file-check] h-5 w-5"
          ></span>
        </div>
        <div class="flex flex-col items-center gap-0.5">
          {#if selectedFileName}
            <span
              class="font-mono text-xs font-semibold text-theme-text"
              data-testid="import-file-selected"
            >
              {selectedFileName}
            </span>
          {/if}
          <span class="font-body text-micro text-theme-muted">
            {loadedMessage}
          </span>
        </div>
        <div class="mt-1 flex flex-wrap items-center justify-center gap-2">
          <label
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-theme-border bg-theme-surface px-3 py-1.5 font-header text-micro font-bold uppercase tracking-wider text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary shadow-sm"
          >
            <span
              aria-hidden="true"
              class="icon-[lucide--plus] h-3.5 w-3.5 text-theme-muted"
            ></span>
            <span>{addLabel}</span>
            {@render fileInput()}
          </label>
          <button
            type="button"
            onclick={onClearSelectedFile}
            class="inline-flex items-center gap-1.5 rounded-lg border border-theme-border/60 bg-theme-surface/60 px-3 py-1.5 font-header text-micro font-bold uppercase tracking-wider text-theme-muted transition-colors hover:border-red-500 hover:text-red-500 shadow-sm"
            data-testid="import-file-clear"
          >
            <span aria-hidden="true" class="icon-[lucide--trash-2] h-3.5 w-3.5"
            ></span>
            <span>Remove</span>
          </button>
        </div>
      </div>
    {:else}
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-theme-primary/10 text-theme-primary"
      >
        <span aria-hidden="true" class="icon-[lucide--upload-cloud] h-5 w-5"
        ></span>
      </div>
      <div class="flex flex-col items-center gap-0.5">
        <p
          class="font-header text-xs font-bold uppercase tracking-wider text-theme-text"
        >
          {emptyPrompt}
        </p>
        <p class="font-body text-micro text-theme-muted/80">
          {emptyDescription}
        </p>
      </div>
      <label
        class="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-theme-primary/40 bg-theme-primary/15 px-4 py-2 font-header text-micro font-bold uppercase tracking-wider text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg active:scale-95 shadow-sm"
      >
        <span aria-hidden="true" class="icon-[lucide--folder-open] h-4 w-4"
        ></span>
        <span>{chooseLabel}</span>
        {@render fileInput()}
      </label>
    {/if}
  </div>
</div>
