<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import { trackDiscoveryClick } from "#lib/actions/trackDiscoveryClick.js";
  import type {
    DiscoverySourceKind,
    DiscoveryTargetKind,
  } from "#lib/services/analytics/discovery-tracking.js";

  // The "Other answers / Other examples" list of a floating widescreen aside.
  // Shows a handful, with a toggle for the rest; only this list scrolls when
  // expanded, so the sticky panel never outgrows the viewport.
  let {
    heading,
    items,
    pathPrefix,
    placement,
    sourceKind,
    sourceId,
    targetKind,
    shown = 6,
  }: {
    heading: string;
    items: Array<{ slug: string; label: string }>;
    pathPrefix: string;
    placement: string;
    sourceKind: DiscoverySourceKind;
    sourceId: string;
    targetKind: DiscoveryTargetKind;
    shown?: number;
  } = $props();

  const cleanBase = basePath();
  const listId = $props.id();
  let showAll = $state(false);
  let visible = $derived(showAll ? items : items.slice(0, shown));
  let hiddenCount = $derived(items.length - shown);
</script>

{#if items.length > 0}
  <div class="flex min-h-0 flex-1 shrink-0 flex-col">
    <h3
      class="mb-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-theme-text"
    >
      {heading}
    </h3>
    <ul
      id="{listId}-list"
      class="custom-scrollbar min-h-0 flex-1 shrink-0 [scrollbar-width:thin] list-none space-y-2.5 overflow-y-auto pr-1"
    >
      {#each visible as item (item.slug)}
        <li>
          <a
            href="{cleanBase}{pathPrefix}/{item.slug}"
            class="group flex items-start gap-2.5 text-theme-text transition-colors hover:text-theme-primary"
            use:trackDiscoveryClick={{
              sourceKind,
              sourceId,
              targetKind,
              targetId: item.slug,
              placement,
            }}
          >
            <span
              class="icon-[lucide--corner-down-right] mt-1 h-3.5 w-3.5 shrink-0 text-theme-primary"
              aria-hidden="true"
            ></span>
            <span class="font-header text-sm font-bold leading-snug"
              >{item.label}</span
            >
          </a>
        </li>
      {/each}
    </ul>
    {#if hiddenCount > 0}
      <button
        type="button"
        class="mt-3 inline-flex min-h-[24px] shrink-0 items-center gap-1.5 self-start font-mono text-sm text-theme-text underline decoration-theme-primary/40 underline-offset-2 transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
        aria-expanded={showAll}
        aria-controls="{listId}-list"
        onclick={() => (showAll = !showAll)}
      >
        {showAll ? "Show fewer" : `Show ${hiddenCount} more`}
        <span
          class="{showAll
            ? 'icon-[lucide--chevron-up]'
            : 'icon-[lucide--chevron-down]'} h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
      </button>
    {/if}
  </div>
{/if}
