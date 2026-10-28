<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import type { ThemeSlug } from "./+page";
  import type { ThemeConfig } from "./theme-config";
  import {
    hubOrigin as origin,
    hubCanonicalUrl,
    hubStructuredData,
  } from "./theme-hub-metadata";
  const cleanBase = basePath();
  let { theme, config }: { theme: ThemeSlug; config: ThemeConfig } = $props();
  const canonicalUrl = $derived(hubCanonicalUrl(theme));
  const structuredData = $derived(hubStructuredData(theme, config));
</script>

<svelte:head>
  <title>{config.metaTitle}</title>
  <meta name="description" content={config.metaDescription} />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href={canonicalUrl} />
  <link rel="help" href="{cleanBase}/llms.txt" />
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Codex Cryptica" />
  <meta property="og:title" content={config.metaTitle} />
  <meta property="og:description" content={config.metaDescription} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content="{origin}/logo.png" />
  <meta property="og:image:width" content="1024" />
  <meta property="og:image:height" content="1024" />
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={config.metaTitle} />
  <meta name="twitter:description" content={config.metaDescription} />
  <meta name="twitter:image" content="{origin}/logo.png" />
  {#each structuredData as jsonLd}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html `<scr` + `ipt type="application/ld+json">${jsonLd}</scr` + `ipt>`}
  {/each}
</svelte:head>
