<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { TemplateDirectoryResult } from "schema";
  import { publicTemplateDirectoryService } from "$lib/services/publishing/PublicTemplateDirectoryService";

  let query = $state("");
  let system = $state("");
  let category = $state("");
  let results = $state<TemplateDirectoryResult[]>([]);
  let nextCursor = $state<string | undefined>();
  let isLoading = $state(true);
  let error = $state("");
  let requestId = 0;

  async function load(cursor?: string) {
    const currentRequestId = ++requestId;
    isLoading = true;
    error = "";
    try {
      const page = await publicTemplateDirectoryService.listTemplates({
        q: query.trim() || undefined,
        system: system.trim() || undefined,
        category: (category || undefined) as never,
        cursor,
      });
      if (currentRequestId !== requestId) return;
      results = cursor ? [...results, ...page.results] : page.results;
      nextCursor = page.nextCursor;
    } catch (cause) {
      if (currentRequestId !== requestId) return;
      error =
        cause instanceof Error
          ? cause.message
          : "Could not load community templates.";
    } finally {
      if (currentRequestId === requestId) isLoading = false;
    }
  }

  function search() {
    void load();
  }

  onMount(() => void load());
</script>

<section
  class="mx-auto w-full max-w-6xl space-y-6 p-6"
  data-testid="template-directory"
>
  <header class="space-y-2">
    <p class="text-xs font-bold uppercase tracking-[0.2em] text-theme-primary">
      Community templates
    </p>
    <h1 class="font-header text-3xl font-bold text-theme-text">
      Find a Stat Sheet layout
    </h1>
    <p class="max-w-2xl text-sm text-theme-muted">
      Browse layouts shared by other worldbuilders. Only the reusable structure
      is public; your campaign stays in your vault.
    </p>
  </header>

  <form
    class="flex flex-wrap gap-2"
    onsubmit={(event) => {
      event.preventDefault();
      search();
    }}
  >
    <label class="sr-only" for="template-search">Search templates</label>
    <input
      id="template-search"
      bind:value={query}
      placeholder="Search name, system, category, or labels"
      class="min-w-64 flex-1 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text"
    />
    <label class="sr-only" for="template-system">System</label>
    <input
      id="template-system"
      bind:value={system}
      placeholder="System"
      class="w-36 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text"
    />
    <label class="sr-only" for="template-category">Category</label>
    <select
      id="template-category"
      bind:value={category}
      class="rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text"
    >
      <option value="">All categories</option>
      <option value="character">Character</option>
      <option value="npc">NPC</option>
      <option value="location">Location</option>
      <option value="faction">Faction</option>
      <option value="item">Item</option>
      <option value="ship">Ship</option>
    </select>
    <button
      type="submit"
      class="rounded-lg bg-theme-primary px-4 py-2 text-sm font-bold text-theme-bg"
      >Search</button
    >
  </form>

  {#if isLoading && results.length === 0}
    <p class="py-12 text-center text-sm text-theme-muted" role="status">
      Loading community templates…
    </p>
  {:else if error}
    <div
      class="rounded-lg border border-theme-border bg-theme-surface p-6 text-sm text-theme-text"
      role="alert"
    >
      <p>{error}</p>
      <button
        type="button"
        class="mt-3 text-theme-primary underline"
        onclick={() => load()}>Try again</button
      >
    </div>
  {:else if results.length === 0}
    <p
      class="rounded-lg border border-theme-border bg-theme-surface p-12 text-center text-sm text-theme-muted"
    >
      No community templates match those filters.
    </p>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each results as listing (listing.listingId)}
        <button
          type="button"
          class="rounded-xl border border-theme-border bg-theme-surface p-4 text-left transition hover:border-theme-primary"
          onclick={() =>
            goto(resolve(`/templates/${listing.listingId}` as any))}
        >
          <div class="flex items-start justify-between gap-3">
            <h2 class="font-header text-lg font-bold text-theme-text">
              {listing.title}
            </h2>
            {#if listing.ownerDisplayName}<span class="text-xs text-theme-muted"
                >by {listing.ownerDisplayName}</span
              >{/if}
          </div>
          <p class="mt-2 line-clamp-3 text-sm text-theme-muted">
            {listing.description}
          </p>
          <div class="mt-4 flex flex-wrap gap-1.5 text-xs text-theme-primary">
            {#if listing.system}<span
                class="rounded-full border border-theme-primary/30 px-2 py-1"
                >{listing.system}</span
              >{/if}
            {#if listing.category}<span
                class="rounded-full border border-theme-primary/30 px-2 py-1"
                >{listing.category}</span
              >{/if}
            {#each listing.labels as label, labelIndex (`${listing.listingId}-${label}-${labelIndex}`)}<span
                class="rounded-full border border-theme-border px-2 py-1"
                >{label}</span
              >{/each}
          </div>
        </button>
      {/each}
    </div>
    {#if nextCursor}
      <button
        type="button"
        class="mx-auto block rounded-lg border border-theme-border px-4 py-2 text-sm text-theme-text hover:border-theme-primary"
        onclick={() => load(nextCursor)}
        disabled={isLoading}>Load more</button
      >
    {/if}
  {/if}
</section>
