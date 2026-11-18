<script lang="ts">
  import type { TopicExampleDiagram } from "#lib/content/topics/types.js";

  type Placed = { x: number; y: number };

  let { diagram }: { diagram: TopicExampleDiagram } = $props();

  const uid = $props.id();
  const BOX_W = 120;
  const BOX_H = 38;
  const COLUMNS = 3;
  const X_GAP = 160;
  const Y_GAP = 120;
  const PADDING = 80;

  const placed = $derived(
    diagram.nodes.map((node, i) => ({
      ...node,
      x: PADDING + (i % COLUMNS) * X_GAP,
      y: PADDING + Math.floor(i / COLUMNS) * Y_GAP,
    })),
  );
  const viewBox = $derived.by(() => {
    const columns = Math.max(1, Math.min(COLUMNS, diagram.nodes.length));
    const rows = Math.max(1, Math.ceil(diagram.nodes.length / COLUMNS));
    return `0 0 ${PADDING * 2 + (columns - 1) * X_GAP + BOX_W} ${PADDING * 2 + (rows - 1) * Y_GAP + BOX_H}`;
  });
  const byId = $derived(new Map(placed.map((n) => [n.id, n])));
  const name = (id: string) => byId.get(id)?.name ?? id;

  const routes = $derived(diagram.links.filter((l) => l.kind === "route"));
  const flows = $derived(diagram.links.filter((l) => l.kind === "flow"));

  /** Offset parallel flows on opposite sides of the direct path. */
  function flowGeometry(from: Placed, to: Placed, index: number) {
    const dir = index % 2 === 0 ? -1 : 1;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const nx = -dy / distance;
    const ny = dx / distance;
    const boundaryScale =
      1 / Math.max(Math.abs(dx) / (BOX_W / 2), Math.abs(dy) / (BOX_H / 2));
    const x1 = from.x + dx * boundaryScale;
    const y1 = from.y + dy * boundaryScale;
    const x2 = to.x - dx * boundaryScale;
    const y2 = to.y - dy * boundaryScale;
    const offset = dir * 24;
    const cx = (x1 + x2) / 2 + nx * offset;
    const cy = (y1 + y2) / 2 + ny * offset;
    const labelX = (x1 + 2 * cx + x2) / 4 + nx * dir * 12;
    const labelY = (y1 + 2 * cy + y2) / 4 + ny * dir * 12;
    return {
      d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
      lx: labelX,
      ly: labelY,
    };
  }
</script>

<figure
  class="not-prose my-4 rounded-lg border border-theme-border bg-theme-bg/60 p-3 sm:p-4"
  data-testid="topic-example-diagram"
>
  <svg
    {viewBox}
    class="mx-auto block h-auto w-full max-w-sm select-none"
    role="img"
    aria-labelledby="{uid}-title"
    aria-describedby="{uid}-desc"
  >
    <title id="{uid}-title">{diagram.title}</title>
    <desc id="{uid}-desc">{diagram.description}</desc>
    <defs>
      <marker
        id="{uid}-arrow"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 1.5 L 9 5 L 0 8.5 z" class="fill-theme-text stroke-none"
        ></path>
      </marker>
    </defs>

    {#each routes as link (link.from + link.to + link.kind)}
      {@const a = byId.get(link.from)}
      {@const b = byId.get(link.to)}
      {#if a && b}
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          class={link.flashpoint
            ? "stroke-theme-primary"
            : "stroke-theme-muted"}
          stroke-width={link.flashpoint ? 4 : 3}
          stroke-dasharray={link.flashpoint ? "8 5" : undefined}
        ></line>
        {#if link.flashpoint}
          <text
            x={(a.x + b.x) / 2 - 12}
            y={(a.y + b.y) / 2}
            text-anchor="end"
            font-size="13"
            font-weight="700"
            class="fill-theme-text"
          >
            Missing convoy
          </text>
        {/if}
      {/if}
    {/each}

    {#each flows as link, i (link.from + link.to + link.kind)}
      {@const a = byId.get(link.from)}
      {@const b = byId.get(link.to)}
      {#if a && b}
        {@const g = flowGeometry(a, b, i)}
        <path
          d={g.d}
          fill="none"
          class="stroke-theme-text"
          stroke-width="2"
          marker-end="url(#{uid}-arrow)"
        ></path>
        <text
          x={g.lx}
          y={g.ly}
          text-anchor="middle"
          font-size="14"
          class="fill-theme-text"
        >
          {link.label}
        </text>
      {/if}
    {/each}

    {#each placed as node (node.id)}
      <rect
        x={node.x - BOX_W / 2}
        y={node.y - BOX_H / 2}
        width={BOX_W}
        height={BOX_H}
        rx="6"
        class="fill-theme-surface stroke-theme-border"
        stroke-width="1.5"
      ></rect>
      <text
        x={node.x}
        y={node.y + 5}
        text-anchor="middle"
        font-size="14"
        font-weight="700"
        class="fill-theme-text"
      >
        {node.name}
      </text>
    {/each}
  </svg>

  <div class="mt-3 space-y-1 text-sm text-theme-text">
    {#each diagram.nodes as node (node.id)}
      <p><span class="font-bold">{node.name}:</span> {node.role}</p>
    {/each}
  </div>

  <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-theme-text">
    {#each diagram.links as link (link.from + link.to + link.kind)}
      <li>
        <span class="font-bold">{name(link.from)} to {name(link.to)}</span>
        ({link.kind === "flow" ? "flow" : "route"}: {link.label}).
        {#if link.flashpoint}
          <strong class="font-bold">Active flashpoint.</strong>
        {/if}
        {link.detail}
      </li>
    {/each}
  </ol>
</figure>
