<script module lang="ts">
  export interface ImportValidationIssue {
    code: string;
    message: string;
    path?: string;
    entityId?: string;
  }
</script>

<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";

  let {
    onDiscover,
    onSurpriseMe,
    onOwnPremise,
    onEnterWorld = () => {},
    onImportFile,
    onImportExperimentalFile,
    importError = null,
    importValidationErrors = [],
    importing = false,
    canDiscover = true,
    canImport = true,
  }: {
    onDiscover: () => void;
    onSurpriseMe?: () => void;
    onOwnPremise: () => void;
    onEnterWorld?: () => void;
    onImportFile?: (file: File) => void | Promise<void>;
    onImportExperimentalFile?: (file: File) => void | Promise<void>;
    importError?: string | null;
    importValidationErrors?: ImportValidationIssue[];
    importing?: boolean;
    canDiscover?: boolean;
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

<section
  class="mx-auto w-full max-w-5xl space-y-5"
  aria-labelledby="adventure-entry-heading"
  data-testid="adventure-entry-choices"
>
  <header class="space-y-2">
    <p class="text-xs font-semibold uppercase tracking-widest text-theme-text">
      Adventure Mode
    </p>
    <h1
      id="adventure-entry-heading"
      class="font-header text-2xl font-semibold text-theme-text sm:text-3xl"
    >
      Where will your story begin?
    </h1>
    <p class="max-w-2xl text-sm leading-relaxed text-theme-text">
      Choose how to enter your adventure. You decide what your character does;
      Oracle responds as the world around them.
    </p>
  </header>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <button
      type="button"
      data-testid="adventure-discover"
      class="group flex min-h-44 flex-col items-start gap-3 rounded-xl border border-theme-primary/40 bg-theme-surface p-5 text-left transition hover:border-theme-primary hover:bg-theme-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
      disabled={!canDiscover}
      onclick={() => {
        if (canDiscover) onDiscover();
      }}
      aria-describedby="adventure-discover-description"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-theme-primary/10 text-theme-text"
        aria-hidden="true"
      >
        <span class="icon-[lucide--sparkles] h-5 w-5"></span>
      </span>
      <span class="font-header text-base font-semibold text-theme-text">
        Discover an Adventure
      </span>
      <span
        id="adventure-discover-description"
        class="text-sm leading-relaxed text-theme-text"
      >
        Get six rumours instantly, choose a lead, and discover what happens when
        you investigate—or walk away.
      </span>
      {#if !canDiscover}
        <span class="text-xs text-theme-text">
          Open a fully loaded Vault to generate rumours.
        </span>
      {/if}
    </button>

    <button
      type="button"
      data-testid="adventure-surprise-me"
      class="group flex min-h-44 flex-col items-start gap-3 rounded-xl border border-theme-primary/40 bg-theme-surface p-5 text-left transition hover:border-theme-primary hover:bg-theme-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
      disabled={!canDiscover}
      onclick={() => {
        if (canDiscover && onSurpriseMe) onSurpriseMe();
      }}
      aria-describedby="adventure-surprise-me-description"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-theme-primary/10 text-theme-text"
        aria-hidden="true"
      >
        <span class="icon-[lucide--wand-sparkles] h-5 w-5"></span>
      </span>
      <span class="font-header text-base font-semibold text-theme-text">
        Surprise Me with an Adventure
      </span>
      <span
        id="adventure-surprise-me-description"
        class="text-sm leading-relaxed text-theme-text"
      >
        Generate a ready-to-play adventure with structured locations, threats,
        and hidden GM secrets, then jump straight into play.
      </span>
      {#if !canDiscover}
        <span class="text-xs text-theme-text">
          Open a fully loaded Vault to generate an adventure.
        </span>
      {/if}
    </button>

    <button
      type="button"
      data-testid="adventure-own-premise"
      class="group flex min-h-44 flex-col items-start gap-3 rounded-xl border border-theme-border bg-theme-surface p-5 text-left transition hover:border-theme-primary hover:bg-theme-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      onclick={onOwnPremise}
      aria-describedby="adventure-premise-description"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-theme-primary/10 text-theme-text"
        aria-hidden="true"
      >
        <span class="icon-[lucide--book-open] h-5 w-5"></span>
      </span>
      <span class="font-header text-base font-semibold text-theme-text">
        Create Your Own Premise
      </span>
      <span
        id="adventure-premise-description"
        class="text-sm leading-relaxed text-theme-text"
      >
        Describe a starting situation, pick your character, and let Oracle bring
        the world to life.
      </span>
    </button>

    <button
      type="button"
      class="group flex min-h-44 flex-col items-start gap-3 rounded-xl border border-theme-border bg-theme-surface p-5 text-left transition hover:border-theme-primary hover:bg-theme-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      data-testid="adventure-enter-world"
      onclick={onEnterWorld}
      aria-describedby="adventure-world-description"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-theme-primary/10 text-theme-text"
        aria-hidden="true"
      >
        <span class="icon-[lucide--globe-2] h-5 w-5"></span>
      </span>
      <span class="font-header text-base font-semibold text-theme-text">
        Enter Your World
      </span>
      <span
        id="adventure-world-description"
        class="text-sm leading-relaxed text-theme-text"
      >
        Choose a character, place, time and opening style. Explore your Vault
        without a prepared quest.
      </span>
    </button>

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
          <span class="icon-[lucide--file-up] h-4 w-4" aria-hidden="true"
          ></span>
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

  {#if importing}
    <div
      role="status"
      data-testid="adventure-import-loading"
      class="rounded-lg border border-theme-border bg-theme-surface p-3 text-sm text-theme-text"
    >
      Importing adventure…
    </div>
  {/if}

  {#if importError || importValidationErrors.length > 0}
    <div
      role="alert"
      data-testid="adventure-import-error"
      class="space-y-2 rounded-lg border border-theme-danger/50 bg-theme-danger/10 p-3 text-sm text-theme-text"
    >
      {#if importError}
        <p class="font-medium">{importError}</p>
      {/if}
      {#if importValidationErrors.length > 0}
        <ul class="space-y-1.5 pl-1" data-testid="adventure-import-error-list">
          {#each importValidationErrors as err, index (`${err.code}-${index}`)}
            <li
              class="rounded border border-theme-danger/30 bg-theme-surface/70 p-2 text-xs"
            >
              <div class="flex flex-wrap items-center gap-2 font-mono">
                <span class="font-semibold">{err.code}</span>
                {#if err.path}
                  <span class="break-all">path: {err.path}</span>
                {/if}
                {#if err.entityId}
                  <span class="break-all">entity: {err.entityId}</span>
                {/if}
              </div>
              <p class="mt-0.5 text-sm">{err.message}</p>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</section>
