<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { GENERIC_TEMPLATES } from "schema";
  import type { EntityTemplateListing } from "schema";
  import { publicEntityTemplateDirectoryService } from "$lib/services/publishing/PublicEntityTemplateDirectoryService";
  import DirectoryFeedback from "./DirectoryFeedback.svelte";
  import DirectorySearchForm from "./DirectorySearchForm.svelte";
  import EntityTemplateCard from "./EntityTemplateCard.svelte";

  const BUILT_IN_TYPES = Object.keys(GENERIC_TEMPLATES);

  let query = $state("");
  let entityType = $state("");
  let labelText = $state("");
  let results = $state<EntityTemplateListing[]>([]);
  let facetTypes = $state<{ value: string; count: number }[]>([]);
  let nextCursor = $state<string | undefined>();
  let isLoading = $state(true);
  let error = $state("");
  let requestId = 0;

  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Built-in types first (in their usual order), then any others alphabetically.
  const typeOptions = $derived.by(() => {
    const byValue = new Map(facetTypes.map((t) => [t.value, t.count]));
    if (entityType && !byValue.has(entityType)) byValue.set(entityType, 0);
    const known = BUILT_IN_TYPES.filter((t) => byValue.has(t));
    const others = [...byValue.keys()]
      .filter((t) => !BUILT_IN_TYPES.includes(t))
      .sort((a, b) => a.localeCompare(b));
    return [...known, ...others].map((value) => ({
      value,
      count: byValue.get(value) ?? 0,
    }));
  });

  const activeLabels = $derived(
    labelText
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean),
  );
  const hasFilters = $derived(
    Boolean(query.trim() || entityType || activeLabels.length),
  );

  const currentQuery = (cursor?: string) => ({
    q: query.trim() || undefined,
    entityType: entityType || undefined,
    labels: activeLabels.length ? activeLabels : undefined,
    cursor,
  });

  async function load(cursor?: string) {
    const current = ++requestId;
    isLoading = true;
    error = "";
    try {
      const page =
        await publicEntityTemplateDirectoryService.listEntityTemplates(
          currentQuery(cursor),
        );
      if (current !== requestId) return;
      results = cursor ? [...results, ...page.results] : page.results;
      facetTypes = page.facets.entityTypes;
      nextCursor = page.nextCursor;
    } catch (cause) {
      if (current !== requestId) return;
      error =
        cause instanceof Error
          ? cause.message
          : "Could not load community templates.";
    } finally {
      if (current === requestId) isLoading = false;
    }
  }

  function clearFilters() {
    query = "";
    entityType = "";
    labelText = "";
    void load();
  }

  onMount(() => void load());
</script>

<div class="space-y-6" data-testid="entity-template-browse">
  <header class="space-y-2">
    <h1 class="font-header text-3xl font-bold text-theme-text">
      Find an entity template
    </h1>
    <p class="max-w-2xl text-sm text-theme-muted">
      Browse note templates shared by other worldbuilders. Installing one adds
      it to your vault as your own template; nothing changes until you choose to
      use it.
    </p>
  </header>

  <DirectorySearchForm
    searchId="entity-template-search"
    placeholder="Search name, description, type, or labels"
    bind:query
    onSubmit={() => void load()}
  >
    {#snippet filters()}
      <label class="sr-only" for="entity-template-type">Entity type</label>
      <select
        id="entity-template-type"
        bind:value={entityType}
        onchange={() => void load()}
        class="rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text"
      >
        <option value="">All types</option>
        {#each typeOptions as option (option.value)}
          <option value={option.value}
            >{titleCase(option.value)}{option.count
              ? ` (${option.count})`
              : ""}</option
          >
        {/each}
      </select>
      <label class="sr-only" for="entity-template-labels">Labels</label>
      <input
        id="entity-template-labels"
        bind:value={labelText}
        placeholder="Labels, e.g. Fantasy, Pathfinder"
        class="w-56 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text"
      />
    {/snippet}
    {#snippet actions()}
      {#if hasFilters}
        <button
          type="button"
          class="rounded-lg border border-theme-border px-4 py-2 text-sm text-theme-text hover:border-theme-primary"
          onclick={clearFilters}>Clear filters</button
        >
      {/if}
    {/snippet}
  </DirectorySearchForm>

  <DirectoryFeedback
    {isLoading}
    hasResults={results.length > 0}
    {error}
    onRetry={() => load()}
    hasMore={Boolean(nextCursor)}
    onLoadMore={() => load(nextCursor)}
  >
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each results as listing (listing.listingId)}
        <EntityTemplateCard
          {listing}
          onOpen={() =>
            goto(resolve(`/templates/entity/${listing.listingId}` as any))}
        />
      {/each}
    </div>
  </DirectoryFeedback>
</div>
