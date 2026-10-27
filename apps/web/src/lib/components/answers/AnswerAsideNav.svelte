<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import { trackDiscoveryClick } from "#lib/actions/trackDiscoveryClick.js";
  import { classifyDiscoveryTarget } from "#lib/services/analytics/discovery-tracking.js";
  import type {
    AnswerConfig,
    AnswerLink,
  } from "#lib/content/answers/schema.js";

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

  const cleanBase = basePath();

  // Enough for a typical rail without scrolling; the rest stay one click
  // away and scroll inside the panel rather than stretching it.
  const OTHER_ANSWERS_SHOWN = 6;
  const listId = $props.id();
  let showAllAnswers = $state(false);
  let visibleRelated = $derived(
    showAllAnswers ? related : related.slice(0, OTHER_ANSWERS_SHOWN),
  );
  let hiddenCount = $derived(related.length - OTHER_ANSWERS_SHOWN);
</script>

<!-- A ruled link list rather than cards, so a typical rail fits the panel;
     descriptions are clipped to one line here (the stacked list under the
     article on small screens shows them in full). -->
{#snippet linkGroup(
  heading: string,
  links: AnswerLink[],
  placement: "related_topic" | "related_tool" | "related_guide",
)}
  {#if links.length > 0}
    <div class="shrink-0">
      <h3
        class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-text font-bold"
      >
        {heading}
      </h3>
      <ul class="list-none border-l border-theme-border">
        {#each links as link (link.href)}
          <li>
            <a
              href="{cleanBase}{link.href}"
              class="group -ml-px block border-l border-transparent py-1.5 pl-3 transition-colors hover:border-theme-primary"
              title={link.description}
              use:trackDiscoveryClick={{
                sourceKind: "answer",
                sourceId: answer.slug,
                placement,
                ...classifyDiscoveryTarget(link.href),
              }}
            >
              <span
                class="block font-header text-sm font-bold leading-snug text-theme-text transition-colors group-hover:text-theme-primary"
                >{link.title}</span
              >
              <span class="block truncate text-xs text-theme-text"
                >{link.description}</span
              >
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
{/snippet}

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
    class="flex shrink-0 items-center gap-2 font-mono text-micro uppercase tracking-widest text-theme-text"
  >
    <span
      class="icon-[lucide--compass] h-3.5 w-3.5 text-theme-primary"
      aria-hidden="true"
    ></span>
    Related
  </h2>

  {@render linkGroup("Topic Hubs", answer.relatedTopics, "related_topic")}
  {@render linkGroup("Tools", answer.relatedTools, "related_tool")}
  {@render linkGroup("Guides", answer.relatedForPages, "related_guide")}

  {#if related.length > 0}
    <div class="flex min-h-[8rem] flex-col">
      <h3
        class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-text font-bold"
      >
        Other answers
      </h3>
      <ul
        id="{listId}-answers"
        class="custom-scrollbar min-h-0 [scrollbar-width:thin] list-none space-y-2.5 overflow-y-auto pr-1"
      >
        {#each visibleRelated as other (other.slug)}
          <li>
            <a
              href="{cleanBase}/answers/{other.slug}"
              class="group flex items-start gap-2.5 text-theme-text transition-colors hover:text-theme-primary"
              use:trackDiscoveryClick={{
                sourceKind: "answer",
                sourceId: answer.slug,
                targetKind: "answer",
                targetId: other.slug,
                placement: "related_answer",
              }}
            >
              <span
                class="icon-[lucide--corner-down-right] mt-1 h-3.5 w-3.5 shrink-0 text-theme-primary"
                aria-hidden="true"
              ></span>
              <span class="font-header text-xs font-bold leading-snug"
                >{other.question}</span
              >
            </a>
          </li>
        {/each}
      </ul>
      {#if hiddenCount > 0}
        <button
          type="button"
          class="mt-3 inline-flex min-h-[24px] shrink-0 self-start items-center gap-1.5 font-mono text-xs text-theme-text underline decoration-theme-primary/40 underline-offset-2 transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
          aria-expanded={showAllAnswers}
          aria-controls="{listId}-answers"
          onclick={() => (showAllAnswers = !showAllAnswers)}
        >
          {showAllAnswers ? "Show fewer" : `Show ${hiddenCount} more`}
          <span
            class="{showAllAnswers
              ? 'icon-[lucide--chevron-up]'
              : 'icon-[lucide--chevron-down]'} h-3.5 w-3.5"
            aria-hidden="true"
          ></span>
        </button>
      {/if}
    </div>
  {/if}
</div>
