<script lang="ts">
  import { browser } from "$app/environment";
  import { base } from "$app/paths";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";
  import { answerPath } from "$lib/content/answers/registry";
  import {
    buildAnswerFaqJsonLd,
    buildAnswerBreadcrumbJsonLd,
  } from "$lib/content/answers/json-ld";
  import {
    trackDiscoveryPageViewed,
    classifyDiscoveryTarget,
    createDiscoveryViewGuard,
  } from "$lib/services/analytics/discovery-tracking";
  import { trackDiscoveryClick } from "$lib/actions/trackDiscoveryClick";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // A bare "/" base would make every link protocol-relative ("//answers/...").
  const cleanBase = base === "/" ? "" : base;

  let answer = $derived(data.answer);
  let related = $derived(data.related);
  let canonical = $derived(buildAbsoluteUrl(answerPath(answer)));
  let hasFurtherReading = $derived(
    answer.relatedTools.length +
      answer.relatedForPages.length +
      related.length >
      0,
  );

  const KIND_LABEL = {
    definition: "Definition",
    "how-to": "How to",
    framework: "Framework",
    comparison: "Comparison",
  } as const;

  // See discovery-tracking.ts: this route reuses one component instance
  // across /answers/a -> /answers/b navigations, so the guard (not just
  // onMount) is what keeps discovery_page_viewed to one fire per slug.
  const seenAnswer = createDiscoveryViewGuard();
  $effect(() => {
    if (!browser) return;
    const slug = answer.slug;
    if (!seenAnswer(slug)) return;
    trackDiscoveryPageViewed({
      sourceKind: "answer",
      sourceId: slug,
      path: answerPath(answer),
    });
  });
</script>

<SeoHead
  title={answer.seo.title}
  description={answer.seo.description}
  canonicalUrl={canonical}
  image={answer.seo.image ?? buildAbsoluteUrl("/og-image.png")}
  imageAlt={answer.seo.imageAlt ?? answer.question}
  type="article"
  jsonLd={[buildAnswerFaqJsonLd(answer), buildAnswerBreadcrumbJsonLd(answer)]}
/>

<div
  class="bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <article class="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
    <nav aria-label="Breadcrumb" class="mb-8">
      <a
        href="{cleanBase}/answers"
        class="inline-flex items-center gap-2 font-mono text-xs text-theme-muted transition-colors hover:text-theme-primary"
      >
        <span class="icon-[lucide--arrow-left] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        All answers
      </a>
    </nav>

    <header class="mb-8">
      <p
        class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
      >
        {KIND_LABEL[answer.kind]}
      </p>
      <h1
        class="font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
      >
        {answer.question}
      </h1>
    </header>

    <!-- The direct answer, before anything else on the page. Ruled rather than
         boxed: the grammar reserves cards for parallel, comparable items. -->
    <p
      class="mb-12 border-l-2 border-theme-primary pl-5 text-lg leading-relaxed text-theme-text"
    >
      {answer.shortAnswer}
    </p>

    {#if answer.seo.image}
      <img
        src={answer.seo.image}
        alt={answer.seo.imageAlt ?? answer.question}
        width="1200"
        height="675"
        loading="lazy"
        decoding="async"
        class="mb-12 w-full border border-theme-border"
      />
    {/if}

    {#each answer.sections as section, sectionIndex (sectionIndex)}
      <section class="mb-12">
        {#if section.kind === "prose"}
          {#if section.heading}
            <h2
              class="mb-4 font-header text-xl font-bold text-theme-text sm:text-2xl"
            >
              {section.heading}
            </h2>
          {/if}
          {#each section.paragraphs as paragraph}
            <p class="mb-4 leading-relaxed text-theme-muted last:mb-0">
              {paragraph}
            </p>
          {/each}
          {#if section.cta}
            <div class="mt-6 flex flex-col items-start gap-2">
              <a
                href={section.cta.href.startsWith("/")
                  ? `${cleanBase}${section.cta.href}`
                  : section.cta.href}
                target={section.cta.external ? "_blank" : undefined}
                rel={section.cta.external ? "noopener noreferrer" : undefined}
                class="inline-flex items-center gap-2 border border-theme-primary bg-theme-primary/10 px-5 py-2.5 font-header text-sm font-bold text-theme-primary transition-colors hover:bg-theme-primary hover:text-theme-bg"
                use:trackDiscoveryClick={{
                  sourceKind: "answer",
                  sourceId: answer.slug,
                  placement: "section_cta",
                  ...classifyDiscoveryTarget(section.cta.href),
                }}
              >
                <span>{section.cta.text}</span>
                <span
                  class={section.cta.external
                    ? "icon-[lucide--external-link] h-4 w-4"
                    : "icon-[lucide--arrow-right] h-4 w-4"}
                  aria-hidden="true"
                ></span>
              </a>
              {#if section.cta.disclosure}
                <p class="text-xs text-theme-muted">
                  {section.cta.disclosure}
                </p>
              {/if}
            </div>
          {/if}
        {:else if section.kind === "list"}
          {#if section.heading}
            <h2
              class="mb-4 font-header text-xl font-bold text-theme-text sm:text-2xl"
            >
              {section.heading}
            </h2>
          {/if}
          {#if section.intro}
            <p class="mb-4 leading-relaxed text-theme-muted">{section.intro}</p>
          {/if}
          <svelte:element
            this={section.ordered ? "ol" : "ul"}
            class="flex list-none flex-col gap-4 sm:gap-6"
          >
            {#each section.items as item, index}
              <li class="border-l border-theme-border pl-5">
                {#if section.ordered}
                  <span
                    class="mb-1 block font-mono text-xs text-theme-primary"
                    aria-hidden="true">{index + 1}</span
                  >
                {/if}
                {#if item.term}
                  <strong class="block font-header text-base text-theme-text"
                    >{item.term}</strong
                  >
                {/if}
                <span class="leading-relaxed text-theme-muted">{item.text}</span
                >
              </li>
            {/each}
          </svelte:element>
          {#if section.outro}
            <p class="mt-4 leading-relaxed text-theme-muted">{section.outro}</p>
          {/if}
        {:else if section.kind === "example"}
          <div
            class="border border-theme-border bg-theme-surface p-6 sm:p-8"
            style:background-image="var(--bg-texture-overlay)"
          >
            <p
              class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-primary"
            >
              Example
            </p>
            <h2 class="mb-4 font-header text-xl font-bold text-theme-text">
              {section.heading}
            </h2>
            {#each section.paragraphs as paragraph}
              <p class="mb-4 leading-relaxed text-theme-muted">{paragraph}</p>
            {/each}
            {#if section.items}
              <dl class="flex flex-col gap-4">
                {#each section.items as item}
                  <div>
                    {#if item.term}
                      <dt class="font-header text-base text-theme-text">
                        {item.term}
                      </dt>
                    {/if}
                    <dd class="leading-relaxed text-theme-muted">
                      {item.text}
                    </dd>
                  </div>
                {/each}
              </dl>
            {/if}
          </div>
        {:else if section.kind === "checklist"}
          <h2
            class="mb-4 font-header text-xl font-bold text-theme-text sm:text-2xl"
          >
            {section.heading}
          </h2>
          {#if section.intro}
            <p class="mb-4 leading-relaxed text-theme-muted">{section.intro}</p>
          {/if}
          <ul class="flex list-none flex-col gap-2">
            {#each section.items as item}
              <li
                class="flex items-start gap-3 leading-relaxed text-theme-muted"
              >
                <span
                  class="icon-[lucide--check] mt-1 h-4 w-4 shrink-0 text-theme-primary"
                  aria-hidden="true"
                ></span>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/each}

    {#if answer.codexConnection}
      <section class="mb-12 border-t border-theme-border pt-8">
        <h2
          class="mb-4 font-header text-xl font-bold text-theme-text sm:text-2xl"
        >
          {answer.codexConnection.heading}
        </h2>
        {#each answer.codexConnection.paragraphs as paragraph}
          <p class="mb-4 leading-relaxed text-theme-muted">{paragraph}</p>
        {/each}
        <a
          href="{cleanBase}{answer.codexConnection.href}"
          class="inline-flex items-center gap-2 bg-theme-primary px-6 py-3 font-header text-sm font-bold text-theme-bg transition-colors hover:bg-theme-primary/90"
          use:trackDiscoveryClick={{
            sourceKind: "answer",
            sourceId: answer.slug,
            placement: "codex_connection",
            ...classifyDiscoveryTarget(answer.codexConnection.href),
          }}
        >
          {answer.codexConnection.linkText}
          <span class="icon-[lucide--arrow-right] h-4 w-4" aria-hidden="true"
          ></span>
        </a>
      </section>
    {/if}

    {#if hasFurtherReading}
      <section class="border-t border-theme-border pt-8">
        <h2 class="mb-6 font-header text-xl font-bold text-theme-text">
          Related
        </h2>

        {#if answer.relatedTools.length > 0}
          <h3
            class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
          >
            Tools
          </h3>
          <ul class="mb-8 grid list-none gap-4 sm:grid-cols-2">
            {#each answer.relatedTools as tool (tool.href)}
              <li>
                <a
                  href="{cleanBase}{tool.href}"
                  class="group block h-full border border-theme-border bg-theme-surface p-4 transition-colors hover:border-theme-primary/50"
                  style:background-image="var(--bg-texture-overlay)"
                  use:trackDiscoveryClick={{
                    sourceKind: "answer",
                    sourceId: answer.slug,
                    placement: "related_tool",
                    ...classifyDiscoveryTarget(tool.href),
                  }}
                >
                  <span
                    class="block font-header text-sm font-bold text-theme-text transition-colors group-hover:text-theme-primary"
                    >{tool.title}</span
                  >
                  <span
                    class="mt-1 block text-base leading-relaxed text-theme-muted"
                    >{tool.description}</span
                  >
                </a>
              </li>
            {/each}
          </ul>
        {/if}

        {#if answer.relatedForPages.length > 0}
          <h3
            class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
          >
            Guides
          </h3>
          <ul class="mb-8 grid list-none gap-4 sm:grid-cols-2">
            {#each answer.relatedForPages as guide (guide.href)}
              <li>
                <a
                  href="{cleanBase}{guide.href}"
                  class="group block h-full border border-theme-border bg-theme-surface p-4 transition-colors hover:border-theme-primary/50"
                  style:background-image="var(--bg-texture-overlay)"
                  use:trackDiscoveryClick={{
                    sourceKind: "answer",
                    sourceId: answer.slug,
                    placement: "related_guide",
                    ...classifyDiscoveryTarget(guide.href),
                  }}
                >
                  <span
                    class="block font-header text-sm font-bold text-theme-text transition-colors group-hover:text-theme-primary"
                    >{guide.title}</span
                  >
                  <span
                    class="mt-1 block text-base leading-relaxed text-theme-muted"
                    >{guide.description}</span
                  >
                </a>
              </li>
            {/each}
          </ul>
        {/if}

        {#if related.length > 0}
          <h3
            class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-muted"
          >
            Other answers
          </h3>
          <ul class="flex list-none flex-col gap-3">
            {#each related as other (other.slug)}
              <li>
                <a
                  href="{cleanBase}/answers/{other.slug}"
                  class="group flex items-start gap-3 text-theme-text transition-colors hover:text-theme-primary"
                  use:trackDiscoveryClick={{
                    sourceKind: "answer",
                    sourceId: answer.slug,
                    targetKind: "answer",
                    targetId: other.slug,
                    placement: "related_answer",
                  }}
                >
                  <span
                    class="icon-[lucide--corner-down-right] mt-1 h-4 w-4 shrink-0 text-theme-primary"
                    aria-hidden="true"
                  ></span>
                  <span class="font-header text-sm font-bold"
                    >{other.question}</span
                  >
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  </article>
</div>
