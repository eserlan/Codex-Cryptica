<script lang="ts">
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import { buildAnswerIndexJsonLd } from "$lib/content/answers/json-ld";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const cleanBase = base === "/" ? "" : base;

  const TITLE = "RPG and worldbuilding answers";
  const DESCRIPTION =
    "Short, practical answers to questions that come up while running and building tabletop campaigns — point crawls, factions, pantheons, encounters, notes and more.";

  let answers = $derived(data.answers);
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
    <header class="mb-12">
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

    <ul class="flex list-none flex-col">
      {#each answers as answer (answer.slug)}
        <li class="border-t border-theme-border last:border-b">
          <a
            href="{cleanBase}/answers/{answer.slug}"
            class="group block py-6 transition-colors hover:bg-theme-surface/40"
          >
            <h2
              class="font-header text-xl font-bold text-theme-text transition-colors group-hover:text-theme-primary"
            >
              {answer.question}
            </h2>
            <p class="mt-2 line-clamp-3 leading-relaxed text-theme-muted">
              {answer.shortAnswer}
            </p>
          </a>
        </li>
      {/each}
    </ul>
  </div>
</div>
