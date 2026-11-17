<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import type { TopicHubConfig } from "#lib/content/topics/types.js";
  import { classifyDiscoveryTarget } from "#lib/services/analytics/discovery-tracking.js";
  import { trackDiscoveryClick } from "#lib/actions/trackDiscoveryClick.js";

  let {
    slug,
    action,
  }: {
    slug: string;
    action?: TopicHubConfig["primaryAction"];
  } = $props();

  const cleanBase = basePath();
</script>

{#if action}
  <!-- The hub's one above-the-fold action: deliberately lighter than the job-hub CTA section. -->
  <div
    class="mb-12 flex flex-wrap items-center gap-x-6 gap-y-3"
    data-testid="topic-primary-cta"
  >
    <a
      href="{cleanBase}{action.href}"
      class="inline-flex min-h-[44px] items-center gap-2 border border-theme-primary bg-theme-primary px-5 py-2 font-mono text-sm font-bold uppercase tracking-wider text-theme-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
      use:trackDiscoveryClick={{
        sourceKind: "topic",
        sourceId: slug,
        placement: "topic_primary_cta",
        ...classifyDiscoveryTarget(action.href),
      }}
    >
      {action.label}
      <span class="icon-[lucide--arrow-right] h-4 w-4" aria-hidden="true"
      ></span>
    </a>
    {#if action.secondary}
      <a
        href="{cleanBase}{action.secondary.href}"
        class="font-bold text-theme-text underline decoration-theme-primary/40 underline-offset-4 transition-colors hover:text-theme-primary"
        use:trackDiscoveryClick={{
          sourceKind: "topic",
          sourceId: slug,
          placement: "topic_primary_cta",
          ...classifyDiscoveryTarget(action.secondary.href),
        }}>{action.secondary.label}</a
      >
    {/if}
  </div>
{/if}
