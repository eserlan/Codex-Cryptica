<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { TemplateDirectoryResult } from "schema";
  import { publicTemplateDirectoryService } from "$lib/services/publishing/PublicTemplateDirectoryService";
  import DirectoryFeedback from "$lib/components/community-templates/DirectoryFeedback.svelte";
  import DirectorySearchForm from "$lib/components/community-templates/DirectorySearchForm.svelte";
  import TemplateCardShell from "$lib/components/community-templates/TemplateCardShell.svelte";

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

  <DirectorySearchForm
    searchId="template-search"
    placeholder="Search name, system, category, or labels"
    bind:query
    onSubmit={search}
  >
    {#snippet filters()}
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
        <TemplateCardShell
          title={listing.title}
          ownerDisplayName={listing.ownerDisplayName}
          description={listing.description}
          onOpen={() => goto(resolve(`/templates/${listing.listingId}` as any))}
        >
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
        </TemplateCardShell>
      {/each}
    </div>
  </DirectoryFeedback>
</section>
