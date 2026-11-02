<script lang="ts">
  import type { WorldEntryContextPreview, WorldEntryPreviewRecord } from
    "#lib/services/adventure/world-entry-context-preview.js";

  let {
    preview,
    onBack,
    onStart,
    starting = false,
    error = null,
  }: {
    preview: WorldEntryContextPreview;
    onBack: () => void;
    onStart: () => void;
    starting?: boolean;
    error?: string | null;
  } = $props();

  function recordHint(record: WorldEntryPreviewRecord): string {
    return [
      record.type,
      record.applicability === "uncertain" ? "date unconfirmed" :
        record.applicability === "historical" ? "historical" : "",
      record.dateLabel ?? "",
    ].filter(Boolean).join(" · ");
  }
</script>

<section
  data-testid="world-entry-preview"
  aria-labelledby="world-entry-preview-heading"
  class="mx-auto w-full max-w-3xl space-y-4 rounded-xl border border-theme-border bg-theme-surface p-4 sm:p-6"
>
  <header class="space-y-2">
    <h2 id="world-entry-preview-heading" class="font-header text-xl text-theme-text">
      Your starting world
    </h2>
    <p class="text-sm text-theme-text">
      A small part of your Vault will ground the opening, not your whole world.
      Sources below are for setup review; they are not automatically character knowledge.
    </p>
  </header>
  <div class="grid grid-cols-3 gap-2 text-center">
    <div class="rounded-lg border border-theme-border bg-theme-bg p-3">
      <p class="text-xl font-semibold text-theme-text" data-testid="preview-count-people">{preview.counts.people}</p>
      <p class="text-xs text-theme-text">People</p>
    </div>
    <div class="rounded-lg border border-theme-border bg-theme-bg p-3">
      <p class="text-xl font-semibold text-theme-text" data-testid="preview-count-locations">{preview.counts.locations}</p>
      <p class="text-xs text-theme-text">Locations</p>
    </div>
    <div class="rounded-lg border border-theme-border bg-theme-bg p-3">
      <p class="text-xl font-semibold text-theme-text" data-testid="preview-count-events">{preview.counts.events}</p>
      <p class="text-xs text-theme-text">Events</p>
    </div>
  </div>

  {#if preview.warnings.length}
    <ul class="list-disc space-y-1 pl-5 text-xs text-theme-text" data-testid="world-preview-warnings">
      {#each preview.warnings as warning}
        <li>{warning}</li>
      {/each}
    </ul>
  {/if}

  <details class="rounded-lg border border-theme-border p-3">
    <summary class="min-h-9 cursor-pointer font-semibold text-theme-text">
      Review {preview.records.length} referenced Vault records
    </summary>
    {#if preview.records.length}
      <ul class="mt-3 space-y-2">
        {#each preview.records as record (record.id)}
          <li class="flex flex-wrap items-start justify-between gap-x-3 rounded-md bg-theme-bg p-2 text-sm">
            <span class="font-medium text-theme-text">{record.title}</span>
            <span class="text-xs text-theme-text">
              {recordHint(record)}
            </span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="mt-3 text-sm text-theme-text">
        No linked records found. You can still begin a provisional scene.
      </p>
    {/if}
    {#if preview.omitted}
      <p class="mt-2 text-xs text-theme-text">{preview.omitted} other linked records not included.</p>
    {/if}
  </details>

  {#if error}
    <p role="alert" class="text-sm text-theme-danger">{error}</p>
  {/if}

  <div class="flex flex-col gap-2 sm:flex-row">
    <button type="button" data-testid="world-entry-adjust" onclick={onBack}
      class="min-h-12 rounded-md border border-theme-border px-4 py-2 text-theme-text">
      Adjust selection
    </button>
    <button type="button" data-testid="world-entry-start" onclick={onStart}
      disabled={starting}
      class="min-h-12 rounded-md bg-theme-primary px-4 py-2 font-semibold text-theme-on-primary disabled:opacity-50">
      {starting ? "Starting…" : "Start playing"}
    </button>
  </div>
</section>
