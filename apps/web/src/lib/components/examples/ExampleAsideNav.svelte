<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import { trackDiscoveryClick } from "#lib/actions/trackDiscoveryClick.js";
  import { classifyDiscoveryTarget } from "#lib/services/analytics/discovery-tracking.js";
  import AsideLinkGroup from "#lib/components/seo/AsideLinkGroup.svelte";
  import AsideMoreList from "#lib/components/seo/AsideMoreList.svelte";
  import type { ExampleConfig } from "#lib/content/examples/schema.js";

  // The example's sidebar: how it was generated (always, so it reads before the
  // output on a phone) plus the related links, which only appear from lg up
  // because the page lists them in full under the article on small screens.
  // Framed like the blog and Answers rails.
  let {
    example,
    related = [],
    headingId,
  }: {
    example: ExampleConfig;
    related?: Array<Pick<ExampleConfig, "slug" | "title">>;
    headingId?: string;
  } = $props();

  const cleanBase = basePath();
  const source = $derived({
    sourceKind: "example" as const,
    sourceId: example.slug,
  });
</script>

<div
  class="custom-scrollbar flex max-h-[calc(100vh-8rem)] [scrollbar-width:thin] flex-col gap-5 overflow-y-auto rounded-xl border border-theme-border/60 bg-theme-surface/30 p-5 text-sm backdrop-blur-sm"
  data-testid="example-aside-panel"
>
  <!-- Generation context: the settings behind the roll, never internal prompts. -->
  <div class="shrink-0">
    <h2
      id={headingId}
      class="mb-3 flex items-center gap-2 font-mono text-micro uppercase tracking-widest text-theme-text"
    >
      <span
        class="icon-[lucide--dices] h-3.5 w-3.5 text-theme-primary"
        aria-hidden="true"
      ></span>
      How this was generated
    </h2>
    <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-1">
      <div>
        <dt class="font-mono text-xs text-theme-text">Generator</dt>
        <dd class="text-sm text-theme-text">
          <a
            href="{cleanBase}{example.generator.href}"
            class="underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
            use:trackDiscoveryClick={{
              ...source,
              placement: "generation_context",
              ...classifyDiscoveryTarget(example.generator.href),
            }}>{example.generator.name}</a
          >
        </dd>
      </div>
      {#each example.context as fact (fact.label)}
        <div>
          <dt class="font-mono text-xs text-theme-text">{fact.label}</dt>
          <dd class="text-sm text-theme-text">{fact.value}</dd>
        </div>
      {/each}
    </dl>
    <p class="mt-4 border-t border-theme-border pt-4 text-sm text-theme-text">
      {#if example.provenance === "raw"}
        The output below is reproduced exactly as generated. Nothing has been
        rewritten.
      {:else}
        {example.provenanceNote}
      {/if}
    </p>
  </div>

  <div
    class="hidden shrink-0 flex-col gap-5 border-t border-theme-border pt-5 lg:flex"
  >
    <AsideLinkGroup
      heading="Topic Hubs"
      links={example.relatedTopics ?? []}
      placement="related_topic"
      {...source}
    />
    <AsideLinkGroup
      heading="Generators"
      links={example.relatedGenerators}
      placement="related_tool"
      {...source}
    />
    <AsideLinkGroup
      heading="Answers"
      links={example.relatedAnswers}
      placement="related_answer"
      {...source}
    />
    <AsideLinkGroup
      heading="Guides"
      links={example.relatedForPages}
      placement="related_guide"
      {...source}
    />
  </div>

  <div class="hidden min-h-0 flex-1 flex-col lg:flex">
    <AsideMoreList
      heading="Other examples"
      items={related.map((r) => ({ slug: r.slug, label: r.title }))}
      pathPrefix="/examples"
      placement="related_example"
      targetKind="example"
      {...source}
    />
  </div>
</div>
