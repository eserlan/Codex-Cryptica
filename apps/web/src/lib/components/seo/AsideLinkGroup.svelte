<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import { trackDiscoveryClick } from "#lib/actions/trackDiscoveryClick.js";
  import {
    classifyDiscoveryTarget,
    type DiscoverySourceKind,
  } from "#lib/services/analytics/discovery-tracking.js";

  // A ruled link list for the floating widescreen asides (answers, examples):
  // titles with a one-line description, so a typical rail fits its panel.
  let {
    heading,
    links,
    placement,
    sourceKind,
    sourceId,
  }: {
    heading: string;
    links: Array<{ href: string; title: string; description: string }>;
    placement: string;
    sourceKind: DiscoverySourceKind;
    sourceId: string;
  } = $props();

  const cleanBase = basePath();
</script>

{#if links.length > 0}
  <div class="shrink-0">
    <h3
      class="mb-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-theme-text"
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
              sourceKind,
              sourceId,
              placement,
              ...classifyDiscoveryTarget(link.href),
            }}
          >
            <span
              class="block font-header text-base font-bold leading-snug text-theme-text transition-colors group-hover:text-theme-primary"
              >{link.title}</span
            >
            <span class="line-clamp-2 block text-sm text-theme-text"
              >{link.description}</span
            >
          </a>
        </li>
      {/each}
    </ul>
  </div>
{/if}
