<script lang="ts">
  import AsideMoreList from "#lib/components/seo/AsideMoreList.svelte";
  import AsideLinkGroup from "#lib/components/seo/AsideLinkGroup.svelte";
  import type { AnswerConfig } from "#lib/content/answers/schema.js";

  // The same related links the answer page lists under its content, condensed
  // for the floating widescreen aside. The page owns the landmark; this owns the
  // heading the landmark is labelled by.
  let {
    answer,
    related = [],
    headingId,
  }: {
    answer: AnswerConfig;
    related?: Array<Pick<AnswerConfig, "slug" | "question">>;
    headingId?: string;
  } = $props();

  const source = $derived({
    sourceKind: "answer" as const,
    sourceId: answer.slug,
  });
</script>

<!-- Framed like the blog's contents panel. Capped to the viewport so a
     sticky rail never runs off screen: the fixed groups stay put and only the
     answer list scrolls when expanded (the panel itself scrolls only as a
     last resort, if the fixed groups alone outgrow a very short window). -->
<div
  class="custom-scrollbar flex max-h-[calc(100vh-8rem)] [scrollbar-width:thin] flex-col gap-5 overflow-y-auto rounded-xl border border-theme-border/60 bg-theme-surface/30 p-5 text-sm backdrop-blur-sm"
  data-testid="answer-aside-panel"
>
  <h2
    id={headingId}
    class="flex shrink-0 items-center gap-2 font-mono text-xs uppercase tracking-widest text-theme-text"
  >
    <span
      class="icon-[lucide--compass] h-3.5 w-3.5 text-theme-primary"
      aria-hidden="true"
    ></span>
    Related
  </h2>

  <AsideLinkGroup
    heading="Topic Hubs"
    links={answer.relatedTopics}
    placement="related_topic"
    {...source}
  />
  <AsideLinkGroup
    heading="Tools"
    links={answer.relatedTools}
    placement="related_tool"
    {...source}
  />
  <AsideLinkGroup
    heading="Guides"
    links={answer.relatedForPages}
    placement="related_guide"
    {...source}
  />

  <AsideMoreList
    heading="Other answers"
    items={related.map((r) => ({ slug: r.slug, label: r.question }))}
    pathPrefix="/answers"
    placement="related_answer"
    targetKind="answer"
    {...source}
  />
</div>
