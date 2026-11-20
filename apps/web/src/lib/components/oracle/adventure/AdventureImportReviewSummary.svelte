<script lang="ts">
  import {
    ENTITY_COLLECTIONS,
    type AdventureJsonValidationError,
    type AdventureJsonV1,
  } from "@codex/adventure-engine";

  let {
    draft,
    validationOk,
    validationErrors = [],
  }: {
    draft: AdventureJsonV1;
    validationOk: boolean;
    validationErrors?: AdventureJsonValidationError[];
  } = $props();

  const COLLECTION_LABELS: Record<string, string> = {
    locations: "Locations",
    actors: "Actors",
    factions: "Factions",
    scenes: "Scenes",
    encounters: "Encounters",
    clues: "Clues",
    rumours: "Rumours",
    items: "Items",
    secrets: "Secrets",
    endings: "Endings",
    unresolved: "Unresolved",
  };

  function formatCollectionLabel(key: string): string {
    return (
      COLLECTION_LABELS[key] ??
      key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/^\w/, (char) => char.toUpperCase())
    );
  }

  const collectionCounts = $derived.by(() => {
    const record = draft as unknown as Record<string, unknown>;
    const knownSet = new Set<string>(ENTITY_COLLECTIONS);
    const extraArrayKeys = Object.keys(record).filter(
      (key) => !knownSet.has(key) && Array.isArray(record[key]),
    );
    const keys = [...ENTITY_COLLECTIONS, ...extraArrayKeys];
    return keys.map((key) => {
      const items = record[key];
      const count = Array.isArray(items) ? items.length : 0;
      return {
        key,
        label: formatCollectionLabel(key),
        count,
      };
    });
  });

  const populatedCollections = $derived(
    collectionCounts.filter((entry) => entry.count > 0),
  );
  const emptyCollections = $derived(
    collectionCounts.filter((entry) => entry.count === 0),
  );
  const totalRecords = $derived(
    collectionCounts.reduce((sum, entry) => sum + entry.count, 0),
  );
  const unresolvedCount = $derived(
    Array.isArray(draft.unresolved) ? draft.unresolved.length : 0,
  );
  const totalSummaryLine = $derived(
    `${totalRecords} imported ${totalRecords === 1 ? "record" : "records"} across ${populatedCollections.length} ${populatedCollections.length === 1 ? "collection" : "collections"}`,
  );
  const validBadgeLabel = $derived(
    unresolvedCount > 0
      ? `Validated · ${unresolvedCount} unresolved ${unresolvedCount === 1 ? "item" : "items"}`
      : "Validated",
  );
  const failedBadgeLabel = $derived(
    `Validation failed (${validationErrors.length} ${validationErrors.length === 1 ? "error" : "errors"})`,
  );
</script>

{#snippet validationBadge()}
  <div class="flex flex-wrap items-center gap-2">
    {#if validationOk}
      <span
        role="status"
        aria-live="polite"
        data-testid="review-validation-status"
        class="inline-flex items-center gap-1.5 rounded-full border border-theme-primary/50 bg-theme-primary/15 px-3 py-1 text-xs font-semibold text-theme-text"
      >
        <span
          class="icon-[lucide--check-circle-2] h-3.5 w-3.5 text-theme-primary"
          aria-hidden="true"
        ></span>
        {validBadgeLabel}
      </span>
    {:else}
      <span
        role="alert"
        data-testid="review-validation-status"
        class="inline-flex items-center gap-1.5 rounded-full border border-theme-danger/50 bg-theme-danger/10 px-3 py-1 text-xs font-semibold text-theme-text"
      >
        <span
          class="icon-[lucide--alert-triangle] h-3.5 w-3.5 text-theme-text"
          aria-hidden="true"
        ></span>
        {failedBadgeLabel}
      </span>
    {/if}
  </div>
{/snippet}

{#snippet validationErrorAlert()}
  {#if !validationOk && validationErrors.length > 0}
    <div
      role="alert"
      data-testid="review-validation-errors"
      class="space-y-1.5 rounded-lg border border-theme-danger/50 bg-theme-danger/10 p-3 text-xs text-theme-text"
    >
      <p class="font-semibold text-theme-text">
        Package checks failed — resolve before approving:
      </p>
      <ul class="list-disc space-y-1 pl-4">
        {#each validationErrors as issue, index (`${issue.code}-${issue.path ?? index}`)}
          <li>
            <span class="font-mono font-semibold">{issue.code}</span
            >{#if issue.path}
              <span class="font-mono"> ({issue.path})</span>{/if}: {issue.message}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
{/snippet}

{#snippet collectionGrid()}
  {#if populatedCollections.length > 0}
    <dl
      class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
      aria-label="Populated imported collections"
      data-testid="review-populated-collections"
    >
      {#each populatedCollections as item (item.key)}
        <div
          class="flex items-center justify-between gap-2 rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-xs text-theme-text"
          data-testid="review-count-{item.key}"
        >
          <dt class="font-medium text-theme-text">{item.label}</dt>
          <dd
            class="rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 font-mono font-semibold text-theme-text"
          >
            {item.count}
          </dd>
        </div>
      {/each}
    </dl>
  {:else}
    <p
      class="text-sm text-theme-text"
      data-testid="review-no-populated-collections"
    >
      No populated collections in this package.
    </p>
  {/if}

  {#if emptyCollections.length > 0}
    <p class="text-xs text-theme-text" data-testid="review-empty-collections">
      Empty collections (0):
      {#each emptyCollections as item, idx (item.key)}
        <span data-testid="review-count-{item.key}"
          >{item.label} (0){idx < emptyCollections.length - 1 ? ", " : ""}</span
        >
      {/each}
    </p>
  {/if}
{/snippet}

<section
  class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-import-summary-heading"
  data-testid="review-import-summary"
>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="space-y-0.5">
      <h2
        id="review-import-summary-heading"
        class="font-header text-lg font-semibold text-theme-text"
      >
        Import summary
      </h2>
      <p
        class="text-xs text-theme-text"
        data-testid="review-import-total-count"
      >
        {totalSummaryLine}
      </p>
    </div>
    {@render validationBadge()}
  </div>

  {@render validationErrorAlert()}
  {@render collectionGrid()}
</section>
