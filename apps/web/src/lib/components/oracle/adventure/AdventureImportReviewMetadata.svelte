<script lang="ts">
  import type { AdventureJsonV1 } from "@codex/adventure-engine";

  let {
    draft,
    canonicalHash = "",
  }: {
    draft: AdventureJsonV1;
    canonicalHash?: string;
  } = $props();

  const PROSE_TRUNCATE_CHARS = 240;
  let descriptionExpanded = $state(false);
  let backgroundExpanded = $state(false);
  let hookExpanded = $state(false);

  const descriptionText = $derived(draft.description?.trim() ?? "");
  const isDescriptionLong = $derived(
    descriptionText.length > PROSE_TRUNCATE_CHARS,
  );
  const displayedDescription = $derived(
    isDescriptionLong && !descriptionExpanded
      ? `${descriptionText.slice(0, PROSE_TRUNCATE_CHARS).trimEnd()}…`
      : descriptionText,
  );

  const backgroundText = $derived(draft.premise.background?.trim() ?? "");
  const isBackgroundLong = $derived(
    backgroundText.length > PROSE_TRUNCATE_CHARS,
  );
  const displayedBackground = $derived(
    isBackgroundLong && !backgroundExpanded
      ? `${backgroundText.slice(0, PROSE_TRUNCATE_CHARS).trimEnd()}…`
      : backgroundText || "—",
  );

  const hookText = $derived(draft.premise.hook?.trim() ?? "");
  const isHookLong = $derived(hookText.length > PROSE_TRUNCATE_CHARS);
  const displayedHook = $derived(
    isHookLong && !hookExpanded
      ? `${hookText.slice(0, PROSE_TRUNCATE_CHARS).trimEnd()}…`
      : hookText || "—",
  );

  const optionalProvenanceRows = $derived(
    [
      {
        label: "Authors",
        value: draft.source.authors?.join(", ") ?? "",
      },
      { label: "Publisher", value: draft.source.publisher ?? "" },
      { label: "Published", value: draft.source.publishedDate ?? "" },
      { label: "Licence", value: draft.source.license ?? "" },
      { label: "URL", value: draft.source.url ?? "", mono: true },
      {
        label: "Source document hash",
        value: draft.source.documentHash ?? "",
        mono: true,
        span2: true,
      },
      { label: "System", value: draft.system?.name ?? "" },
      { label: "Themes", value: draft.premise.theme?.join(", ") ?? "" },
      { label: "Tone", value: draft.premise.tone ?? "" },
      {
        label: "Extensions",
        value: Object.keys(draft.extensions ?? {}).join(", "),
        mono: true,
        span2: true,
      },
    ].filter((row) => row.value.length > 0),
  );
</script>

{#snippet descriptionBlock()}
  {#if descriptionText}
    <div class="space-y-1 text-sm text-theme-text">
      <p data-testid="review-metadata-description">{displayedDescription}</p>
      {#if isDescriptionLong}
        <button
          type="button"
          data-testid="review-description-read-more"
          aria-expanded={descriptionExpanded}
          aria-label={descriptionExpanded
            ? "Show less of description"
            : "Read more of description"}
          onclick={() => (descriptionExpanded = !descriptionExpanded)}
          class="min-h-9 rounded-md border border-theme-text/75 bg-theme-surface px-2.5 py-1 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
        >
          {descriptionExpanded ? "Show less" : "Read more"}
        </button>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet premiseCards()}
  <div class="grid gap-3 sm:grid-cols-2">
    <div
      class="space-y-1.5 rounded-lg border border-theme-border bg-theme-bg p-3 text-sm"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-theme-text">
        Background
      </p>
      <p class="text-theme-text" data-testid="review-metadata-background">
        {displayedBackground}
      </p>
      {#if isBackgroundLong}
        <button
          type="button"
          data-testid="review-background-read-more"
          aria-expanded={backgroundExpanded}
          aria-label={backgroundExpanded
            ? "Show less of background"
            : "Read more of background"}
          onclick={() => (backgroundExpanded = !backgroundExpanded)}
          class="min-h-9 rounded-md border border-theme-text/75 bg-theme-surface px-2.5 py-1 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
        >
          {backgroundExpanded ? "Show less" : "Read more"}
        </button>
      {/if}
    </div>
    <div
      class="space-y-1.5 rounded-lg border border-theme-border bg-theme-bg p-3 text-sm"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-theme-text">
        Hook
      </p>
      <p class="text-theme-text" data-testid="review-metadata-hook">
        {displayedHook}
      </p>
      {#if isHookLong}
        <button
          type="button"
          data-testid="review-hook-read-more"
          aria-expanded={hookExpanded}
          aria-label={hookExpanded ? "Show less of hook" : "Read more of hook"}
          onclick={() => (hookExpanded = !hookExpanded)}
          class="min-h-9 rounded-md border border-theme-text/75 bg-theme-surface px-2.5 py-1 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
        >
          {hookExpanded ? "Show less" : "Read more"}
        </button>
      {/if}
    </div>
  </div>
{/snippet}

{#snippet sourceDetailsDisclosure()}
  <details
    class="group rounded-lg border border-theme-border bg-theme-bg"
    data-testid="review-source-details"
  >
    <summary
      class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
      data-testid="review-source-details-summary"
    >
      <span class="flex items-center gap-2">
        <span
          class="icon-[lucide--file-code] h-4 w-4 shrink-0 text-theme-text"
          aria-hidden="true"
        ></span>
        <span>Source details</span>
      </span>
      <span
        class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
        aria-hidden="true"
      ></span>
    </summary>

    <div class="border-t border-theme-border px-3 py-3">
      <dl class="grid gap-2 text-xs text-theme-text sm:grid-cols-2">
        <div>
          <dt class="font-semibold">Package ID</dt>
          <dd class="font-mono">{draft.id}</dd>
        </div>
        <div>
          <dt class="font-semibold">Version</dt>
          <dd class="font-mono">{draft.version}</dd>
        </div>
        <div>
          <dt class="font-semibold">Format</dt>
          <dd class="font-mono">{draft.formatVersion}</dd>
        </div>
        <div>
          <dt class="font-semibold">Source title</dt>
          <dd>{draft.source.title}</dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="font-semibold">Canonical SHA-256</dt>
          <dd class="break-all font-mono" data-testid="adventure-package-hash">
            {canonicalHash || "Computing…"}
          </dd>
        </div>
        {#each optionalProvenanceRows as row (row.label)}
          <div class={row.span2 ? "sm:col-span-2" : ""}>
            <dt class="font-semibold">{row.label}</dt>
            <dd class={row.mono ? "break-all font-mono" : ""}>{row.value}</dd>
          </div>
        {/each}
      </dl>
    </div>
  </details>
{/snippet}

<section
  class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-metadata-heading"
  data-testid="review-metadata"
>
  <div>
    <h2
      id="review-metadata-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Premise and Source
    </h2>
  </div>

  {@render descriptionBlock()}
  {@render premiseCards()}
  {@render sourceDetailsDisclosure()}
</section>
