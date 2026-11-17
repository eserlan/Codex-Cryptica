<script lang="ts">
  import type { TopicExampleDiagram } from "#lib/content/topics/types.js";

  type Placed = { x: number; y: number };

  let { diagram }: { diagram: TopicExampleDiagram } = $props();

  const uid = $props.id();
  const BOX_W = 120;
  const BOX_H = 38;
  const SLOTS = [
    { x: 160, y: 36 },
    { x: 62, y: 170 },
    { x: 258, y: 170 },
  ];

  const placed = $derived(
    diagram.nodes.map((node, i) => ({ ...node, ...SLOTS[i] })),
  );
  const byId = $derived(new Map(placed.map((n) => [n.id, n])));
  const name = (id: string) => byId.get(id)?.name ?? id;

  const routes = $derived(diagram.links.filter((l) => l.kind === "route"));
  const flows = $derived(diagram.links.filter((l) => l.kind === "flow"));

  /** First flow arcs above the node row, the next below, so each reads alone. */
  function flowGeometry(from: Placed, to: Placed, index: number) {
    const dir = index % 2 === 0 ? -1 : 1;
    const sign = to.x > from.x ? 1 : -1;
    const x1 = from.x + (sign * BOX_W) / 2;
    const x2 = to.x - (sign * BOX_W) / 2;
    const y = from.y + dir * 10;
    const cy = y + dir * 44;
    const peak = y + dir * 22;
    return {
      d: `M ${x1} ${y} Q ${(x1 + x2) / 2} ${cy} ${x2} ${y}`,
      lx: (x1 + x2) / 2,
      ly: dir < 0 ? peak - 8 : peak + 17,
    };
  }
</script>

<figure
  class="not-prose my-4 rounded-lg border border-theme-border bg-theme-bg/60 p-3 sm:p-4"
  data-testid="topic-example-diagram"
>
  <svg
    viewBox="0 0 320 228"
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
