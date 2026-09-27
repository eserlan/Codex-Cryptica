<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import { buildAnswerIndexJsonLd } from "$lib/content/answers/json-ld";
  import {
    ANSWER_CATEGORIES,
    groupAnswersByCategory,
  } from "$lib/content/answers/categories";
  import type { AnswerConfig, AnswerKind } from "$lib/content/answers/schema";
  import {
    ANSWER_SORT_OPTIONS,
    DEFAULT_ANSWER_SORT,
    formatAnswerDate,
    persistAnswerSort,
    readStoredAnswerSort,
    sortAnswers,
    type AnswerSortOption,
  } from "$lib/content/answers/sort";
  import { browserStorage } from "$lib/utils/runtime-deps";
  import type { PageData } from "./$types";
  import CommunityFavourites, {
    type CommunityFavourite,
  } from "$lib/components/answers/CommunityFavourites.svelte";
  import {
    COMMUNITY_MAX_ITEMS,
    communityAggregates,
  } from "$lib/services/community/community-aggregates";
  import { getAnswer } from "$lib/content/answers/registry";

  let { data }: { data: PageData } = $props();

  const cleanBase = base === "/" ? "" : base;

  const TITLE = "RPG and worldbuilding answers";
  const DESCRIPTION =
    "Short, practical answers to questions that come up while running and building tabletop campaigns: point crawls, factions, pantheons, encounters, notes and more.";

  let answers = $derived(data.answers);

  let searchQuery = $state("");
  let activeCategory = $state<string | "all">("all");
  let activeKind = $state<AnswerKind | "all">("all");
  let sortBy = $state<AnswerSortOption>(DEFAULT_ANSWER_SORT);
  let lastSyncedSort = $state<AnswerSortOption | null>(null);
  let isInitialized = $state(false);
  /** Community-validated answers with display copy resolved (spec 164). */
  let communityFavourites = $state<CommunityFavourite[]>([]);

  const KIND_LABEL: Record<string, string> = {
    definition: "Definition",
    "how-to": "How to",
    framework: "Framework",
    comparison: "Comparison",
  };

  const KIND_OPTIONS: Array<{ id: AnswerKind | "all"; label: string }> = [
    { id: "all", label: "All Formats" },
    { id: "how-to", label: "How-To" },
    { id: "framework", label: "Frameworks" },
    { id: "comparison", label: "Comparisons" },
    { id: "definition", label: "Definitions" },
  ];

  /** Resolves one aggregate row to display copy; unknown slugs are dropped. */
  function toCommunityFavourite(item: {
    slug: string;
    yes: number;
  }): CommunityFavourite | null {
    const answer = getAnswer(item.slug);
    if (!answer) return null;
    const category = getCategoryInfo(answer.category);
    return {
      slug: item.slug,
      question: answer.question,
      shortAnswer: answer.shortAnswer,
      meta: `${category?.title ?? answer.category} · ${KIND_LABEL[answer.kind] ?? answer.kind}`,
      yes: item.yes,
    };
  }

  /** Loads the community strip; fail-silent by design (spec 164). */
  async function loadCommunityFavourites(): Promise<void> {
    const items = await communityAggregates.fetchTop();
    if (!items) return;
    const resolved: CommunityFavourite[] = [];
    for (const item of items.slice(0, COMMUNITY_MAX_ITEMS)) {
      const favourite = toCommunityFavourite(item);
      if (favourite) resolved.push(favourite);
    }
    communityFavourites = resolved;
  }

  /** Reads URL search params into filter state; returns the raw params so
   * callers can distinguish a clean directory view from a linked filter. */
  function readInitialFilters(): {
    cat: string | null;
    q: string | null;
    k: string | null;
  } {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    if (cat && (cat === "all" || ANSWER_CATEGORIES.some((c) => c.id === cat))) {
      activeCategory = cat;
    }
    const q = params.get("q");
    if (q) {
      searchQuery = q;
    }
    const k = params.get("kind");
    if (k && (k === "all" || Object.hasOwn(KIND_LABEL, k))) {
      activeKind = k as AnswerKind | "all";
    }
    return { cat, q, k };
  }

  onMount(() => {
    const { cat, q, k } = readInitialFilters();
    const saved = readStoredAnswerSort(browserStorage);
    if (saved !== sortBy) {
      sortBy = saved;
    }
    lastSyncedSort = saved;
    isInitialized = true;

    // Community favourites (spec 164): fetch only for the default directory
    // view. Rendering is additionally gated on !isSearchingOrFiltered and
    // the component's own quorum, so a cold or unreachable aggregate simply
    // leaves the section hidden.
    if (!cat && !q && !k) {
      void loadCommunityFavourites();
    }
  });

  $effect(() => {
    if (lastSyncedSort !== null && sortBy !== lastSyncedSort) {
      persistAnswerSort(sortBy, browserStorage);
      lastSyncedSort = sortBy;
    }
  });

  // Synchronize filter state into the URL query parameters
  $effect(() => {
    if (!isInitialized) return;
    const cat = activeCategory;
    const q = searchQuery;
    const k = activeKind;

    const url = new URL(window.location.href);
    if (cat !== "all") {
      url.searchParams.set("category", cat);
    } else {
      url.searchParams.delete("category");
    }

    if (q.trim()) {
      url.searchParams.set("q", q.trim());
    } else {
      url.searchParams.delete("q");
    }

    if (k !== "all") {
      url.searchParams.set("kind", k);
    } else {
      url.searchParams.delete("kind");
    }

    const newQuery = url.searchParams.toString();
    const newPath = url.pathname + (newQuery ? `?${newQuery}` : "");
    if (window.location.pathname + window.location.search !== newPath) {
      window.history.replaceState(window.history.state, "", newPath);
    }
  });

  function getCategoryCount(categoryId: string): number {
    if (categoryId === "all") return answers.length;
    return answers.filter((a) => a.category === categoryId).length;
  }

  function getKindCount(kindId: AnswerKind | "all"): number {
    if (kindId === "all") return answers.length;
    return answers.filter((a) => a.kind === kindId).length;
  }

  function getCategoryInfo(categoryId: string) {
    return ANSWER_CATEGORIES.find((c) => c.id === categoryId);
  }

  let filteredAnswers = $derived.by(() => {
    const query = searchQuery.trim().toLowerCase();

    const matches = answers.filter((answer) => {
      // Check category filter
      if (activeCategory !== "all") {
        if (answer.category !== activeCategory) return false;
      }

      // Check kind filter
      if (activeKind !== "all") {
        if (answer.kind !== activeKind) return false;
      }

      // Check search query
      if (!query) return true;

      const questionMatch = answer.question.toLowerCase().includes(query);
      const shortAnswerMatch = answer.shortAnswer.toLowerCase().includes(query);
      const kindMatch = (KIND_LABEL[answer.kind] ?? answer.kind)
        .toLowerCase()
        .includes(query);
      const cat = getCategoryInfo(answer.category);
      const categoryMatch = cat
        ? cat.title.toLowerCase().includes(query)
        : false;

      return questionMatch || shortAnswerMatch || kindMatch || categoryMatch;
    });

    return sortAnswers(matches, sortBy);
  });

  let groupedSections = $derived(groupAnswersByCategory(answers));

  let isSearchingOrFiltered = $derived(
    searchQuery.trim().length > 0 ||
      activeCategory !== "all" ||
      activeKind !== "all" ||
      sortBy !== DEFAULT_ANSWER_SORT,
  );

  function resetFilters() {
    searchQuery = "";
    activeCategory = "all";
    activeKind = "all";
    sortBy = DEFAULT_ANSWER_SORT;
  }
</script>

<SeoHead
  title="{TITLE} | Codex Cryptica"
  description={DESCRIPTION}
  canonicalUrl={buildAbsoluteUrl("/answers")}
  image={buildAbsoluteUrl("/og-image.png")}
  imageAlt={TITLE}
  jsonLd={[buildAnswerIndexJsonLd(answers)]}
/>

<div
  class="bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
    <header class="mb-10">
      <div class="mb-3 flex items-center gap-3">
        <p
          class="font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
        >
          Reference & Guidance
        </p>
        <span
          class="rounded-full border border-theme-border bg-theme-surface/70 px-2 py-0.5 font-mono text-[11px] text-theme-muted"
        >
          {answers.length} answers across {ANSWER_CATEGORIES.length} categories
        </span>
      </div>
      <h1
        class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        {TITLE}
      </h1>
      <p class="max-w-2xl text-lg leading-relaxed text-theme-muted">
        {DESCRIPTION} Each page answers one question directly, then explains the framework
        behind it with a concrete example.
      </p>
    </header>

    {#if !isSearchingOrFiltered && communityFavourites.length > 0}
      <CommunityFavourites favourites={communityFavourites} />
    {/if}

    <!-- Category Directory Grid -->
    <nav aria-label="Category directory" class="mb-10">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each ANSWER_CATEGORIES as category (category.id)}
          {@const count = getCategoryCount(category.id)}
          {@const isSelected = activeCategory === category.id}
          <button
            type="button"
            onclick={() => {
              if (activeCategory === category.id) {
                activeCategory = "all";
              } else {
                activeCategory = category.id;
              }
            }}
            class="group flex flex-col justify-between rounded-xl border p-4 text-left transition-all {isSelected
              ? 'border-theme-primary bg-theme-surface shadow-sm ring-1 ring-theme-primary/30'
              : 'border-theme-border/80 bg-theme-surface/50 hover:border-theme-primary/50 hover:bg-theme-surface/80'}"
            aria-pressed={isSelected}
          >
            <div>
              <div class="mb-2 flex items-center justify-between gap-2">
                <span
                  class="flex h-8 w-8 items-center justify-center rounded-lg {isSelected
                    ? 'bg-theme-primary text-theme-bg'
                    : 'bg-theme-primary/10 text-theme-primary group-hover:bg-theme-primary/20'} transition-colors"
                >
                  <span class="{category.icon} h-4 w-4" aria-hidden="true"
                  ></span>
                </span>
                <span
                  class="rounded-full border border-theme-border/60 bg-theme-surface px-2 py-0.5 font-mono text-[11px] text-theme-muted group-hover:text-theme-text"
                >
                  {count} answers
                </span>
              </div>
              <h2
                class="font-header text-base font-bold text-theme-text transition-colors group-hover:text-theme-primary"
              >
                {category.title}
              </h2>
              <p
                class="mt-1 line-clamp-2 text-xs leading-relaxed text-theme-muted"
              >
                {category.description}
              </p>
            </div>
            <div
              class="mt-3 flex items-center gap-1 font-mono text-[11px] font-medium {isSelected
                ? 'text-theme-primary'
                : 'text-theme-muted/70 group-hover:text-theme-primary'}"
            >
              <span>{isSelected ? "Active filter" : "Filter by category"}</span>
              <span
                class="icon-[lucide--arrow-right] h-3 w-3 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              ></span>
            </div>
          </button>
        {/each}
      </div>
    </nav>

    <!-- Search bar & Controls -->
    <div class="mb-10 space-y-4">
      <div class="relative">
        <span
          class="icon-[lucide--search] pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted"
          aria-hidden="true"
        ></span>
        <input
          id="answers-search"
          type="search"
          bind:value={searchQuery}
          placeholder="Search answers, topics, or keywords..."
          class="w-full rounded-lg border border-theme-border bg-theme-surface/70 py-3 pl-10 pr-10 text-sm text-theme-text placeholder:text-theme-muted transition-colors focus:border-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary"
          aria-label="Search answers"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={() => (searchQuery = "")}
            class="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[24px] min-h-[24px] p-1 text-theme-muted transition-colors hover:text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
            aria-label="Clear search"
          >
            <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
          </button>
        {/if}
      </div>

      <!-- Controls row: Category Filter Pills + Sort Dropdown -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <!-- Category Filter Pills -->
        <div
          class="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filter answers by category"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "all"}
            onclick={() => (activeCategory = "all")}
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-medium transition-colors {activeCategory ===
            'all'
              ? 'bg-theme-primary font-bold text-theme-bg'
              : 'border border-theme-border bg-theme-surface text-theme-muted hover:border-theme-primary/40 hover:text-theme-text'}"
          >
            <span>All</span>
            <span class="opacity-80">({answers.length})</span>
          </button>

          {#each ANSWER_CATEGORIES as category (category.id)}
            {@const count = getCategoryCount(category.id)}
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === category.id}
              onclick={() => (activeCategory = category.id)}
              class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-medium transition-colors {activeCategory ===
              category.id
                ? 'bg-theme-primary font-bold text-theme-bg'
                : 'border border-theme-border bg-theme-surface text-theme-muted hover:border-theme-primary/40 hover:text-theme-text'}"
            >
              <span class="{category.icon} h-3.5 w-3.5" aria-hidden="true"
              ></span>
              <span>{category.title}</span>
              <span class="opacity-80">({count})</span>
            </button>
          {/each}
        </div>

        <!-- Sort Selector -->
        <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <label
            for="answers-sort"
            class="flex items-center gap-1.5 font-mono text-xs text-theme-muted"
          >
            <span
              class="icon-[lucide--arrow-up-down] h-3.5 w-3.5 text-theme-primary"
              aria-hidden="true"
            ></span>
            <span>Sort:</span>
          </label>
          <select
            id="answers-sort"
            bind:value={sortBy}
            class="cursor-pointer rounded-lg border border-theme-border bg-theme-surface/70 px-3 py-1.5 font-mono text-xs text-theme-text transition-colors hover:border-theme-primary/40 focus:border-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary"
            aria-label="Sort answers"
          >
            {#each ANSWER_SORT_OPTIONS as option (option.id)}
              <option value={option.id}>{option.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- Format / Kind Filter Chips -->
      <div
        class="flex flex-wrap items-center gap-1.5 pt-1"
        aria-label="Filter answers by format"
      >
        <span
          class="mr-1 font-mono text-[11px] uppercase tracking-wider text-theme-muted"
        >
          Format:
        </span>
        {#each KIND_OPTIONS as kindOpt (kindOpt.id)}
          {@const count = getKindCount(kindOpt.id)}
          <button
            type="button"
            onclick={() => (activeKind = kindOpt.id)}
            class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] transition-colors {activeKind ===
            kindOpt.id
              ? 'bg-theme-primary/20 font-bold text-theme-primary ring-1 ring-theme-primary/40'
              : 'text-theme-muted hover:bg-theme-surface hover:text-theme-text'}"
            aria-pressed={activeKind === kindOpt.id}
          >
            <span>{kindOpt.label}</span>
            <span class="opacity-70">({count})</span>
          </button>
        {/each}
      </div>
    </div>

    {#snippet answerCard(answer: AnswerConfig, showCategory: boolean)}
      {@const cat = getCategoryInfo(answer.category)}
      <li class="group">
        <a
          href="{cleanBase}/answers/{answer.slug}"
          class="-mx-2 block rounded-lg px-2 py-4 transition-colors hover:bg-theme-surface/40"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="mb-1.5 flex flex-wrap items-center gap-2">
                <span
                  class="font-mono text-[11px] uppercase tracking-wider text-theme-primary"
                >
                  {KIND_LABEL[answer.kind] ?? answer.kind}
                </span>
                {#if showCategory && cat}
                  <span class="text-theme-muted/40">&bull;</span>
                  <span class="font-mono text-[11px] text-theme-muted">
                    {cat.title}
                  </span>
                {/if}
                {#if answer.publishedAt}
                  <span class="text-theme-muted/40">&bull;</span>
                  <time
                    datetime={answer.publishedAt}
                    class="font-mono text-[11px] text-theme-muted"
                  >
                    {formatAnswerDate(answer.publishedAt)}
                  </time>
                {/if}
              </div>
              <h3
                class="font-header text-lg font-bold text-theme-text transition-colors group-hover:text-theme-primary sm:text-xl"
              >
                {answer.question}
              </h3>
              <p
                class="mt-1.5 line-clamp-2 text-base leading-relaxed text-theme-muted"
              >
                {answer.shortAnswer}
              </p>
            </div>
            <span
              class="icon-[lucide--arrow-right] mt-2 h-4 w-4 shrink-0 text-theme-muted transition-all group-hover:translate-x-1 group-hover:text-theme-primary"
              aria-hidden="true"
            ></span>
          </div>
        </a>
      </li>
    {/snippet}

    <!-- Content Display -->
    {#if !isSearchingOrFiltered}
      <!-- Default Thematic Section View -->
      <div class="flex flex-col gap-14">
        {#each groupedSections as { category, answers: catAnswers } (category.id)}
          <section class="scroll-mt-8" id={category.id}>
            <div class="mb-4 border-b border-theme-border pb-3">
              <div class="mb-1 flex items-center justify-between gap-2.5">
                <div class="flex items-center gap-2.5 text-theme-primary">
                  <span class="{category.icon} h-5 w-5" aria-hidden="true"
                  ></span>
                  <h2
                    class="font-header text-xl font-bold tracking-tight text-theme-text sm:text-2xl"
                  >
                    {category.title}
                  </h2>
                  <span class="font-mono text-xs text-theme-muted"
                    >({catAnswers.length})</span
                  >
                </div>
                <a
                  href="#{category.id}"
                  class="text-xs font-mono text-theme-muted hover:text-theme-primary transition-colors opacity-0 hover:opacity-100 focus:opacity-100 sm:opacity-60"
                  aria-label="Link to {category.title} section"
                >
                  #
                </a>
              </div>
              <p class="text-base leading-relaxed text-theme-muted">
                {category.description}
              </p>
            </div>

            <ul class="flex list-none flex-col divide-y divide-theme-border/60">
              {#each catAnswers as answer (answer.slug)}
                {@render answerCard(answer, false)}
              {/each}
            </ul>

            <div class="mt-4 flex justify-end">
              <a
                href="#top"
                class="inline-flex items-center gap-1 font-mono text-[11px] text-theme-muted hover:text-theme-primary transition-colors"
              >
                <span class="icon-[lucide--arrow-up] h-3 w-3" aria-hidden="true"
                ></span>
                <span>Back to top</span>
              </a>
            </div>
          </section>
        {/each}
      </div>
    {:else if filteredAnswers.length > 0}
      <!-- Filtered Results View -->
      <div>
        <div
          class="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-theme-border pb-3"
        >
          <p class="font-mono text-xs text-theme-muted">
            Showing {filteredAnswers.length} of {answers.length} answers
            {#if activeCategory !== "all"}
              in <span class="text-theme-primary"
                >{ANSWER_CATEGORIES.find((c) => c.id === activeCategory)
                  ?.title}</span
              >
            {/if}
            {#if activeKind !== "all"}
              &bull; format: <span class="text-theme-primary"
                >{KIND_LABEL[activeKind] ?? activeKind}</span
              >
            {/if}
            {#if searchQuery}
              &bull; matching &ldquo;<span class="text-theme-text"
                >{searchQuery}</span
              >&rdquo;
            {/if}
            {#if sortBy !== DEFAULT_ANSWER_SORT}
              {@const currentSort = ANSWER_SORT_OPTIONS.find(
                (o) => o.id === sortBy,
              )}
              {#if currentSort}
                &bull; sorted by <span class="text-theme-primary"
                  >{currentSort.label.toLowerCase()}</span
                >
              {/if}
            {/if}
          </p>
          <button
            type="button"
            onclick={resetFilters}
            class="font-mono text-xs text-theme-primary underline underline-offset-2 hover:text-theme-primary/80"
          >
            Reset filters
          </button>
        </div>

        <ul class="flex list-none flex-col divide-y divide-theme-border/60">
          {#each filteredAnswers as answer (answer.slug)}
            {@render answerCard(answer, true)}
          {/each}
        </ul>
      </div>
    {:else}
      <!-- Empty State -->
      <div
        class="flex flex-col items-center justify-center rounded-xl border border-dashed border-theme-border bg-theme-surface/30 px-6 py-16 text-center"
      >
        <span
          class="icon-[lucide--search-x] mb-4 h-12 w-12 text-theme-muted/50"
          aria-hidden="true"
        ></span>
        <h2 class="font-header text-lg font-bold text-theme-text">
          No answers found
        </h2>
        <p class="mt-2 max-w-sm text-sm text-theme-muted">
          {#if searchQuery}
            No reference answers matched your search &ldquo;{searchQuery}&rdquo;.
          {:else}
            No reference answers matched your selected filter criteria.
          {/if}
          Try different keywords or reset your filters.
        </p>
        <button
          type="button"
          onclick={resetFilters}
          class="mt-6 inline-flex items-center gap-2 rounded-lg bg-theme-primary px-4 py-2 font-header text-xs font-bold text-theme-bg transition-colors hover:bg-theme-primary/90"
        >
          <span class="icon-[lucide--rotate-ccw] h-3.5 w-3.5" aria-hidden="true"
          ></span>
          Clear search & filters
        </button>
      </div>
    {/if}
  </div>
</div>
