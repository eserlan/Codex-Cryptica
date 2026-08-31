<script lang="ts">
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import { buildAnswerIndexJsonLd } from "$lib/content/answers/json-ld";
  import {
    ANSWER_CATEGORIES,
    getAnswerCategory,
    groupAnswersByCategory,
  } from "$lib/content/answers/categories";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const cleanBase = base === "/" ? "" : base;

  const TITLE = "RPG and worldbuilding answers";
  const DESCRIPTION =
    "Short, practical answers to questions that come up while running and building tabletop campaigns — point crawls, factions, pantheons, encounters, notes and more.";

  let answers = $derived(data.answers);

  let searchQuery = $state("");
  let activeCategory = $state<string | "all">("all");

  const KIND_LABEL: Record<string, string> = {
    definition: "Definition",
    "how-to": "How to",
    framework: "Framework",
    comparison: "Comparison",
  };

  function getCategoryCount(categoryId: string): number {
    if (categoryId === "all") return answers.length;
    const cat = ANSWER_CATEGORIES.find((c) => c.id === categoryId);
    return cat
      ? cat.slugs.filter((s) => answers.some((a) => a.slug === s)).length
      : 0;
  }

  let filteredAnswers = $derived.by(() => {
    const query = searchQuery.trim().toLowerCase();

    return answers.filter((answer) => {
      // Check category filter
      if (activeCategory !== "all") {
        const cat = getAnswerCategory(answer.slug);
        if (cat?.id !== activeCategory) return false;
      }

      // Check search query
      if (!query) return true;

      const questionMatch = answer.question.toLowerCase().includes(query);
      const shortAnswerMatch = answer.shortAnswer.toLowerCase().includes(query);
      const kindMatch = (KIND_LABEL[answer.kind] ?? answer.kind)
        .toLowerCase()
        .includes(query);
      const cat = getAnswerCategory(answer.slug);
      const categoryMatch = cat
        ? cat.title.toLowerCase().includes(query)
        : false;

      return questionMatch || shortAnswerMatch || kindMatch || categoryMatch;
    });
  });

  let groupedSections = $derived(groupAnswersByCategory(answers));

  let isSearchingOrFiltered = $derived(
    searchQuery.trim().length > 0 || activeCategory !== "all",
  );

  function resetFilters() {
    searchQuery = "";
    activeCategory = "all";
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
      <p
        class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        Reference & Guidance
      </p>
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

    <!-- Search bar & Category filters -->
    <div class="mb-12 space-y-4">
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
            class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-theme-muted transition-colors hover:text-theme-text"
            aria-label="Clear search"
          >
            <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
          </button>
        {/if}
      </div>

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
          class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-medium transition-colors {activeCategory ===
          'all'
            ? 'bg-theme-primary font-bold text-theme-bg'
            : 'border border-theme-border bg-theme-surface text-theme-muted hover:border-theme-primary/40 hover:text-theme-text'}"
        >
          <span>All</span>
          <span class="opacity-70">({answers.length})</span>
        </button>

        {#each ANSWER_CATEGORIES as category (category.id)}
          {@const count = getCategoryCount(category.id)}
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === category.id}
            onclick={() => (activeCategory = category.id)}
            class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-medium transition-colors {activeCategory ===
            category.id
              ? 'bg-theme-primary font-bold text-theme-bg'
              : 'border border-theme-border bg-theme-surface text-theme-muted hover:border-theme-primary/40 hover:text-theme-text'}"
          >
            <span class="{category.icon} h-3.5 w-3.5" aria-hidden="true"></span>
            <span>{category.title}</span>
            <span class="opacity-70">({count})</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Content Display -->
    {#if !isSearchingOrFiltered}
      <!-- Default Thematic Section View -->
      <div class="flex flex-col gap-14">
        {#each groupedSections as { category, answers: catAnswers } (category.id)}
          <section class="scroll-mt-8" id={category.id}>
            <div class="mb-4 border-b border-theme-border pb-3">
              <div class="mb-1 flex items-center gap-2.5 text-theme-primary">
                <span class="{category.icon} h-5 w-5" aria-hidden="true"></span>
                <h2
                  class="font-header text-xl font-bold tracking-tight text-theme-text sm:text-2xl"
                >
                  {category.title}
                </h2>
                <span class="font-mono text-xs text-theme-muted"
                  >({catAnswers.length})</span
                >
              </div>
              <p class="text-sm leading-relaxed text-theme-muted">
                {category.description}
              </p>
            </div>

            <ul class="flex list-none flex-col divide-y divide-theme-border/60">
              {#each catAnswers as answer (answer.slug)}
                <li class="group">
                  <a
                    href="{cleanBase}/answers/{answer.slug}"
                    class="-mx-2 block rounded-lg px-2 py-4 transition-colors hover:bg-theme-surface/40"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex-1">
                        <div class="mb-1.5 flex items-center gap-2">
                          <span
                            class="font-mono text-[11px] uppercase tracking-wider text-theme-primary"
                          >
                            {KIND_LABEL[answer.kind] ?? answer.kind}
                          </span>
                        </div>
                        <h3
                          class="font-header text-lg font-bold text-theme-text transition-colors group-hover:text-theme-primary sm:text-xl"
                        >
                          {answer.question}
                        </h3>
                        <p
                          class="mt-1.5 line-clamp-2 text-sm leading-relaxed text-theme-muted"
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
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    {:else if filteredAnswers.length > 0}
      <!-- Filtered Results View -->
      <div>
        <div
          class="mb-6 flex items-center justify-between border-b border-theme-border pb-3"
        >
          <p class="font-mono text-xs text-theme-muted">
            Showing {filteredAnswers.length} of {answers.length} answers
            {#if activeCategory !== "all"}
              in <span class="text-theme-primary"
                >{ANSWER_CATEGORIES.find((c) => c.id === activeCategory)
                  ?.title}</span
              >
            {/if}
            {#if searchQuery}
              matching &ldquo;<span class="text-theme-text">{searchQuery}</span
              >&rdquo;
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
            {@const cat = getAnswerCategory(answer.slug)}
            <li class="group">
              <a
                href="{cleanBase}/answers/{answer.slug}"
                class="-mx-2 block rounded-lg px-2 py-4 transition-colors hover:bg-theme-surface/40"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="mb-1.5 flex items-center gap-2">
                      <span
                        class="font-mono text-[11px] uppercase tracking-wider text-theme-primary"
                      >
                        {KIND_LABEL[answer.kind] ?? answer.kind}
                      </span>
                      {#if cat}
                        <span class="text-theme-muted/40">&bull;</span>
                        <span class="font-mono text-[11px] text-theme-muted">
                          {cat.title}
                        </span>
                      {/if}
                    </div>
                    <h2
                      class="font-header text-lg font-bold text-theme-text transition-colors group-hover:text-theme-primary sm:text-xl"
                    >
                      {answer.question}
                    </h2>
                    <p
                      class="mt-1.5 line-clamp-2 text-sm leading-relaxed text-theme-muted"
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
          No reference answers matched your search &ldquo;{searchQuery}&rdquo;.
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
