<script lang="ts">
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import PublicLabelChip from "$lib/components/labels/PublicLabelChip.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import type { TopicJobHubConfig } from "$lib/content/topics/job-hub-types";
  import {
    buildJobHubJsonLd,
    buildJobHubBreadcrumbJsonLd,
  } from "$lib/content/topics/job-hub-json-ld";
  import {
    trackDiscoveryPageViewed,
    classifyDiscoveryTarget,
    createDiscoveryViewGuard,
  } from "$lib/services/analytics/discovery-tracking";
  import { trackDiscoveryClick } from "$lib/actions/trackDiscoveryClick";

  let { config }: { config: TopicJobHubConfig } = $props();

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
      <p class="mb-5 leading-relaxed text-theme-muted">
        {config.primaryCta.body}
      </p>
      <a
        href="{cleanBase}{config.primaryCta.action.href}"
        class="inline-flex min-h-[44px] items-center gap-2 border border-theme-primary bg-theme-primary px-5 py-2 font-mono text-sm font-bold uppercase tracking-wider text-theme-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
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
      <ul class="mt-6 flex list-none flex-col gap-3">
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
            <span class="text-base leading-relaxed text-theme-muted">
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
              class="inline-flex min-h-[24px] items-center border border-theme-border px-3 py-1 font-mono text-xs text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
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
        <p class="mb-2 font-mono text-xs text-theme-primary">
          “{job.question}”
        </p>
        <p class="mb-5 leading-relaxed text-theme-muted">{job.intro}</p>
        <ul class="flex list-none flex-col gap-3">
          {#each job.links as link (link.href)}
            <li class="border border-theme-border bg-theme-surface p-4">
              <p
                class="mb-1 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
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
              <p class="mt-1 text-base leading-relaxed text-theme-muted">
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
      <p class="mb-6 leading-relaxed text-theme-muted">{config.funnel.intro}</p>
      <ol class="flex list-none flex-col gap-5">
        {#each config.funnel.steps as step, index (step.title)}
          <li class="flex gap-4">
            <span
              aria-hidden="true"
              class="flex h-8 w-8 shrink-0 items-center justify-center border border-theme-primary font-mono text-sm text-theme-primary"
            >
              {index + 1}
            </span>
            <div>
              <h3 class="font-header text-base font-bold text-theme-text">
                {step.title}
              </h3>
              <p class="mt-1 text-base leading-relaxed text-theme-muted">
                {step.description}
              </p>
            </div>
          </li>
        {/each}
      </ol>
    </section>

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
