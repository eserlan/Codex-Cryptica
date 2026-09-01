<script lang="ts">
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import { buildExampleIndexJsonLd } from "$lib/content/examples/json-ld";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const cleanBase = base === "/" ? "" : base;

  const TITLE = "Generator examples";
  const DESCRIPTION =
    "Curated, unedited output from the Codex Cryptica generators — settlements, factions and encounters you can read in full and take straight to the table.";
  const SEO_IMAGE =
    "https://assets.codexcryptica.com/announcements/ship-cinder-wren.jpg";
  const SEO_IMAGE_ALT =
    "The Cinder Wren, a space-western ship generated with Codex Cryptica";

  let examples = $derived(data.examples);
</script>

<SeoHead
  title="{TITLE} | Codex Cryptica"
  description={DESCRIPTION}
  canonicalUrl={buildAbsoluteUrl("/examples")}
  image={SEO_IMAGE}
  imageAlt={SEO_IMAGE_ALT}
  imageWidth={1376}
  imageHeight={768}
  jsonLd={[buildExampleIndexJsonLd(examples)]}
/>

<div
  class="bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
    <div class="mb-12 max-w-2xl">
      <h1
        class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        {TITLE}
      </h1>
      <p class="text-lg leading-relaxed text-theme-muted">
        {DESCRIPTION} Each page shows the full output, the settings that produced
        it, and a short note on what makes it usable.
      </p>
    </div>

    <ul class="grid list-none gap-6 sm:grid-cols-2">
      {#each examples as example (example.slug)}
        <li>
          <a
            href="{cleanBase}/examples/{example.slug}"
            class="group flex h-full flex-col overflow-hidden border border-theme-border bg-theme-surface transition-colors hover:border-theme-primary/50"
          >
            {#if example.image}
              <img
                src={example.image.src}
                alt={example.image.alt}
                width="1200"
                height="675"
                loading="lazy"
                class="aspect-video w-full object-cover"
              />
            {/if}
            <div class="flex flex-1 flex-col p-5">
              <p
                class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
              >
                {example.genre} · {example.kind}
              </p>
              <h2
                class="font-header text-lg font-bold text-theme-text transition-colors group-hover:text-theme-primary"
              >
                {example.name}
              </h2>
              <p
                class="mt-2 line-clamp-3 text-sm leading-relaxed text-theme-muted"
              >
                {example.summary}
              </p>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  </div>
</div>
