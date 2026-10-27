<script lang="ts">
  import { browser } from "$app/env";
  import { basePath } from "#lib/utils/base-path.js";
  import SeoHead from "#lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "#lib/seo/site.js";
  import type { TopicHubConfig } from "#lib/content/topics/types.js";
  import {
    buildTopicJsonLd,
    buildTopicBreadcrumbJsonLd,
  } from "#lib/content/topics/json-ld.js";

  import {
    trackDiscoveryPageViewed,
    classifyDiscoveryTarget,
    createDiscoveryViewGuard,
  } from "#lib/services/analytics/discovery-tracking.js";
  import { trackDiscoveryClick } from "#lib/actions/trackDiscoveryClick.js";
  import { TOPIC_LAYOUT } from "./topic-layout.js";
  import TopicHubShell from "./TopicHubShell.svelte";
  import TopicHubHeader from "./TopicHubHeader.svelte";
  import TopicRelatedList from "./TopicRelatedList.svelte";

  let { config }: { config: TopicHubConfig } = $props();

  // A bare "/" base would make every link protocol-relative ("//answers/...").
  const cleanBase = basePath();

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

<TopicHubShell>
  <TopicHubHeader
    title={config.title}
    label={config.label}
    leadParagraph={config.leadParagraph}
    heroImage={config.heroImage}
  />

  <!-- Standalone explanatory copy: the ideas that make this topic play differently. -->
  <section class="mb-12" aria-labelledby="{config.slug}-thesis">
    <h2
      id="{config.slug}-thesis"
      class="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
    >
      {config.copy.thesisHeading}
    </h2>
    <div class={TOPIC_LAYOUT.ruled}>
      {#each config.thesisPoints as point (point.title)}
        <div class="border-l border-theme-border pl-5">
          <h3 class="font-header text-base font-bold text-theme-text">
            {point.title}
          </h3>
          <p class="mt-1 leading-relaxed text-theme-text">{point.summary}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Learn: the strongest Answers and guides. -->
  <section class="mb-12" aria-labelledby="{config.slug}-learn">
    <h2
      id="{config.slug}-learn"
      class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
    >
      {config.copy.learnHeading}
    </h2>
    <p class="mb-6 leading-relaxed text-theme-text {TOPIC_LAYOUT.measure}">
      {config.copy.learnIntro}
    </p>
    <ul class={TOPIC_LAYOUT.cards}>
      {#each config.coreGuides as guide (guide.href)}
        <li class="border border-theme-border bg-theme-surface p-6">
          <p
            class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
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
          <p class="mt-2 text-base leading-relaxed text-theme-text">
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
      class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
    >
      {config.copy.examplesHeading}
    </h2>
    <p class="mb-6 leading-relaxed text-theme-text {TOPIC_LAYOUT.measure}">
      {config.copy.examplesIntro}
    </p>
    <ul class={TOPIC_LAYOUT.cards}>
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
            class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
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

          <p class="mt-2 text-base leading-relaxed text-theme-text">
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
      class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
    >
      {config.copy.toolsHeading}
    </h2>
    <p class="mb-6 leading-relaxed text-theme-text {TOPIC_LAYOUT.measure}">
      {config.copy.toolsIntro}
    </p>
    <ul class={TOPIC_LAYOUT.cards}>
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
              class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
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
          <p class="mt-2 text-base leading-relaxed text-theme-text">
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
      class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
    >
      {config.copy.workflowHeading}
    </h2>
    <p class="mb-6 leading-relaxed text-theme-text {TOPIC_LAYOUT.measure}">
      {config.copy.workflowIntro}
    </p>
    <ol class="{TOPIC_LAYOUT.ruled} gap-y-6">
      {#each config.workflow as item (item.step)}
        <li class="flex gap-4">
          <span
            aria-hidden="true"
            class="flex h-8 w-8 shrink-0 items-center justify-center border border-theme-primary font-mono text-sm text-theme-text"
          >
            {item.step}
          </span>
          <div>
            <h3 class="font-header text-base font-bold text-theme-text">
              {item.title}
            </h3>
            <p class="mt-1 text-base leading-relaxed text-theme-text">
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

  <TopicRelatedList
    slug={config.slug}
    heading={config.copy.relatedHeading}
    topics={config.relatedTopics}
  />
</TopicHubShell>
