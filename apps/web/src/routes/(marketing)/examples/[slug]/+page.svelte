<script lang="ts">
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import { examplePath } from "$lib/content/examples/registry";
  import {
    buildExampleJsonLd,
    buildExampleBreadcrumbJsonLd,
  } from "$lib/content/examples/json-ld";
  import { themeStore } from "$lib/stores/theme.svelte";
  import {
    trackDiscoveryPageViewed,
    classifyDiscoveryTarget,
    createDiscoveryViewGuard,
  } from "$lib/services/analytics/discovery-tracking";
  import { trackDiscoveryClick } from "$lib/actions/trackDiscoveryClick";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const cleanBase = base === "/" ? "" : base;

  let example = $derived(data.example);
  let related = $derived(data.related);
  let connected = $derived(data.connected);
  let canonical = $derived(buildAbsoluteUrl(examplePath(example)));
  let hasFurtherReading = $derived(
    example.relatedGenerators.length +
      example.relatedAnswers.length +
      example.relatedForPages.length +
      related.length >
      0,
  );

  // See discovery-tracking.ts: this route reuses one component instance
  // across /examples/a -> /examples/b navigations, so the guard (not just
  // onMount) is what keeps discovery_page_viewed to one fire per slug.
  const seenExample = createDiscoveryViewGuard();
  $effect(() => {
    if (!browser) return;
    const slug = example.slug;
    if (!seenExample(slug)) return;
    trackDiscoveryPageViewed({
      sourceKind: "example",
      sourceId: slug,
      path: examplePath(example),
    });
  });

  /**
   * Skin the page in the example's own world theme, so a cyberpunk settlement
   * is read in the cyberpunk palette rather than in whatever theme the visitor
   * picked up from the last hub they opened.
   *
   * This previews rather than sets: `previewTheme` is not persisted, so it
   * cannot overwrite a theme the visitor actually chose for their own vault.
   * The effect re-runs when `example.theme` changes (client-side navigation
   * between two examples) and clears the preview on the way out.
   */
  $effect(() => {
    themeStore.previewTheme(example.theme);
    return () => themeStore.previewTheme(null);
  });
</script>

<SeoHead
  title={example.seo.title}
  description={example.seo.description}
  canonicalUrl={canonical}
  image={example.image?.src ?? buildAbsoluteUrl("/og-image.png")}
  imageAlt={example.image?.alt ?? example.title}
  type="article"
  jsonLd={[buildExampleJsonLd(example), buildExampleBreadcrumbJsonLd(example)]}
/>

<div
  class="bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <article class="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
    <nav aria-label="Breadcrumb" class="mb-8">
      <a
        href="{cleanBase}/examples"
        class="inline-flex items-center gap-2 font-mono text-xs text-theme-muted transition-colors hover:text-theme-primary"
      >
        <span class="icon-[lucide--arrow-left] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        All examples
      </a>
    </nav>

    <div class="mb-8">
      <p
        class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
      >
        {example.genre} · {example.kind}
      </p>
      <h1
        class="mb-4 font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        {example.title}
      </h1>
      <p class="text-lg leading-relaxed text-theme-muted">{example.summary}</p>
    </div>

    {#if example.image}
      <img
        src={example.image.src}
        alt={example.image.alt}
        width="1200"
        height="675"
        loading="lazy"
        class="mb-8 w-full border border-theme-border"
      />
    {/if}

    <!-- Generation context: the settings behind the roll, never internal prompts. -->
    <section class="mb-8 border border-theme-border bg-theme-surface p-6">
      <h2
        class="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        How this was generated
      </h2>
      <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <div>
          <dt class="font-mono text-xs text-theme-muted">Generator</dt>
          <dd class="text-sm text-theme-text">
            <a
              href="{cleanBase}{example.generator.href}"
              class="underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
              use:trackDiscoveryClick={{
                sourceKind: "example",
                sourceId: example.slug,
                placement: "generation_context",
                ...classifyDiscoveryTarget(example.generator.href),
              }}>{example.generator.name}</a
            >
          </dd>
        </div>
        {#each example.context as fact (fact.label)}
          <div>
            <dt class="font-mono text-xs text-theme-muted">{fact.label}</dt>
            <dd class="text-sm text-theme-text">{fact.value}</dd>
          </div>
        {/each}
      </dl>
      <p
        class="mt-4 border-t border-theme-border pt-4 text-sm text-theme-muted"
      >
        {#if example.provenance === "raw"}
          The output below is reproduced exactly as generated. Nothing has been
          rewritten.
        {:else}
          {example.provenanceNote}
        {/if}
      </p>
    </section>

    {#if connected && example.connectedTo}
      <aside
        class="mb-8 border-l-2 border-theme-primary pl-5 text-base leading-relaxed text-theme-muted"
      >
        {example.connectedTo.note}
        <a
          href="{cleanBase}/examples/{connected.slug}"
          class="ml-1 font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
          use:trackDiscoveryClick={{
            sourceKind: "example",
            sourceId: example.slug,
            targetKind: "example",
            targetId: connected.slug,
            placement: "connected_example",
          }}>See {connected.name}</a
        >.
      </aside>
    {/if}

    <!-- The generated artefact: the substance of the page. -->
    <div class="mb-12">
      <h2 class="sr-only">Generated output</h2>
      {#each example.output as block, blockIndex (blockIndex)}
        <section class="mb-8">
          {#if block.kind === "prose"}
            {#if block.heading}
              <h3
                class="mb-3 font-header text-xl font-bold text-theme-text sm:text-2xl"
              >
                {block.heading}
              </h3>
            {/if}
            {#each block.paragraphs as paragraph}
              <p class="mb-4 leading-relaxed text-theme-muted last:mb-0">
                {paragraph}
              </p>
            {/each}
          {:else if block.kind === "list"}
            {#if block.heading}
              <h3
                class="mb-3 font-header text-xl font-bold text-theme-text sm:text-2xl"
              >
                {block.heading}
              </h3>
            {/if}
            {#if block.intro}
              <p class="mb-4 leading-relaxed text-theme-muted">{block.intro}</p>
            {/if}
            <ul class="flex list-none flex-col gap-3">
              {#each block.items as item}
                <li class="border-l border-theme-border pl-5">
                  {#if item.term}
                    <strong class="block font-header text-base text-theme-text"
                      >{item.term}</strong
                    >
                  {/if}
                  <span class="leading-relaxed text-theme-muted"
                    >{item.text}</span
                  >
                </li>
              {/each}
            </ul>
          {:else if block.kind === "facts"}
            <h3
              class="mb-3 font-header text-xl font-bold text-theme-text sm:text-2xl"
            >
              {block.heading}
            </h3>
            <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {#each block.facts as fact}
                <div>
                  <dt class="font-mono text-xs text-theme-muted">
                    {fact.label}
                  </dt>
                  <dd class="text-sm text-theme-text">{fact.value}</dd>
                </div>
              {/each}
            </dl>
          {/if}
        </section>
      {/each}
    </div>

    <!-- Editorial reading: what makes this useful, not praise for the tool. -->
    <section class="mb-12 border-t border-theme-border pt-8">
      <h2
        class="mb-4 font-header text-xl font-bold text-theme-text sm:text-2xl"
      >
        {example.annotation.heading}
      </h2>
      {#each example.annotation.paragraphs as paragraph}
        <p class="mb-4 leading-relaxed text-theme-muted">{paragraph}</p>
      {/each}
      <a
        href="{cleanBase}{example.generator.href}"
        class="mt-2 inline-flex items-center gap-2 bg-theme-primary px-6 py-3 font-header text-sm font-bold text-theme-bg transition-colors hover:bg-theme-primary/90"
        use:trackDiscoveryClick={{
          sourceKind: "example",
          sourceId: example.slug,
          placement: "section_cta",
          ...classifyDiscoveryTarget(example.generator.href),
        }}
      >
        Roll your own with the {example.generator.name.toLowerCase()}
        <span class="icon-[lucide--arrow-right] h-4 w-4" aria-hidden="true"
        ></span>
      </a>
    </section>

    {#if hasFurtherReading}
      <section class="border-t border-theme-border pt-8">
        <h2 class="mb-6 font-header text-xl font-bold text-theme-text">
          Related
        </h2>

        {#each [{ label: "Generators", placement: "related_tool", links: example.relatedGenerators }, { label: "Answers", placement: "related_answer", links: example.relatedAnswers }, { label: "Guides", placement: "related_guide", links: example.relatedForPages }] as group (group.label)}
          {#if group.links.length > 0}
            <h3
              class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
            >
              {group.label}
            </h3>
            <ul class="mb-8 grid list-none gap-4 sm:grid-cols-2">
              {#each group.links as link (link.href)}
                <li>
                  <a
                    href="{cleanBase}{link.href}"
                    class="group block h-full border border-theme-border bg-theme-surface p-4 transition-colors hover:border-theme-primary/50"
                    use:trackDiscoveryClick={{
                      sourceKind: "example",
                      sourceId: example.slug,
                      placement: group.placement,
                      ...classifyDiscoveryTarget(link.href),
                    }}
                  >
                    <span
                      class="block font-header text-sm font-bold text-theme-text transition-colors group-hover:text-theme-primary"
                      >{link.title}</span
                    >
                    <span
                      class="mt-1 block text-base leading-relaxed text-theme-muted"
                      >{link.description}</span
                    >
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        {/each}

        {#if related.length > 0}
          <h3
            class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
          >
            Other examples
          </h3>
          <ul class="flex list-none flex-col gap-3">
            {#each related as other (other.slug)}
              <li>
                <a
                  href="{cleanBase}/examples/{other.slug}"
                  class="group flex items-start gap-3 text-theme-text transition-colors hover:text-theme-primary"
                  use:trackDiscoveryClick={{
                    sourceKind: "example",
                    sourceId: example.slug,
                    targetKind: "example",
                    targetId: other.slug,
                    placement: "related_example",
                  }}
                >
                  <span
                    class="icon-[lucide--corner-down-right] mt-1 h-4 w-4 shrink-0 text-theme-primary"
                    aria-hidden="true"
                  ></span>
                  <span class="font-header text-sm font-bold"
                    >{other.title}</span
                  >
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}

    {#if example.sourceUrl}
      <footer class="mt-12 border-t border-theme-border pt-6">
        <p class="font-mono text-xs leading-relaxed text-theme-muted">
          First published in the Codex Cryptica showcase series.
          <a
            href={example.sourceUrl}
            rel="noopener noreferrer"
            class="underline underline-offset-4 transition-colors hover:text-theme-primary"
            >View the original discussion</a
          >.
        </p>
      </footer>
    {/if}
  </article>
</div>
