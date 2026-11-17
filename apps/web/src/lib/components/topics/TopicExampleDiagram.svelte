<script lang="ts">
  import type {
    TopicDiagramNode,
    TopicExampleDiagram,
  } from "#lib/content/topics/types.js";

  let { diagram }: { diagram: TopicExampleDiagram } = $props();

  const uid = $props.id();
  const BOX_W = 110;
  const BOX_H = 36;
  const SLOTS = [
    { x: 180, y: 40 },
    { x: 65, y: 190 },
    { x: 295, y: 190 },
  ];

  const placed = $derived(
    diagram.nodes.map((node, i) => ({ ...node, ...SLOTS[i] })),
  );
  const byId = $derived(new Map(placed.map((n) => [n.id, n])));
  const name = (id: string) =>
    diagram.nodes.find((n: TopicDiagramNode) => n.id === id)?.name ?? id;

  const routes = $derived(diagram.links.filter((l) => l.kind === "route"));
  const flows = $derived(diagram.links.filter((l) => l.kind === "flow"));

  function flowGeometry(from: string, to: string, index: number) {
    const a = byId.get(from)!;
    const b = byId.get(to)!;
    const sign = b.x > a.x ? 1 : -1;
    const off = 15 - 30 * index;
    const x1 = a.x + sign * off;
    const x2 = b.x - sign * off;
    const y = a.y + BOX_H / 2;
    const cy = y + 42 + index * 45;
    return {
      d: `M ${x1} ${y} Q ${(x1 + x2) / 2} ${cy} ${x2} ${y}`,
      lx: (x1 + x2) / 2,
      ly: y + (cy - y) / 2 + 14,
    };
  }
</script>

<figure
  class="not-prose my-4 rounded-lg border border-theme-border bg-theme-bg/60 p-3 sm:p-4"
  data-testid="topic-example-diagram"
>
  <svg
    viewBox="0 0 360 290"
    class="mx-auto block h-auto w-full max-w-md select-none"
    role="img"
    aria-labelledby="{uid}-title {uid}-desc"
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
      {@const a = byId.get(link.from)!}
      {@const b = byId.get(link.to)!}
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        class={link.flashpoint ? "stroke-theme-primary" : "stroke-theme-border"}
        stroke-width={link.flashpoint ? 4 : 3}
        stroke-dasharray={link.flashpoint ? "8 5" : undefined}
      ></line>
      {#if link.flashpoint}
        <text
          x={(a.x + b.x) / 2 - 12}
          y={(a.y + b.y) / 2}
          text-anchor="end"
          font-size="12"
          font-weight="700"
          class="fill-theme-primary"
        >
          Missing convoy
        </text>
      {/if}
    {/each}

    {#each flows as link, i (link.from + link.to + link.kind)}
      {@const g = flowGeometry(link.from, link.to, i)}
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
        font-size="12"
        class="fill-theme-text"
      >
        {link.label}
      </text>
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
        y={node.y + 4.5}
        text-anchor="middle"
        font-size="13"
        font-weight="700"
        class="fill-theme-text"
      >
        {node.name}
      </text>
    {/each}
  </svg>

  <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-theme-text">
    {#each diagram.links as link (link.from + link.to + link.kind)}
      <li>
        <span class="font-bold">{name(link.from)} to {name(link.to)}</span>
        ({link.kind === "flow" ? "flow" : "route"}: {link.label}).
        {#if link.flashpoint}
          <strong class="text-theme-primary">Active flashpoint.</strong>
        {/if}
        {link.detail}
      </li>
    {/each}
  </ol>
</figure>
