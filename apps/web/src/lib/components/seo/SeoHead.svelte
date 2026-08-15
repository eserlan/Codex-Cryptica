<script lang="ts">
  import { base } from "$app/paths";
  import { buildAbsoluteUrl, getRobotsDirective } from "$lib/seo/site";

  interface Props {
    title: string;
    description: string;
    canonicalUrl?: string;
    image?: string;
    imageAlt?: string;
    imageWidth?: string | number;
    imageHeight?: string | number;
    type?: "website" | "article";
    keywords?: string[];
    publishedTime?: string;
    author?: string;
    twitterCard?: "summary_large_image" | "summary";
    robots?: string;
    jsonLd?: string | (string | null | undefined)[];
  }

  let {
    title,
    description,
    canonicalUrl,
    image,
    imageAlt,
    imageWidth = 1600,
    imageHeight = 1000,
    type = "website",
    keywords = [],
    publishedTime,
    author,
    twitterCard = "summary_large_image",
    robots = getRobotsDirective(),
    jsonLd = [],
  }: Props = $props();

  const cleanBase = $derived(base.replace(/\/+$/, ""));
  const resolvedCanonicalUrl = $derived(
    canonicalUrl
      ? canonicalUrl.startsWith("http://") ||
        canonicalUrl.startsWith("https://")
        ? canonicalUrl
        : buildAbsoluteUrl(canonicalUrl)
      : undefined,
  );
  const jsonLdSnippets = $derived(
    Array.isArray(jsonLd)
      ? jsonLd.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : typeof jsonLd === "string" && jsonLd.trim().length > 0
        ? [jsonLd]
        : [],
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if keywords && keywords.length > 0}
    <meta name="keywords" content={keywords.join(", ")} />
  {/if}
  {#if robots}
    <meta name="robots" content={robots} />
  {/if}
  {#if resolvedCanonicalUrl}
    <link rel="canonical" href={resolvedCanonicalUrl} />
  {/if}

  <!-- Open Graph -->
  <meta property="og:type" content={type} />
  <meta property="og:site_name" content="Codex Cryptica" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  {#if resolvedCanonicalUrl}
    <meta property="og:url" content={resolvedCanonicalUrl} />
  {/if}
  {#if image}
    <meta property="og:image" content={image} />
    {#if imageAlt}
      <meta property="og:image:alt" content={imageAlt} />
    {/if}
    {#if imageWidth}
      <meta property="og:image:width" content={String(imageWidth)} />
    {/if}
    {#if imageHeight}
      <meta property="og:image:height" content={String(imageHeight)} />
    {/if}
  {/if}

  {#if type === "article"}
    {#if publishedTime}
      <meta property="article:published_time" content={publishedTime} />
    {/if}
    {#if author}
      <meta property="article:author" content={author} />
    {/if}
  {/if}

  <!-- Twitter Card -->
  <meta name="twitter:card" content={twitterCard} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  {#if image}
    <meta name="twitter:image" content={image} />
    {#if imageAlt}
      <meta name="twitter:image:alt" content={imageAlt} />
    {/if}
  {/if}

  <link rel="help" href="{cleanBase}/llms.txt" />

  {#each jsonLdSnippets as snippet}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html `<scr` + `ipt type="application/ld+json">${snippet}</scr` + `ipt>`}
  {/each}
</svelte:head>
