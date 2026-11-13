<script lang="ts">
  import type { EdgeItem } from "./geography-overlay-model";
  let { item }: { item: EdgeItem } = $props();
</script>

<g opacity={item.disabled ? 0.2 : 1}>
  {#if item.edge.coast}
    <line
      x1={item.coastA.x}
      y1={item.coastA.y}
      x2={item.coastB.x}
      y2={item.coastB.y}
      stroke="#38bdf8"
      stroke-width="3"
      stroke-linecap="round"
      stroke-dasharray={item.proposed ? "5 3" : undefined}
    />
  {/if}
  {#if item.edge.road}
    <line
      x1={item.a.x}
      y1={item.a.y}
      x2={item.b.x}
      y2={item.b.y}
      stroke="var(--color-theme-primary, #b45309)"
      stroke-width={item.edge.road.kind === "road" ? 4 : 2}
      stroke-dasharray={item.proposed || item.edge.road.kind === "path"
        ? "5 3"
        : undefined}
      stroke-linecap="round"
    />
  {/if}
  {#if item.edge.river}
    <line
      x1={item.a.x}
      y1={item.a.y}
      x2={item.b.x}
      y2={item.b.y}
      stroke="#0284c7"
      stroke-width="3"
      stroke-linecap="round"
      stroke-dasharray={item.proposed ? "5 3" : undefined}
    />
  {/if}
  {#if item.edge.crossing}
    <circle
      cx={item.mid.x}
      cy={item.mid.y}
      r="4"
      fill="#fff"
      stroke="#075985"
      stroke-width="2"
    />
  {/if}
</g>
