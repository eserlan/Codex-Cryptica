<script lang="ts">
  import {
    groupPublicLabelResults,
    type PublicContentKind,
    type PublicLabelResult,
  } from "$lib/content/labels/aggregate";

  let {
    label,
    results,
    cleanBase,
  }: {
    label: string;
    results: PublicLabelResult[];
    cleanBase: string;
  } = $props();

  const KIND_LABEL: Record<PublicContentKind, string> = {
    topic: "Topic Hubs",
    answer: "Answers",
    for: "Campaign Guides",
    example: "Examples",
    generator: "Generators",
    world: "Public Worlds",
  };

  const groups = $derived(groupPublicLabelResults(results));
</script>

{#if results.length === 0}
  <div
    class="mb-14 rounded border border-theme-border bg-theme-surface/40 px-6 py-10 text-center text-sm text-theme-text/70"
  >
    Nothing is tagged <strong>#{label}</strong> yet. Try browsing
    <a href="{cleanBase}/explore" class="text-theme-primary hover:underline"
      >all of Explore</a
    > instead.
  </div>
{:else}
  {#each [...groups.entries()] as [kind, group] (kind)}
    <section class="mb-14">
      <div class="mb-6 border-b border-theme-border/60 pb-3">
        <h2 class="font-header text-xl font-bold text-theme-text sm:text-2xl">
          {KIND_LABEL[kind]}
        </h2>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        {#each group as result (result.href)}
          <a
            href={result.href.startsWith("/")
              ? `${cleanBase}${result.href}`
              : result.href}
            class="group flex flex-col gap-1 rounded-xl border border-theme-border bg-theme-surface p-4 shadow-sm transition-all hover:border-theme-primary/50 hover:shadow-md"
          >
            <span
              class="font-header text-sm font-bold text-theme-text group-hover:text-theme-primary"
            >
              {result.title}
            </span>
            <span class="text-sm text-theme-muted">{result.summary}</span>
          </a>
        {/each}
      </div>
    </section>
  {/each}
{/if}
