<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { invalidateAll } from "$app/navigation";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import ExploreLabelResults from "$lib/components/explore/ExploreLabelResults.svelte";
  import ExploreSectionList from "$lib/components/explore/ExploreSectionList.svelte";
  import { EXPLORE_SECTIONS } from "$lib/components/explore/explore-sections";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { HUB_SLUG_TO_THEME_ID } from "$lib/components/seo/generator-theme-maps";
  import { isPublicLabel } from "$lib/content/labels";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // A label that is one of the site's genre/system hubs (cyberpunk, vampire,
  // western, …) gets that hub's actual visual theme rather than the neutral
  // default — the same mapping /generators/[hub] and /for/[slug] already use.
  // `isPublicLabel` checks membership in a fixed array rather than indexing
  // `HUB_SLUG_TO_THEME_ID` with the raw query string, so a label like
  // `?label=__proto__` or `?label=constructor` can't reach an inherited
  // Object.prototype property instead of `undefined`.
  const labelThemeId = $derived(
    data.label && isPublicLabel(data.label)
      ? (HUB_SLUG_TO_THEME_ID[data.label] ?? null)
      : null,
  );
  const themeBootstrap = $derived.by(() => {
    if (!labelThemeId) return "";
    const serializedTheme = JSON.stringify(labelThemeId).replaceAll(
      "<",
      "\\u003C",
    );
    return (
      "<" +
      "script>window.__codexApplyTheme && window.__codexApplyTheme(" +
      serializedTheme +
      ");</" +
      "script>"
    );
  });

  // Always assign, never only when a theme exists: this component is reused
  // across /explore?label=a -> /explore?label=b navigations, so a themed
  // label's palette must not linger once the visitor picks another label.
  $effect(() => {
    themeStore.previewTheme(labelThemeId);
  });

  // On direct entry to /explore?label=... (hard navigation), SvelteKit serves
  // the statically prerendered base shell. Invalidate once mounted if the URL
  // carries a label filter that load() couldn't evaluate during prerendering.
  onMount(() => {
    const queryLabel = page.url.searchParams.get("label")?.trim();
    if (queryLabel && queryLabel !== data.label) {
      void invalidateAll();
    }
  });

  onDestroy(() => {
    themeStore.previewTheme(null);
  });

  const cleanBase = base === "/" ? "" : base;

  const TITLE = "Explore Codex Cryptica";
  const DESCRIPTION =
    "Every section of Codex Cryptica in one place: features, worlds, examples, generators, tools, guides, and the campaign directory.";

  // A hand-picked label link is a genuine, indexable /explore destination.
  // A ?label= filter view is dynamic and thin by construction, so it stays
  // out of the crawl graph (mirrors /worlds's own dynamic/unindexed status).
  const isLabelView = $derived(Boolean(data.label));
</script>

<svelte:head>
  {#if themeBootstrap}
    <!-- Apply the label's theme before the body is parsed to avoid a first-paint flash. -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html themeBootstrap}
  {/if}
</svelte:head>

<SeoHead
  title={isLabelView
    ? `#${data.label} on Codex Cryptica | Explore`
    : `${TITLE} | Codex Cryptica`}
  description={isLabelView
    ? `Public Codex Cryptica content tagged #${data.label}: worlds, answers, guides, examples, and generators.`
    : DESCRIPTION}
  canonicalUrl={buildAbsoluteUrl("/explore")}
  image="https://assets.codexcryptica.com/screenshots/feature-connect.jpg"
  imageAlt="Explore Codex Cryptica's connected campaign-building tools"
  imageWidth={1600}
  imageHeight={1000}
  robots={isLabelView ? "noindex, follow" : undefined}
/>

<div
  class="bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
    <div class="mb-12 max-w-2xl">
      {#if isLabelView}
        <a
          href="{cleanBase}/explore"
          class="mb-4 inline-flex items-center gap-2 py-1 font-mono text-xs text-theme-muted transition-colors hover:text-theme-primary"
        >
          <span class="icon-[lucide--arrow-left] h-3.5 w-3.5" aria-hidden="true"
          ></span>
          All of Explore
        </a>
        <h1
          class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
        >
          #{data.label}
        </h1>
        <p class="text-lg leading-relaxed text-theme-muted">
          Public Codex Cryptica content tagged <strong>#{data.label}</strong>.
        </p>
      {:else}
        <h1
          class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
        >
          {TITLE}
        </h1>
        <p class="text-lg leading-relaxed text-theme-muted">
          {DESCRIPTION}
        </p>
      {/if}
    </div>

    {#if isLabelView}
      <ExploreLabelResults
        label={data.label}
        results={data.results}
        {cleanBase}
      />
    {:else}
      <ExploreSectionList sections={EXPLORE_SECTIONS} {cleanBase} />
    {/if}

    <div class="flex justify-center">
      <a
        href="https://groupfinder.gg/library/codex-cryptica"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center opacity-80 transition-opacity hover:opacity-100"
        aria-label="Codex Cryptica on Groupfinder"
      >
        <img
          src="https://groupfinder.gg/images/badges/gf-badge-light.svg"
          alt="Codex Cryptica on Groupfinder"
          width="164"
          height="45"
          loading="lazy"
          class="h-8 w-auto"
        />
      </a>
    </div>
  </div>
</div>
