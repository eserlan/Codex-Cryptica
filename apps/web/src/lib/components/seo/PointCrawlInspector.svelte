<script lang="ts">
  import {
    formatRouteConnectionLabel,
    pointCrawlNodeRoleLabel,
    pointCrawlNodeRoleSymbol,
    pointCrawlRouteSymbol,
    type PointCrawlNode,
    type PointCrawlRegenTarget,
    type PointCrawlRoute,
  } from "generator-engine";
  import PointCrawlInspectorActions from "./PointCrawlInspectorActions.svelte";

  let {
    node,
    route,
    nodes,
    included = false,
    canUseAI = false,
    busyId = null,
    onToggleSave,
    onRegeneratePart,
  }: {
    node?: PointCrawlNode;
    route?: PointCrawlRoute;
    nodes: PointCrawlNode[];
    included?: boolean;
    canUseAI?: boolean;
    busyId?: string | null;
    onToggleSave?: (nodeId: string) => void;
    onRegeneratePart?: (
      target: PointCrawlRegenTarget,
      instruction?: string,
    ) => void;
  } = $props();

  function nodeNameById(id: string): string {
    return nodes.find((entry) => entry.id === id)?.name ?? id;
  }
</script>

<!-- fallow-ignore-next-line complexity -- one inspector switches between the two mutually exclusive selection types. -->
{#if node}
  <section
    class="mt-3 rounded-xl border border-theme-border/60 bg-theme-bg/60 p-4 text-base leading-relaxed"
    data-testid="point-crawl-node-inspector"
    aria-label={`Location details: ${node.name}`}
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded bg-theme-primary/15 px-2 py-1 font-mono text-xs font-bold uppercase text-theme-text"
            ><span aria-hidden="true">{pointCrawlNodeRoleSymbol(node)}</span>
            {pointCrawlNodeRoleLabel(node)}{#if node.traits?.length}
              · {node.traits.join(", ")}{/if}</span
          >
          <h4 class="font-header text-lg font-bold text-theme-text">
            {node.name}
          </h4>
        </div>
        <p class="mt-1 text-theme-text/85">{node.summary}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        {#if onToggleSave}
          <label
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-theme-border/60 bg-theme-surface/50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-theme-text"
          >
            <input
              type="checkbox"
              checked={included}
              onchange={() => onToggleSave?.(node.id)}
              class="accent-theme-primary"
              data-testid="point-crawl-toggle-save-{node.id}"
            />
            Include in Vault Save
          </label>
        {/if}
        {#if onRegeneratePart}
          <PointCrawlInspectorActions
            target={{ kind: "node", id: node.id }}
            {canUseAI}
            busy={busyId === node.id}
            disabled={busyId !== null}
            label="Regenerate Node"
            {onRegeneratePart}
          />
        {/if}
      </div>
    </div>
    <dl class="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
      <div>
        <dt class="font-bold text-theme-text">Sensory:</dt>
        <dd class="text-theme-text/90">{node.sensoryDescription}</dd>
      </div>
      <div>
        <dt class="font-bold text-theme-text">Why Visit:</dt>
        <dd class="text-theme-text/90">{node.whyVisit}</dd>
      </div>
      <div>
        <dt
          class="border-l-2 border-theme-accent pl-1.5 font-bold text-theme-text"
        >
          Encounter / Hazard:
        </dt>
        <dd class="text-theme-text/90">{node.encounterOrHazard}</dd>
      </div>
      {#if node.clueOrReward}<div>
          <dt
            class="border-l-2 border-theme-primary pl-1.5 font-bold text-theme-text"
          >
            Clue / Reward / Leverage:
          </dt>
          <dd class="text-theme-text/90">{node.clueOrReward}</dd>
        </div>{/if}
    </dl>
  </section>
{:else if route}
  <section
    class="mt-3 rounded-xl border border-theme-border/60 bg-theme-bg/60 p-4 text-base leading-relaxed"
    data-testid="point-crawl-route-inspector"
    aria-label="Route details"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded bg-theme-primary/15 px-2 py-1 font-mono text-xs font-bold uppercase text-theme-text"
            >{route.visibility} · {route.direction}</span
          >
          <h4 class="font-header text-lg font-bold text-theme-text">
            {nodeNameById(route.fromNodeId)}
            {pointCrawlRouteSymbol(route.direction)}
            {nodeNameById(route.toNodeId)}
          </h4>
        </div>
        <p class="mt-1 font-mono text-sm text-theme-text">
          {formatRouteConnectionLabel(route)}
        </p>
      </div>
      {#if onRegeneratePart}
        <PointCrawlInspectorActions
          target={{ kind: "route", id: route.id }}
          {canUseAI}
          busy={busyId === route.id}
          disabled={busyId !== null}
          label="Regenerate Route"
          {onRegeneratePart}
        />
      {/if}
    </div>
    <dl class="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
      <div>
        <dt class="font-mono font-bold text-theme-text">
          → Signpost at Origin:
        </dt>
        <dd class="text-theme-text/90">
          {route.approachFromSource ?? route.signpost}
        </dd>
      </div>
      {#if route.direction === "bidirectional"}<div>
          <dt class="font-mono font-bold text-theme-text">
            ← Approach from {nodeNameById(route.toNodeId)}:
          </dt>
          <dd class="text-theme-text/90">
            {route.approachFromTarget ?? route.signpost}
          </dd>
        </div>{/if}
      <div>
        <dt
          class="border-l-2 border-theme-accent pl-1.5 font-bold text-theme-text"
        >
          Risk / Toll:
        </dt>
        <dd class="text-theme-text/90">{route.risk}</dd>
      </div>
      {#if route.gate}<div class="sm:col-span-2">
          <dt class="font-bold text-theme-accent">Gate ({route.gate.kind}):</dt>
          <dd class="text-theme-text/90">
            Requires <strong>{route.gate.requirement}</strong> (found at {nodeNameById(
              route.gate.unlockedByNodeId,
            )})
          </dd>
        </div>{/if}
    </dl>
  </section>
{/if}
