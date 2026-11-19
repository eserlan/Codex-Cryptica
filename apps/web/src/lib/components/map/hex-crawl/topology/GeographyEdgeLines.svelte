<script lang="ts">
  import type { EdgeItem } from "./geography-overlay-model";
  let { item }: { item: EdgeItem } = $props();
  const coastDisabled = $derived(
    item.disabledFeatures.has(`${item.key}#coast`),
  );
  const roadDisabled = $derived(item.disabledFeatures.has(`${item.key}#road`));
  const riverDisabled = $derived(
    item.disabledFeatures.has(`${item.key}#river`),
  );
  const crossingVisible = $derived(
    Boolean(item.edge.crossing && !riverDisabled && !roadDisabled),
  );
</script>

{#snippet coastLine()}
  <line
    x1={item.coastA.x}
    y1={item.coastA.y}
    x2={item.coastB.x}
    y2={item.coastB.y}
    stroke="#38bdf8"
    stroke-width="3"
    stroke-linecap="round"
    stroke-dasharray={item.proposedFeatures.includes("coast")
      ? "5 3"
      : undefined}
    opacity={coastDisabled ? 0.2 : 1}
  />
{/snippet}
{#snippet roadLine()}
  <line
    x1={item.a.x}
    y1={item.a.y}
    x2={item.b.x}
    y2={item.b.y}
    stroke="var(--color-theme-primary, #b45309)"
    stroke-width={item.edge.road?.kind === "road" ? 4 : 2}
    stroke-dasharray={item.proposedFeatures.includes("road") ||
    item.edge.road?.kind === "path"
      ? "5 3"
      : undefined}
    stroke-linecap="round"
    opacity={roadDisabled ? 0.2 : 1}
  />
{/snippet}
{#snippet riverLine()}
  <line
    x1={item.a.x}
    y1={item.a.y}
    x2={item.b.x}
    y2={item.b.y}
    stroke="#0284c7"
    stroke-width="3"
    stroke-linecap="round"
    stroke-dasharray={item.proposedFeatures.includes("river")
      ? "5 3"
      : undefined}
    opacity={riverDisabled ? 0.2 : 1}
  />
{/snippet}
{#snippet crossingMarker()}
  <circle
    cx={item.mid.x}
    cy={item.mid.y}
    r="4"
    fill="#fff"
    stroke="#075985"
    stroke-width="2"
  />
{/snippet}

<g>
  {#if item.edge.coast}{@render coastLine()}{/if}
  {#if item.edge.road}{@render roadLine()}{/if}
  {#if item.edge.river}{@render riverLine()}{/if}
  {#if crossingVisible}
    {@render crossingMarker()}
  {/if}
</g>
