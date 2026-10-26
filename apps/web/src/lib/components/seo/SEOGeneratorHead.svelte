<script lang="ts">
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import {
    buildBreadcrumbJsonLd,
    buildFaqJsonLd,
    buildResultJsonLd,
    buildSoftwareApplicationJsonLd,
  } from "./generator-json-ld";
  import SeoHead from "./SeoHead.svelte";

  const DEFAULT_OG_IMAGE =
    "https://assets.codexcryptica.com/screenshots/feature-connect.jpg";
  const DEFAULT_OG_IMAGE_ALT =
    "A Codex Cryptica campaign vault showing an entity graph beside an open character record";

  interface Props {
    title: string;
    description: string;
    introTitle: string;
    canonicalPath?: string;
    image?: string;
    imageAlt?: string;
    keywords?: string[];
    faqs?: { question: string; answer: string }[];
    generatedData: GeneratorOutput | null;
  }

  let {
    title,
    description,
    introTitle,
    canonicalPath,
    image = DEFAULT_OG_IMAGE,
    imageAlt,
    keywords = [],
    faqs = [],
    generatedData,
  }: Props = $props();

  const resolvedImageAlt = $derived(
    imageAlt ?? (image === DEFAULT_OG_IMAGE ? DEFAULT_OG_IMAGE_ALT : undefined),
  );
  const jsonLd = $derived([
    buildSoftwareApplicationJsonLd({
      canonicalPath,
      metaDescription: description,
    }),
    buildBreadcrumbJsonLd({ canonicalPath, introTitle }),
    buildFaqJsonLd(faqs),
    buildResultJsonLd(generatedData),
  ]);
</script>

<SeoHead
  {title}
  {description}
  canonicalUrl={canonicalPath ? buildAbsoluteUrl(canonicalPath) : undefined}
  {image}
  imageAlt={resolvedImageAlt}
  {keywords}
  {jsonLd}
/>
