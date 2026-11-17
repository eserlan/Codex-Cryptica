<script lang="ts">
  import { TOPIC_LAYOUT } from "./topic-layout.js";
  import type { TopicInlineExample } from "#lib/content/topics/types.js";

  let {
    example,
    highlightLabel,
  }: { example: TopicInlineExample; highlightLabel: string } = $props();
</script>

<div
  class="mb-6 rounded-xl border border-theme-border bg-theme-surface p-6 shadow-md"
  style:background-image="var(--bg-texture-overlay)"
>
  <p class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-theme-text">
    {example.genre}
  </p>
  <h3 class="font-header text-xl font-bold text-theme-text">
    {example.title}
  </h3>
  <p
    class="mt-2 text-base leading-relaxed text-theme-text {TOPIC_LAYOUT.measure}"
  >
    {example.summary}
  </p>
  <dl class="mt-4 divide-y divide-theme-border border-y border-theme-border">
    {#each example.parts as part (part.term)}
      <div class="py-3">
        <dt class="font-header text-base font-bold text-theme-text">
          {part.term}
        </dt>
        <dd class="mt-1 text-base leading-relaxed text-theme-text">
          {part.text}
        </dd>
      </div>
    {/each}
  </dl>
  <p
    class="mt-4 text-base leading-relaxed text-theme-text {TOPIC_LAYOUT.measure}"
  >
    <strong class="font-bold">{highlightLabel}</strong>
    {example.highlight}.
  </p>
</div>
