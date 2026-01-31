<script lang="ts">
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { getRulerTicks, getEraRegions, getSequentialYearPositions } from "graph-engine";
  import type { Core } from "cytoscape";
  import { onMount } from "svelte";

  let { cy } = $props<{ cy: Core }>();

  let transform = $state({ x: 0, y: 0, k: 1 });

  const updateTransform = () => {
    if (!cy) return;
    const pan = cy.pan();
    const zoom = cy.zoom();
    transform = { x: pan.x, y: pan.y, k: zoom };
  };

  onMount(() => {
    cy.on('pan zoom', updateTransform);
    updateTransform();
    return () => cy.off('pan zoom', updateTransform);
  });

  let yearPositions = $derived.by(() => {
    const years = Object.values(vault.entities)
      .map(e => e.date?.year ?? e.start_date?.year ?? e.end_date?.year)
      .filter((y): y is number => y !== undefined);
    
    return getSequentialYearPositions(years, graph.timelineScale);
  });

  let ticks = $derived(getRulerTicks(yearPositions));
  let eraRegions = $derived(getEraRegions(graph.eras, yearPositions));
</script>

{#if graph.timelineMode}
  <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <svg class="w-full h-full">
      <g transform="translate({transform.x}, {transform.y}) scale({transform.k})">
        <!-- Era Backgrounds -->
        {#each eraRegions as era}
          {#if graph.timelineAxis === 'x'}
            <rect 
              x={era.startPos - 50} 
              y="-5000" 
              width={era.endPos - era.startPos + 100} 
              height="10000" 
              fill={era.color || '#a855f7'} 
              fill-opacity="0.05"
            />
            <text 
              x={era.startPos} 
              y="-200" 
              fill={era.color || '#a855f7'} 
              fill-opacity="0.3"
              class="text-[40px] font-bold uppercase tracking-[0.5em] font-mono"
            >
              {era.name}
            </text>
          {:else}
            <rect 
              x="-5000" 
              y={era.startPos - 50} 
              width="10000" 
              height={era.endPos - era.startPos + 100} 
              fill={era.color || '#a855f7'} 
              fill-opacity="0.05"
            />
            <text 
              x="-400" 
              y={era.startPos} 
              fill={era.color || '#a855f7'} 
              fill-opacity="0.3"
              transform="rotate(-90, -400, {era.startPos})"
              class="text-[40px] font-bold uppercase tracking-[0.5em] font-mono"
            >
              {era.name}
            </text>
          {/if}
        {/each}

        <!-- Ruler Ticks -->
        {#each ticks as tick}
          {#if graph.timelineAxis === 'x'}
            <line 
              x1={tick.pos} y1="-10000" 
              x2={tick.pos} y2="10000" 
              stroke="#a855f7" 
              stroke-opacity={tick.isMajor ? 0.1 : 0.03} 
              stroke-dasharray={tick.isMajor ? "" : "5,5"}
            />
            <text 
              x={tick.pos + 5} 
              y="20" 
              fill="#a855f7" 
              fill-opacity="0.2"
              class="text-[12px] font-mono font-bold"
            >
              {tick.year}
            </text>
          {:else}
            <line 
              x1="-10000" y1={tick.pos} 
              x2="10000" y2={tick.pos} 
              stroke="#a855f7" 
              stroke-opacity={tick.isMajor ? 0.1 : 0.03} 
              stroke-dasharray={tick.isMajor ? "" : "5,5"}
            />
            <text 
              x="20" 
              y={tick.pos - 5} 
              fill="#a855f7" 
              fill-opacity="0.2"
              class="text-[12px] font-mono font-bold"
            >
              {tick.year}
            </text>
          {/if}
        {/each}
      </g>
    </svg>
  </div>
{/if}
