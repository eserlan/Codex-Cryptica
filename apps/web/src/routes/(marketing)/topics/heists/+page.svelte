<script lang="ts">
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import PublicLabelChip from "$lib/components/labels/PublicLabelChip.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import { HEIST_TOPIC_CONFIG } from "$lib/content/topics/heists";
  import {
    buildHeistTopicJsonLd,
    buildHeistTopicBreadcrumbJsonLd,
  } from "$lib/content/topics/json-ld";
  import {
    trackDiscoveryPageViewed,
    classifyDiscoveryTarget,
    createDiscoveryViewGuard,
  } from "$lib/services/analytics/discovery-tracking";
  import { trackDiscoveryClick } from "$lib/actions/trackDiscoveryClick";

  // A bare "/" base would make every link protocol-relative ("//answers/...").
  const cleanBase = base === "/" ? "" : base;

  const canonical = buildAbsoluteUrl(HEIST_TOPIC_CONFIG.canonicalPath);

  const seenTopic = createDiscoveryViewGuard();
  $effect(() => {
    if (!browser) return;
    if (!seenTopic(HEIST_TOPIC_CONFIG.slug)) return;
    trackDiscoveryPageViewed({
      sourceKind: "topic",
      sourceId: HEIST_TOPIC_CONFIG.slug,
      path: HEIST_TOPIC_CONFIG.canonicalPath,
    });
  });
</script>

<SeoHead
  title={HEIST_TOPIC_CONFIG.metaTitle}
  description={HEIST_TOPIC_CONFIG.description}
  canonicalUrl={canonical}
  image={HEIST_TOPIC_CONFIG.ogImage}
  imageAlt={HEIST_TOPIC_CONFIG.ogImageAlt}
  imageWidth={HEIST_TOPIC_CONFIG.heroImage.width}
  imageHeight={HEIST_TOPIC_CONFIG.heroImage.height}
  type="website"
  jsonLd={[buildHeistTopicJsonLd(), buildHeistTopicBreadcrumbJsonLd()]}
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
        {HEIST_TOPIC_CONFIG.title}
      </h1>
      <div class="mt-4 flex flex-wrap gap-2">
        <PublicLabelChip label="heist" />
      </div>
      <p class="mt-6 leading-relaxed text-theme-muted">
        {HEIST_TOPIC_CONFIG.leadParagraph}
      </p>
    </header>

    {#if HEIST_TOPIC_CONFIG.heroImage}
      <figure class="mb-12">
        <img
          src={HEIST_TOPIC_CONFIG.heroImage.src}
          alt={HEIST_TOPIC_CONFIG.heroImage.alt}
          width={HEIST_TOPIC_CONFIG.heroImage.width}
          height={HEIST_TOPIC_CONFIG.heroImage.height}
          loading="eager"
          decoding="async"
          class="w-full border border-theme-border shadow-sm"
        />
        {#if HEIST_TOPIC_CONFIG.heroImage.caption}
          <figcaption class="mt-2 font-mono text-xs text-theme-muted">
            {HEIST_TOPIC_CONFIG.heroImage.caption}
          </figcaption>
        {/if}
      </figure>
    {/if}

    <!-- Standalone explanatory copy: the three pressures that make a heist sing. -->
    <section class="mb-12" aria-labelledby="heist-thesis">
      <h2
        id="heist-thesis"
        class="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        Why heists play differently
      </h2>
      <div class="flex flex-col gap-4">
        {#each HEIST_TOPIC_CONFIG.thesisPoints as point (point.title)}
          <div class="border-l border-theme-border pl-5">
            <h3 class="font-header text-base font-bold text-theme-text">
              {point.title}
            </h3>
            <p class="mt-1 leading-relaxed text-theme-muted">{point.summary}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- Learn: the strongest Heist Answers and guides. -->
    <section class="mb-12" aria-labelledby="heist-learn">
      <h2
        id="heist-learn"
        class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        Learn the framework
      </h2>
      <p class="mb-6 leading-relaxed text-theme-muted">
        Start here. These guides cover running the operation at the table and
        designing a prize worth stealing.
      </p>
      <ul class="flex list-none flex-col gap-4">
        {#each HEIST_TOPIC_CONFIG.coreGuides as guide (guide.href)}
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
                sourceId: HEIST_TOPIC_CONFIG.slug,
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
    <section class="mb-12" aria-labelledby="heist-examples">
      <h2
        id="heist-examples"
        class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        See a score, start to finish
      </h2>
      <p class="mb-6 leading-relaxed text-theme-muted">
        Worked examples show the framework under load. Each one runs a different
        genre and a different kind of prize, so pick the one closest to your
        table.
      </p>
      <ul class="flex list-none flex-col gap-4">
        {#each HEIST_TOPIC_CONFIG.workedExamples as example (example.href)}
          <li class="border border-theme-border bg-theme-surface p-6">
            {#if example.image}
              <a
                href="{cleanBase}{example.href}"
                class="mb-4 block overflow-hidden border border-theme-border"
                use:trackDiscoveryClick={{
                  sourceKind: "topic",
                  sourceId: HEIST_TOPIC_CONFIG.slug,
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
                sourceId: HEIST_TOPIC_CONFIG.slug,
                placement: "topic_example",
                ...classifyDiscoveryTarget(example.href),
              }}>{example.title}</a
            >
            <p class="mt-2 text-base leading-relaxed text-theme-muted">
              {example.description}
            </p>
            <p class="mt-2 text-base leading-relaxed text-theme-text">
              <strong class="font-bold">Why run it:</strong>
              {example.highlight}.
            </p>
          </li>
        {/each}
      </ul>
    </section>

    <!-- Tools: the Heist Generator first, supporting tools after. -->
    <section class="mb-12" aria-labelledby="heist-tools">
      <h2
        id="heist-tools"
        class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        Generate the score
      </h2>
      <p class="mb-6 leading-relaxed text-theme-muted">
        Roll a complete, table-ready operation in seconds, then flesh out its
        defenders, locks and getaway with the supporting tools.
      </p>
      <ul class="flex list-none flex-col gap-4">
        {#each HEIST_TOPIC_CONFIG.generators as tool (tool.href)}
          <li class="border border-theme-border bg-theme-surface p-6">
            {#if tool.image}
              <a
                href="{cleanBase}{tool.href}"
                class="mb-4 block overflow-hidden border border-theme-border"
                use:trackDiscoveryClick={{
                  sourceKind: "topic",
                  sourceId: HEIST_TOPIC_CONFIG.slug,
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
                sourceId: HEIST_TOPIC_CONFIG.slug,
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
      aria-labelledby="heist-workflow"
    >
      <h2
        id="heist-workflow"
        class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
      >
        Run one tonight
      </h2>
      <p class="mb-6 leading-relaxed text-theme-muted">
        Four steps from blank page to getaway. Each step points at the single
        resource that carries it.
      </p>
      <ol class="flex list-none flex-col gap-5">
        {#each HEIST_TOPIC_CONFIG.workflow as item (item.step)}
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
                    sourceId: HEIST_TOPIC_CONFIG.slug,
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
    <section class="mb-4" aria-labelledby="heist-related">
      <h2
        id="heist-related"
        class="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
      >
        Keep exploring
      </h2>
      <ul class="flex list-none flex-col gap-3">
        {#each HEIST_TOPIC_CONFIG.relatedTopics as related (related.href)}
          <li class="border-l border-theme-border pl-5">
            <a
              href="{cleanBase}{related.href}"
              class="font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
              use:trackDiscoveryClick={{
                sourceKind: "topic",
                sourceId: HEIST_TOPIC_CONFIG.slug,
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
