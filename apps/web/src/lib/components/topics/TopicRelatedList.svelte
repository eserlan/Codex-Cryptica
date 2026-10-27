<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import type { TopicRelatedLink } from "#lib/content/topics/types.js";
  import { classifyDiscoveryTarget } from "#lib/services/analytics/discovery-tracking.js";
  import { trackDiscoveryClick } from "#lib/actions/trackDiscoveryClick.js";
  import { TOPIC_LAYOUT } from "./topic-layout.js";

  let {
    slug,
    heading,
    topics,
  }: {
    slug: string;
    heading: string;
    topics: TopicRelatedLink[];
  } = $props();

  const cleanBase = basePath();
</script>

<!-- Adjacent hubs, not a site directory. -->
<section class="mb-4" aria-labelledby="{slug}-related">
  <h2
    id="{slug}-related"
    class="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
  >
    {heading}
  </h2>
  <ul class={TOPIC_LAYOUT.ruled}>
    {#each topics as related (related.href)}
      <li class="border-l border-theme-border pl-5">
        <a
          href="{cleanBase}{related.href}"
          class="font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
          use:trackDiscoveryClick={{
            sourceKind: "topic",
            sourceId: slug,
            placement: "topic_related",
            ...classifyDiscoveryTarget(related.href),
          }}>{related.title}</a
        >
        <span class="leading-relaxed text-theme-text">
          — {related.description}</span
        >
      </li>
    {/each}
  </ul>
</section>
