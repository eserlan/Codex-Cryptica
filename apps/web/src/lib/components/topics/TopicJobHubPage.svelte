<script lang="ts">
  import { browser } from "$app/env";
  import { basePath } from "#lib/utils/base-path.js";
  import SeoHead from "#lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "#lib/seo/site.js";
  import type { TopicJobHubConfig } from "#lib/content/topics/job-hub-types.js";
  import {
    buildJobHubJsonLd,
    buildJobHubBreadcrumbJsonLd,
  } from "#lib/content/topics/job-hub-json-ld.js";

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

  let { config }: { config: TopicJobHubConfig } = $props();

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

  const linkClass =
    "font-header text-lg font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent";
</script>

<SeoHead
  title={config.metaTitle}
  description={config.description}
  canonicalUrl={canonical}
  image={config.ogImage}
  imageAlt={config.ogImageAlt}
  type="website"
  jsonLd={[buildJobHubJsonLd(config), buildJobHubBreadcrumbJsonLd(config)]}
/>

<TopicHubShell>
  <TopicHubHeader
    title={config.title}
    label={config.label}
    leadParagraph={config.leadParagraph}
  />

  <!-- Primary conversion: route into the system-neutral Session Prep Builder. -->
  <section
    class="mb-12 border border-theme-primary bg-theme-surface p-6"
    aria-labelledby="{config.slug}-primary"
    data-testid="topic-primary-cta"
  >
    <h2
      id="{config.slug}-primary"
      class="mb-3 font-header text-2xl font-bold text-theme-text"
    >
      {config.primaryCta.heading}
    </h2>
    <p class="mb-5 leading-relaxed text-theme-text {TOPIC_LAYOUT.measure}">
      {config.primaryCta.body}
    </p>
    <a
      href="{cleanBase}{config.primaryCta.action.href}"
      class="inline-flex min-h-[44px] items-center gap-2 border border-theme-primary bg-theme-primary px-5 py-2 font-mono text-sm font-bold uppercase tracking-wider text-theme-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
      use:trackDiscoveryClick={{
        sourceKind: "topic",
        sourceId: config.slug,
        placement: "topic_primary_cta",
        ...classifyDiscoveryTarget(config.primaryCta.action.href),
      }}
    >
      {config.primaryCta.action.label}
      <span class="icon-[lucide--arrow-right] h-4 w-4" aria-hidden="true"
      ></span>
    </a>
    <ul class="mt-6 {TOPIC_LAYOUT.ruled}">
      {#each config.primaryCta.supportingLinks as link (link.href)}
        <li class="border-l border-theme-border pl-5">
          <a
            href="{cleanBase}{link.href}"
            class="font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
            use:trackDiscoveryClick={{
              sourceKind: "topic",
              sourceId: config.slug,
              placement: "topic_primary_support",
              ...classifyDiscoveryTarget(link.href),
            }}>{link.title}</a
          >
          <span class="text-base leading-relaxed text-theme-text">
            — {link.description}</span
          >
        </li>
      {/each}
    </ul>
  </section>

  <nav aria-label="DM jobs" class="mb-10">
    <ul class="flex list-none flex-wrap gap-2">
      {#each config.jobs as job (job.id)}
        <li>
          <a
            href="#{config.slug}-{job.id}"
            class="inline-flex min-h-[24px] items-center border border-theme-border px-3 py-1 font-mono text-xs text-theme-text transition-colors hover:border-theme-primary hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
            >{job.heading}</a
          >
        </li>
      {/each}
    </ul>
  </nav>

  {#each config.jobs as job (job.id)}
    <section
      id="{config.slug}-{job.id}"
      class="mb-12 scroll-mt-8"
      aria-labelledby="{config.slug}-{job.id}-heading"
    >
      <h2
        id="{config.slug}-{job.id}-heading"
        class="mb-1 font-header text-2xl font-bold text-theme-text"
      >
        {job.heading}
      </h2>
      <p class="mb-2 font-mono text-xs text-theme-text">
        “{job.question}”
      </p>
      <p class="mb-5 leading-relaxed text-theme-text {TOPIC_LAYOUT.measure}">
        {job.intro}
      </p>
      <ul class={TOPIC_LAYOUT.compactCards}>
        {#each job.links as link (link.href)}
          <li class="border border-theme-border bg-theme-surface p-4">
            <p
              class="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
            >
              {link.badge}
            </p>
            <a
              href="{cleanBase}{link.href}"
              class={linkClass}
              use:trackDiscoveryClick={{
                sourceKind: "topic",
                sourceId: config.slug,
                placement: `topic_job_${job.id}`,
                ...classifyDiscoveryTarget(link.href),
              }}>{link.title}</a
            >
            <p class="mt-1 text-base leading-relaxed text-theme-text">
              {link.description}
            </p>
          </li>
        {/each}
      </ul>
    </section>
  {/each}

  <section
    class="mb-12 border border-theme-border bg-theme-surface p-6"
    aria-labelledby="{config.slug}-funnel"
  >
    <h2
      id="{config.slug}-funnel"
      class="mb-2 font-header text-xl font-bold text-theme-text"
    >
      {config.funnel.heading}
    </h2>
    <p class="mb-6 leading-relaxed text-theme-text {TOPIC_LAYOUT.measure}">
      {config.funnel.intro}
    </p>
    <ol class="{TOPIC_LAYOUT.ruled} gap-y-6">
      {#each config.funnel.steps as step, index (step.title)}
        <li class="flex gap-4">
          <span
            aria-hidden="true"
            class="flex h-8 w-8 shrink-0 items-center justify-center border border-theme-primary font-mono text-sm text-theme-text"
          >
            {index + 1}
          </span>
          <div>
            <h3 class="font-header text-base font-bold text-theme-text">
              {step.title}
            </h3>
            <p class="mt-1 text-base leading-relaxed text-theme-text">
              {step.description}
            </p>
          </div>
        </li>
      {/each}
    </ol>
  </section>

  <TopicRelatedList
    slug={config.slug}
    heading={config.relatedHeading}
    topics={config.relatedTopics}
  />
</TopicHubShell>
