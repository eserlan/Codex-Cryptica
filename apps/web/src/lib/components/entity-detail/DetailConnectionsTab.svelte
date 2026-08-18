<script lang="ts">
  import type { Entity } from "schema";
  import { isEntityVisible } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import {
    MAX_CONNECTION_NODES,
    buildConnectionNeighbors,
    edgeLabelPosition,
    layoutConnectionGraph,
    type ConnectionNeighbor,
  } from "./connections-graph";

  let {
    entity,
    onNavigate,
  }: {
    entity: Entity;
    onNavigate?: (id: string, event?: MouseEvent) => void;
  } = $props();

  const allNeighbors = $derived.by<ConnectionNeighbor[]>(() =>
    buildConnectionNeighbors(entity, {
      getEntity: (id) => vault.entities[id],
      inbound: vault.inboundConnections,
      allEntities: vault.allEntities ?? [],
      isVisible: (candidate) =>
        !vault.isGuest ||
        isEntityVisible(candidate, {
          sharedMode: vault.isGuest,
          defaultVisibility: vault.defaultVisibility,
        }),
    }),
  );

  const neighbors = $derived(allNeighbors.slice(0, MAX_CONNECTION_NODES));
  const hiddenCount = $derived(allNeighbors.length - neighbors.length);
  const positions = $derived(layoutConnectionGraph(neighbors.length));

  const centreColor = $derived(
    categories.getCategory(entity.type)?.color ?? null,
  );
  const entityIsPast = $derived(
    entity.labels?.some((l: string) => l.toLowerCase() === "past") ?? false,
  );

  const colorOf = (type: string) => categories.getCategory(type)?.color ?? null;
  const iconOf = (type: string) =>
    getIconClass(categories.getCategory(type)?.icon);
  const tint = (color: string | null, amount: string) =>
    color ? `color-mix(in srgb, ${color} ${amount}, transparent)` : undefined;

  const relationText = (neighbor: ConnectionNeighbor) =>
    neighbor.relations.map((r) => r.label).join(" · ");

  const relationIcon = (neighbor: ConnectionNeighbor) => {
    const outbound = neighbor.relations.some((r) => r.direction === "outbound");
    const inbound = neighbor.relations.some((r) => r.direction === "inbound");
    if (outbound && inbound) return "icon-[lucide--arrow-left-right]";
    return outbound ? "icon-[lucide--move-right]" : "icon-[lucide--move-left]";
  };

  const describe = (neighbor: ConnectionNeighbor) => {
    const relations = neighbor.relations
      .map((r) =>
        r.direction === "outbound"
          ? `${entity.title} ${r.label} ${neighbor.title}`
          : `${neighbor.title} ${r.label} ${entity.title}`,
      )
      .join(", ");
    return `Open ${neighbor.title} (${relations})`;
  };

  function open(neighborId: string, event: MouseEvent) {
    if (onNavigate) {
      onNavigate(neighborId, event);
      return;
    }
    layoutUIStore.setLastSelectedNodePosition({
      x: event.clientX,
      y: event.clientY,
    });
    vault.selectedEntityId = neighborId;
  }
</script>

<div class="space-y-3" data-testid="connections-tab">
  <p class="text-xs text-theme-muted">
    Direct connections only — entities linked straight to {entity.title}.
  </p>

  <div
    class="relative aspect-[4/3] max-h-[32rem] min-h-[22rem] w-full overflow-hidden rounded-xl border border-theme-border bg-theme-surface/40"
    data-testid="connections-graph"
  >
    <!-- Edges. Drawn in the same 0-100 percentage space the nodes are placed
         in, so the two layers stay aligned at any container size. -->
    <svg
      class="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {#each neighbors as neighbor, i (neighbor.id)}
        {@const position = positions[i]}
        <line
          x1="50"
          y1="50"
          x2={position.x}
          y2={position.y}
          stroke={colorOf(neighbor.type) ?? "currentColor"}
          stroke-opacity="0.45"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
          class="text-theme-border"
        />
      {/each}
    </svg>

    <!-- Relationship labels, as HTML so they inherit theme type styles and
         can carry a direction glyph. -->
    {#each neighbors as neighbor, i (neighbor.id)}
      {@const label = edgeLabelPosition(positions[i], 0.5)}
      <span
        class="pointer-events-none absolute z-10 flex max-w-[8rem] -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-theme-border bg-theme-bg/90 px-1.5 py-0.5 text-[9px] leading-none font-medium text-theme-muted"
        style:left="{label.x}%"
        style:top="{label.y}%"
        data-testid="connection-edge-label"
      >
        <span class="{relationIcon(neighbor)} h-2.5 w-2.5 shrink-0"></span>
        <span class="truncate">{relationText(neighbor)}</span>
      </span>
    {/each}

    <!-- Centre entity: always fixed at the middle, visually dominant. -->
    <div
      class="absolute top-1/2 left-1/2 z-20 flex w-[9rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
      data-testid="connections-centre"
    >
      <span
        class="flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-[0_0_20px_rgba(var(--color-theme-primary-rgb),0.25)] ring-2 ring-theme-primary/50 ring-offset-2 ring-offset-theme-bg"
        style:border-color={centreColor ?? undefined}
        style:background-color={tint(centreColor, "28%")}
      >
        <span
          class="{iconOf(entity.type)} h-7 w-7"
          style:color={centreColor ?? undefined}
        ></span>
      </span>
      <span
        class="max-w-full truncate font-header text-xs font-bold tracking-widest text-theme-text uppercase"
        title={entity.title}
      >
        {entity.title}{#if entityIsPast}<sup aria-hidden="true">*</sup><span
            class="sr-only"
          >
            (past)</span
          >{/if}
      </span>
    </div>

    {#each neighbors as neighbor, i (neighbor.id)}
      {@const position = positions[i]}
      {@const color = colorOf(neighbor.type)}
      <button
        type="button"
        class="group absolute z-20 flex w-[5.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-lg p-1 transition hover:bg-theme-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        style:left="{position.x}%"
        style:top="{position.y}%"
        data-testid="connection-node"
        data-entity-id={neighbor.id}
        aria-label={describe(neighbor)}
        title={neighbor.title}
        onclick={(event) => open(neighbor.id, event)}
      >
        <span
          class="flex h-10 w-10 items-center justify-center rounded-full border transition group-hover:scale-110"
          style:border-color={color ?? undefined}
          style:background-color={tint(color, "22%")}
        >
          <span
            class="{iconOf(neighbor.type)} h-4 w-4"
            style:color={color ?? undefined}
          ></span>
        </span>
        <span
          class="max-w-full truncate text-[10px] leading-tight font-semibold text-theme-text transition-colors group-hover:text-theme-primary"
          aria-hidden="true"
        >
          {neighbor.title}{#if neighbor.hasPastLabel}<sup>*</sup>{/if}
        </span>
      </button>
    {/each}

    {#if neighbors.length === 0}
      <p
        class="absolute inset-x-0 bottom-6 text-center text-sm text-theme-muted italic"
        data-testid="connections-empty"
      >
        No direct connections yet.
      </p>
    {/if}
  </div>

  {#if hiddenCount > 0}
    <p class="text-xs text-theme-muted" data-testid="connections-overflow">
      Showing {neighbors.length} of {allNeighbors.length} connections — open the graph
      view to see the rest.
    </p>
  {/if}
</div>
