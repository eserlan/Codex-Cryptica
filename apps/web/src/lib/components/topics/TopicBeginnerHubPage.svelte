<script lang="ts">
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import PublicLabelChip from "$lib/components/labels/PublicLabelChip.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import type {
    TopicBeginnerHubConfig,
    TopicLearningStep,
    TopicScopeColumn,
  } from "$lib/content/topics/beginner-hub-types";
  import {
    buildBeginnerHubJsonLd,
    buildBeginnerHubBreadcrumbJsonLd,
  } from "$lib/content/topics/beginner-hub-json-ld";
  import {
    trackDiscoveryPageViewed,
    classifyDiscoveryTarget,
    createDiscoveryViewGuard,
  } from "$lib/services/analytics/discovery-tracking";
  import { trackDiscoveryClick } from "$lib/actions/trackDiscoveryClick";

  let { config }: { config: TopicBeginnerHubConfig } = $props();

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

  const guideLinkClass =
    "font-header text-lg font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent";
</script>

{#snippet stepSection(step: TopicLearningStep)}
  <section
    id="{config.slug}-{step.id}"
    class="mb-14 scroll-mt-8 border-t border-theme-border pt-8"
    aria-labelledby="{config.slug}-{step.id}-heading"
    data-testid="learning-step-{step.id}"
  >
    <div
      class="mb-1 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-theme-primary"
    >
      <span>Step {step.step}</span>
      <span class="text-theme-border">•</span>
      <span>{step.question}</span>
    </div>
    <h2
      id="{config.slug}-{step.id}-heading"
      class="mb-3 font-header text-2xl font-bold text-theme-text sm:text-3xl"
    >
      {step.heading}
    </h2>
    <p class="mb-5 leading-relaxed text-theme-muted">
      {step.summary}
    </p>

    <!-- Key Takeaways for this step -->
    <div class="mb-6 border border-theme-border/60 bg-theme-surface/50 p-5">
      <p
        class="mb-2 font-mono text-xs font-bold uppercase tracking-wider text-theme-muted"
      >
        Key table principles
      </p>
      <ul class="flex list-none flex-col gap-2">
        {#each step.takeaways as takeaway (takeaway)}
          <li class="flex items-start gap-2 text-base text-theme-text">
            <span
              class="icon-[lucide--check] mt-1 h-4 w-4 shrink-0 text-theme-primary"
              aria-hidden="true"
            ></span>
            <span>{takeaway}</span>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Links to guides for this step -->
    <ul class="flex list-none flex-col gap-3">
      {#each step.links as link (link.href)}
        <li
          class="border border-theme-border bg-theme-surface p-5 transition-colors hover:border-theme-primary/50"
        >
          {#if link.badge}
            <span
              class="mb-1 inline-block font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
            >
              {link.badge}
            </span>
          {/if}
          <div>
            <a
              href="{cleanBase}{link.href}"
              class={guideLinkClass}
              use:trackDiscoveryClick={{
                sourceKind: "topic",
                sourceId: config.slug,
                placement: `topic_step_${step.id}`,
                ...classifyDiscoveryTarget(link.href),
              }}
            >
              {link.title}
            </a>
            <p class="mt-1 text-base leading-relaxed text-theme-muted">
              {link.description}
            </p>
          </div>
        </li>
      {/each}
    </ul>
  </section>
{/snippet}

{#snippet scopeColumn(column: TopicScopeColumn, isNow: boolean)}
  <div
    class={isNow
      ? "border border-theme-primary/40 bg-theme-bg p-5"
      : "border border-theme-border bg-theme-bg/60 p-5"}
  >
    <div class="mb-1 flex items-center gap-2">
      <span
        class={isNow
          ? "icon-[lucide--check-circle-2] h-4 w-4 text-theme-primary"
          : "icon-[lucide--clock] h-4 w-4 text-theme-muted"}
        aria-hidden="true"
      ></span>
      <h3 class="font-header text-xl font-bold text-theme-text">
        {column.title}
      </h3>
    </div>
    <p class="mb-4 font-mono text-xs text-theme-muted">
      {column.subtitle}
    </p>
    <ul class="flex list-none flex-col gap-4">
      {#each column.items as item (item.term)}
        <li class="border-t border-theme-border/60 pt-3">
          <span class="font-bold text-theme-text">{item.term}</span>
          <p class="mt-0.5 text-sm leading-relaxed text-theme-muted">
            {item.detail}
          </p>
        </li>
      {/each}
    </ul>
  </div>
{/snippet}

<SeoHead
  title={config.metaTitle}
  description={config.description}
  canonicalUrl={canonical}
  image={config.ogImage}
  imageAlt={config.ogImageAlt}
  type="website"
  jsonLd={[
    buildBeginnerHubJsonLd(config),
    buildBeginnerHubBreadcrumbJsonLd(config),
  ]}
/>

<div
  class="bg-theme-bg font-body text-theme-text selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <article
    class="mx-auto max-w-3xl break-words px-4 py-12 text-lg leading-relaxed sm:px-6 sm:py-20"
  >
    <!-- Breadcrumb -->
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

    <!-- Header -->
    <header class="mb-10">
      <p
        class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
      >
        Beginner Guide Hub
      </p>
      <h1
        class="font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        {config.title}
      </h1>
      <div class="mt-4 flex flex-wrap gap-2">
        <PublicLabelChip label={config.label} />
      </div>
      <p class="mt-6 text-xl leading-relaxed text-theme-muted">
        {config.leadParagraph}
      </p>
    </header>

    <!-- Start Here / Core Conversation Section -->
    <section
      class="mb-12 border border-theme-primary bg-theme-surface p-6 sm:p-8"
      aria-labelledby="{config.slug}-start-here"
      data-testid="topic-start-here"
    >
      <div
        class="mb-2 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-theme-primary"
      >
        <span class="icon-[lucide--compass] h-4 w-4" aria-hidden="true"></span>
        <span>Start Here</span>
      </div>
      <h2
        id="{config.slug}-start-here"
        class="mb-3 font-header text-2xl font-bold text-theme-text sm:text-3xl"
      >
        {config.startHere.heading}
      </h2>
      <p class="mb-4 text-theme-muted">
        {config.startHere.intro}
      </p>

      <!-- The 4-step loop visual progression -->
      <ol class="mb-6 grid list-none gap-3 sm:grid-cols-2">
        {#each config.startHere.playLoopSteps as step (step.step)}
          <li class="border border-theme-border/80 bg-theme-bg/60 p-4">
            <div
              class="mb-1 flex items-center gap-2 font-mono text-xs font-bold text-theme-primary"
            >
              <span
                class="flex h-5 w-5 items-center justify-center border border-theme-primary text-xs"
              >
                {step.step}
              </span>
              <span>{step.title}</span>
            </div>
            <p class="text-sm leading-normal text-theme-muted">
              {step.description}
            </p>
          </li>
        {/each}
      </ol>

      <div
        class="mb-5 border-l-2 border-theme-primary/60 pl-4 text-sm italic text-theme-muted"
      >
        {config.startHere.reassuranceText}
      </div>

      <!-- Primary Core Guide link -->
      <div class="border border-theme-primary/40 bg-theme-bg p-5">
        <span
          class="mb-1 inline-block font-mono text-xs uppercase tracking-wider text-theme-primary"
        >
          {config.startHere.primaryLink.badge}
        </span>
        <div>
          <a
            href="{cleanBase}{config.startHere.primaryLink.href}"
            class="font-header text-xl font-bold text-theme-text underline decoration-theme-primary/60 underline-offset-4 transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
            use:trackDiscoveryClick={{
              sourceKind: "topic",
              sourceId: config.slug,
              placement: "topic_start_here",
              ...classifyDiscoveryTarget(config.startHere.primaryLink.href),
            }}
          >
            {config.startHere.primaryLink.title}
          </a>
          <p class="mt-2 text-base leading-relaxed text-theme-muted">
            {config.startHere.primaryLink.description}
          </p>
        </div>
      </div>
    </section>

    <!-- Quick Navigation through Learning Path -->
    <nav aria-label="Learning path navigation" class="mb-12">
      <p
        class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
      >
        The 4-Step Beginner Path
      </p>
      <ul class="flex list-none flex-wrap gap-2">
        {#each config.learningSteps as step (step.id)}
          <li>
            <a
              href="#{config.slug}-{step.id}"
              class="inline-flex min-h-[32px] items-center gap-2 border border-theme-border px-3 py-1 font-mono text-xs text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
            >
              <span class="text-theme-primary">0{step.step}.</span>
              <span>{step.heading}</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    <!-- Learning Path Sections -->
    {#each config.learningSteps as step (step.id)}
      {@render stepSection(step)}
    {/each}

    <!-- Learn Now vs Learn Later Explicit Distinction Section -->
    <section
      class="mb-14 border border-theme-border bg-theme-surface p-6 sm:p-8"
      aria-labelledby="{config.slug}-scope-comparison"
      data-testid="topic-scope-comparison"
    >
      <div
        class="mb-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-theme-primary"
      >
        Cognitive Load Filter
      </div>
      <h2
        id="{config.slug}-scope-comparison"
        class="mb-3 font-header text-2xl font-bold text-theme-text sm:text-3xl"
      >
        {config.scopeComparison.heading}
      </h2>
      <p class="mb-6 leading-relaxed text-theme-muted">
        {config.scopeComparison.intro}
      </p>

      <div class="grid gap-6 sm:grid-cols-2">
        {@render scopeColumn(config.scopeComparison.learnNow, true)}
        {@render scopeColumn(config.scopeComparison.learnLater, false)}
      </div>
    </section>

    <!-- Contextual Funnel / Tools Section -->
    <section
      class="mb-12 border border-theme-border bg-theme-surface p-6"
      aria-labelledby="{config.slug}-tools"
      data-testid="topic-tools"
    >
      <h2
        id="{config.slug}-tools"
        class="mb-2 font-header text-2xl font-bold text-theme-text"
      >
        {config.toolsAndNextSteps.heading}
      </h2>
      <p class="mb-6 leading-relaxed text-theme-muted">
        {config.toolsAndNextSteps.intro}
      </p>
      <ul class="flex list-none flex-col gap-3">
        {#each config.toolsAndNextSteps.links as link (link.href)}
          <li class="border-l border-theme-border pl-5">
            {#if link.badge}
              <span
                class="mr-2 font-mono text-xs uppercase tracking-wider text-theme-primary"
              >
                [{link.badge}]
              </span>
            {/if}
            <a
              href="{cleanBase}{link.href}"
              class="font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
              use:trackDiscoveryClick={{
                sourceKind: "topic",
                sourceId: config.slug,
                placement: "topic_tools",
                ...classifyDiscoveryTarget(link.href),
              }}
            >
              {link.title}
            </a>
            <span class="leading-relaxed text-theme-muted">
              — {link.description}
            </span>
          </li>
        {/each}
      </ul>
    </section>

    <!-- Related Topics & Hubs -->
    <section class="mb-4" aria-labelledby="{config.slug}-related">
      <h2
        id="{config.slug}-related"
        class="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
      >
        {config.relatedHeading}
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
              }}
            >
              {related.title}
            </a>
            <span class="leading-relaxed text-theme-muted">
              — {related.description}
            </span>
          </li>
        {/each}
      </ul>
    </section>
  </article>
</div>
