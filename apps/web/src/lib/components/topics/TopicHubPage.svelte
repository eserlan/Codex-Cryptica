<script lang="ts">
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import PublicLabelChip from "$lib/components/labels/PublicLabelChip.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import type { TopicHubConfig } from "$lib/content/topics/types";
  import {
    buildTopicJsonLd,
    buildTopicBreadcrumbJsonLd,
  } from "$lib/content/topics/json-ld";
  import {
    trackDiscoveryPageViewed,
    classifyDiscoveryTarget,
    createDiscoveryViewGuard,
  } from "$lib/services/analytics/discovery-tracking";
  import { trackDiscoveryClick } from "$lib/actions/trackDiscoveryClick";

  let { config }: { config: TopicHubConfig } = $props();

  // A bare "/" base would make every link protocol-relative ("//answers/...").
  const cleanBase = base === "/" ? "" : base;

  const canonical = $derived(buildAbsoluteUrl(config.canonicalPath));

  const seenTopic = createDiscoveryViewGuard();
  $effect(() => {
    if (!browser) return;
    if (!seenTopic(config.slug)) return;
    trackDiscoveryPageViewed({
      sourceKind: "topic",
      sourceId: config.slug,
      path: config.canonicalPath,
    });
  });
</script>

<SeoHead
  title={config.metaTitle}
  description={config.description}
  canonicalUrl={canonical}
  image={config.ogImage}
  imageAlt={config.ogImageAlt}
  imageWidth={config.heroImage?.width}
  imageHeight={config.heroImage?.height}
  type="website"
  jsonLd={[buildTopicJsonLd(config), buildTopicBreadcrumbJsonLd(config)]}
/>

<div
  class="bg-theme-bg font-body text-theme-text selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <article
    class="mx-auto max-w-2xl break-words px-4 py-12 text-lg leading-relaxed sm:px-6 sm:py-20"
  >
    <nav aria-label="Breadcrumb" class="mb-8">
      <a
        href="{cleanBase}/explore"
        class="inline-flex min-h-[24px] items-center gap-2 py-1 font-mono text-xs text-theme-muted transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
      >
        <span class="icon-[lucide--arrow-left] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Explore all topics
      </a>
    </nav>

    <header class="mb-10">
      <p
        class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
      >
        Topic Hub
      </p>
      <h1
        class="font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        {config.title}
      </h1>
      <div class="mt-4 flex flex-wrap gap-2">
        <PublicLabelChip label={config.label} />
      </div>
      <p class="mt-6 leading-relaxed text-theme-muted">
        {config.leadParagraph}
      </p>
    </header>

    {#if config.heroImage}
      <figure class="mb-12">
        <img
          src={config.heroImage.src}
          alt={config.heroImage.alt}
          width={config.heroImage.width}
          height={config.heroImage.height}
          loading="eager"
          decoding="async"
          class="w-full border border-theme-border shadow-sm"
        />
        {#if config.heroImage.caption}
          <figcaption class="mt-2 font-mono text-xs text-theme-muted">
            {config.heroImage.caption}
          </figcaption>
        {/if}
      </figure>
    {/if}

    <!-- Standalone explanatory copy: the ideas that make this topic play differently. -->
    <section class="mb-12" aria-labelledby="{config.slug}-thesis">
      <h2
        id="{config.slug}-thesis"
        class="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        {config.copy.thesisHeading}
      </h2>
      <div class="flex flex-col gap-4">
        {#each config.thesisPoints as point (point.title)}
          <div class="border-l border-theme-border pl-5">
            <h3 class="font-header text-base font-bold text-theme-text">
              {point.title}
            </h3>
            <p class="mt-1 leading-relaxed text-theme-muted">{point.summary}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- Learn: the strongest Answers and guides. -->
    <section class="mb-12" aria-labelledby="{config.slug}-learn">
      <h2
        id="{config.slug}-learn"
        class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        {config.copy.learnHeading}
      </h2>
      <p class="mb-6 leading-relaxed text-theme-muted">
        {config.copy.learnIntro}
      </p>
      <ul class="flex list-none flex-col gap-4">
        {#each config.coreGuides as guide (guide.href)}
          <li class="border border-theme-border bg-theme-surface p-6">
            <p
              class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
            >
              {guide.focus}
            </p>
            <a
              href="{cleanBase}{guide.href}"
              class="font-header text-xl font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
              use:trackDiscoveryClick={{
                sourceKind: "topic",
                sourceId: config.slug,
                placement: "topic_learn",
                ...classifyDiscoveryTarget(guide.href),
              }}>{guide.title}</a
            >
            <p class="mt-2 text-base leading-relaxed text-theme-muted">
              {guide.description}
            </p>
          </li>
        {/each}
      </ul>
    </section>

    <!-- Examples: worked scores across genres. -->
    <section class="mb-12" aria-labelledby="{config.slug}-examples">
      <h2
        id="{config.slug}-examples"
        class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        {config.copy.examplesHeading}
      </h2>
      <p class="mb-6 leading-relaxed text-theme-muted">
        {config.copy.examplesIntro}
      </p>
      <ul class="flex list-none flex-col gap-4">
        {#each config.workedExamples as example (example.href)}
          <li class="border border-theme-border bg-theme-surface p-6">
            {#if example.image}
              <a
                href="{cleanBase}{example.href}"
                class="mb-4 block overflow-hidden border border-theme-border"
                use:trackDiscoveryClick={{
                  sourceKind: "topic",
                  sourceId: config.slug,
                  placement: "topic_example",
                  ...classifyDiscoveryTarget(example.href),
                }}
              >
                <img
                  src={example.image.src}
                  alt={example.image.alt}
                  width={example.image.width}
                  height={example.image.height}
                  loading="lazy"
                  decoding="async"
                  class="aspect-[16/9] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
              </a>
            {/if}
            <p
              class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
            >
              {example.genre}
            </p>
            <a
              href="{cleanBase}{example.href}"
              class="font-header text-xl font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
              use:trackDiscoveryClick={{
                sourceKind: "topic",
                sourceId: config.slug,
                placement: "topic_example",
                ...classifyDiscoveryTarget(example.href),
              }}>{example.title}</a
            >
            <p class="mt-2 text-base leading-relaxed text-theme-muted">
              {example.description}
            </p>
            <p class="mt-2 text-base leading-relaxed text-theme-text">
              <strong class="font-bold"
                >{config.copy.exampleHighlightLabel}</strong
              >
              {example.highlight}.
            </p>
          </li>
        {/each}
      </ul>
    </section>

    <!-- Tools: the primary generator first, supporting tools after. -->
    <section class="mb-12" aria-labelledby="{config.slug}-tools">
      <h2
        id="{config.slug}-tools"
        class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        {config.copy.toolsHeading}
      </h2>
      <p class="mb-6 leading-relaxed text-theme-muted">
        {config.copy.toolsIntro}
      </p>
      <ul class="flex list-none flex-col gap-4">
        {#each config.generators as tool (tool.href)}
          <li class="border border-theme-border bg-theme-surface p-6">
            {#if tool.image}
              <a
                href="{cleanBase}{tool.href}"
                class="mb-4 block overflow-hidden border border-theme-border"
                use:trackDiscoveryClick={{
                  sourceKind: "topic",
                  sourceId: config.slug,
                  placement: "topic_tool",
                  ...classifyDiscoveryTarget(tool.href),
                }}
              >
                <img
                  src={tool.image.src}
                  alt={tool.image.alt}
                  width={tool.image.width}
                  height={tool.image.height}
                  loading="lazy"
                  decoding="async"
                  class="aspect-[16/10] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
              </a>
            {/if}
            {#if tool.badge}
              <p
                class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
              >
                {tool.badge}
              </p>
            {/if}
            <a
              href="{cleanBase}{tool.href}"
              class="font-header text-xl font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
              use:trackDiscoveryClick={{
                sourceKind: "topic",
                sourceId: config.slug,
                placement: "topic_tool",
                ...classifyDiscoveryTarget(tool.href),
              }}>{tool.title}</a
            >
            <p class="mt-2 text-base leading-relaxed text-theme-muted">
              {tool.description}
            </p>
          </li>
        {/each}
      </ul>
    </section>

    <!-- Workflow: the Answer → Example → Generator path. -->
    <section
      class="mb-12 border border-theme-border bg-theme-surface p-6"
      aria-labelledby="{config.slug}-workflow"
    >
      <h2
        id="{config.slug}-workflow"
        class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        {config.copy.workflowHeading}
      </h2>
      <p class="mb-6 leading-relaxed text-theme-muted">
        {config.copy.workflowIntro}
      </p>
      <ol class="flex list-none flex-col gap-5">
        {#each config.workflow as item (item.step)}
          <li class="flex gap-4">
            <span
              aria-hidden="true"
              class="flex h-8 w-8 shrink-0 items-center justify-center border border-theme-primary font-mono text-sm text-theme-primary"
            >
              {item.step}
            </span>
            <div>
              <h3 class="font-header text-base font-bold text-theme-text">
                {item.title}
              </h3>
              <p class="mt-1 text-base leading-relaxed text-theme-muted">
                {item.description}
                <a
                  href="{cleanBase}{item.recommendedResource.href}"
                  class="font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
                  use:trackDiscoveryClick={{
                    sourceKind: "topic",
                    sourceId: config.slug,
                    placement: "topic_workflow",
                    ...classifyDiscoveryTarget(item.recommendedResource.href),
                  }}>{item.recommendedResource.title}</a
                >.
              </p>
            </div>
          </li>
        {/each}
      </ol>
    </section>

    <!-- Related topics: adjacent hubs, not a site directory. -->
    <section class="mb-4" aria-labelledby="{config.slug}-related">
      <h2
        id="{config.slug}-related"
        class="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
      >
        {config.copy.relatedHeading}
      </h2>
      <ul class="flex list-none flex-col gap-3">
        {#each config.relatedTopics as related (related.href)}
          <li class="border-l border-theme-border pl-5">
            <a
              href="{cleanBase}{related.href}"
              class="font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
              use:trackDiscoveryClick={{
                sourceKind: "topic",
                sourceId: config.slug,
                placement: "topic_related",
                ...classifyDiscoveryTarget(related.href),
              }}>{related.title}</a
            >
            <span class="leading-relaxed text-theme-muted">
              — {related.description}</span
            >
          </li>
        {/each}
      </ul>
    </section>
  </article>
</div>
