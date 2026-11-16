<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import AdventureImportFeedback from "./AdventureImportFeedback.svelte";

  interface ImportValidationIssue {
    code: string;
    message: string;
    path?: string;
    entityId?: string;
  }

  let {
    onImportFile,
    onImportExperimentalFile,
    importError = null,
    importValidationErrors = [],
    importing = false,
    canImport = true,
  }: {
    onImportFile?: (file: File) => void | Promise<void>;
    onImportExperimentalFile?: (file: File) => void | Promise<void>;
    importError?: string | null;
    importValidationErrors?: ImportValidationIssue[];
    importing?: boolean;
    canImport?: boolean;
  } = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let experimentalFileInput = $state<HTMLInputElement | null>(null);
  let isDraggingJson = $state(false);

  const guideHref = $derived(`${basePath()}/adventure-import`);

  function triggerImport(): void {
    if (canImport) fileInput?.click();
  }

  async function handleFileChange(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file && onImportFile) {
      await onImportFile(file);
    }
  }

  async function handleExperimentalFileChange(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file && onImportExperimentalFile) {
      await onImportExperimentalFile(file);
    }
  }

  function handleDragOver(event: DragEvent): void {
    if (!canImport) return;
    event.preventDefault();
    isDraggingJson = true;
  }

  function handleDragLeave(event: DragEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    const related = event.relatedTarget as Node | null;
    if (current && related && current.contains(related)) return;
    isDraggingJson = false;
  }

  async function handleDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    isDraggingJson = false;
    if (!canImport || !onImportFile) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await onImportFile(file);
    }
  }
</script>

<div class="sm:col-span-2">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    data-testid="adventure-json-dropzone"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={(event) => void handleDrop(event)}
    class="flex flex-col justify-between gap-3 rounded-xl border-2 border-dashed p-5 text-left transition sm:col-span-2 {isDraggingJson
      ? 'border-theme-primary bg-theme-primary/10'
      : 'border-theme-primary/40 bg-theme-surface hover:border-theme-primary'}"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-1 items-start gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-theme-primary/10 text-theme-text"
          aria-hidden="true"
        >
          <span class="icon-[lucide--file-json] h-5 w-5"></span>
        </span>
        <div class="min-w-0 space-y-1">
          <h2 class="font-header text-base font-semibold text-theme-text">
            Import Adventure JSON
          </h2>
          <p
            id="adventure-import-description"
            class="text-sm leading-relaxed text-theme-text"
          >
            Drop an Adventure JSON v1 (<span class="font-mono">.json</span>)
            file here or choose one from your device. Validated locally with
            zero AI calls.
          </p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-theme-primary px-4 py-2 text-sm font-semibold text-theme-on-primary transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="adventure-import"
        disabled={!canImport}
        onclick={triggerImport}
        aria-describedby="adventure-import-description"
      >
        <span class="icon-[lucide--file-up] h-4 w-4" aria-hidden="true"></span>
        Choose Adventure JSON
      </button>
    </div>

    <div
      class="flex flex-wrap items-center justify-between gap-3 border-t border-theme-border/60 pt-3 text-xs text-theme-text"
    >
      <a
        href={guideHref}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="adventure-import-guide-link"
        class="inline-flex items-center gap-1.5 font-medium text-theme-text underline underline-offset-4 hover:opacity-80"
      >
        <span class="icon-[lucide--book-open] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        How to convert a module to Adventure JSON
        <span class="icon-[lucide--external-link] h-3 w-3" aria-hidden="true"
        ></span>
      </a>

      <label
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-theme-border px-2.5 py-1 text-xs font-medium text-theme-text transition hover:border-theme-primary hover:bg-theme-primary/5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-theme-primary {canImport
          ? ''
          : 'cursor-not-allowed opacity-60'}"
        data-testid="adventure-experimental-import-label"
      >
        <span
          class="icon-[lucide--flask-conical] h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
        <span>Experimental convenience: Import Markdown or PDF</span>
        <input
          bind:this={experimentalFileInput}
          type="file"
          accept=".md,.pdf,text/markdown,text/plain,application/pdf"
          data-testid="adventure-experimental-file-input"
          class="sr-only"
          disabled={!canImport}
          aria-label="Experimental convenience: Import Markdown or PDF adventure file"
          onchange={(event) => void handleExperimentalFileChange(event)}
        />
      </label>
    </div>

    {#if !canImport}
      <p class="text-xs text-theme-text">
        Open a ready owner Vault to import an adventure.
      </p>
    {/if}
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept=".json,application/json"
    data-testid="adventure-file-input"
    class="sr-only"
    tabindex="-1"
    disabled={!canImport}
    aria-label="Import Adventure JSON file"
    onchange={(event) => void handleFileChange(event)}
  />

  <AdventureImportFeedback {importing} {importError} {importValidationErrors} />
</div>
