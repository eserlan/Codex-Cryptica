<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import SeoHead from "#lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "#lib/seo/site.js";
  import {
    buildTopicDirectoryJsonLd,
    buildTopicDirectoryBreadcrumbJsonLd,
  } from "#lib/content/topics/directory-json-ld.js";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const cleanBase = basePath();

  const TITLE = "Topics";
  const DESCRIPTION =
    "Browse every Codex Cryptica topic hub: heists, puzzles, pirates, solo play and D&D, each with guides, worked examples and generators.";

  let topics = $derived(data.topics);
</script>

<SeoHead
  title="{TITLE} | Codex Cryptica"
  description={DESCRIPTION}
  canonicalUrl={buildAbsoluteUrl("/topics")}
  jsonLd={[
    buildTopicDirectoryJsonLd(topics, DESCRIPTION),
    buildTopicDirectoryBreadcrumbJsonLd(),
  ]}
/>

<div
  class="bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
    <div class="mb-12 max-w-2xl">
      <h1
        class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        {TITLE}
      </h1>
      <p class="text-lg leading-relaxed text-theme-text">
        Each topic gathers guides, worked examples and generators for one kind
        of campaign.
      </p>
      <a
        href="{cleanBase}/explore"
        class="mt-4 inline-flex min-h-[24px] items-center gap-2 py-1 font-mono text-xs text-theme-text transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
      >
        <span class="icon-[lucide--arrow-left] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Explore the whole site
      </a>
    </div>

    <ul class="grid list-none gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {#each topics as topic (topic.href)}
        <li>
          <a
            href="{cleanBase}{topic.href}"
            class="group flex h-full flex-col gap-3 border border-theme-text bg-theme-surface p-5 transition-colors hover:border-theme-primary/50"
          >
            <span
              class="{topic.icon} h-6 w-6 text-theme-text"
              aria-hidden="true"
            ></span>
            <h2
              class="font-header text-lg font-bold text-theme-text transition-colors group-hover:text-theme-primary"
            >
              {topic.title}
            </h2>
            <p class="text-base leading-relaxed text-theme-text">
              {topic.summary}
            </p>
          </a>
        </li>
      {/each}
    </ul>
  </div>
</div>
