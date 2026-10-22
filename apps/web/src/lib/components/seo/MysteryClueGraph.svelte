<script lang="ts">
  import {
    buildMysteryGraphDiagram,
    type MysteryGraph,
    type MysteryGraphDiagramNode,
    type MysteryGraphNodeKind,
  } from "generator-engine";

  let { graph }: { graph?: MysteryGraph } = $props();

  const NODE_CLASS: Record<MysteryGraphNodeKind, string> = {
    person: "fill-theme-primary/15 stroke-theme-primary/60",
    place: "fill-theme-accent/15 stroke-theme-accent/60",
    clue: "fill-theme-surface stroke-theme-border",
    revelation: "fill-theme-primary/30 stroke-theme-primary",
  };

  const EDGE_CLASS = {
    found: "stroke-theme-border/60",
    leads: "stroke-theme-accent/80",
    supports: "stroke-theme-primary",
  } as const;

  const MARK_TITLE = {
    culprit: "The culprit",
    "key-item": "Where the key item is now",
  } as const;

  const LEGEND = [
    { swatch: "bg-theme-border/60", label: "found at" },
    { swatch: "bg-theme-accent/80", label: "leads to" },
    { swatch: "bg-theme-primary", label: "supports" },
  ] as const;

  /** Wrap a label onto at most two lines of roughly `limit` characters. */
  function wrap(label: string, limit = 28): string[] {
    const out: string[] = [];
    let current = "";
    for (const word of label.split(" ")) {
      if (current && `${current} ${word}`.length > limit) {
        out.push(current);
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    }
    if (current) out.push(current);
    return out.slice(0, 2);
  }

  const view = $derived(
    graph?.nodes.length
      ? (() => {
          const layout = buildMysteryGraphDiagram(graph);
          return {
            layout,
            nodes: layout.nodes.map((node) => ({
              node,
              lines: wrap(node.label),
            })),
          };
        })()
      : null,
  );

  /** The node whose connections are highlighted; everything else fades. */
  let selectedId = $state<string | null>(null);

  const toggle = (id: string) => (selectedId = selectedId === id ? null : id);

  const touches = (from: string, to: string, id: string | null) =>
    id !== null && (from === id || to === id);

  /** Ids of the selected node and everything directly connected to it. */
  const related = $derived(
    new Set(
      selectedId === null
        ? []
        : [
            selectedId,
            ...(view?.layout.edges ?? [])
              .filter((e) => touches(e.from, e.to, selectedId))
              .flatMap((e) => [e.from, e.to]),
          ],
    ),
  );

  const edgeOpacity = (from: string, to: string) => {
    if (selectedId === null) return 0.55;
    return touches(from, to, selectedId) ? 1 : 0.07;
  };

  const nodeOpacity = (id: string) =>
    selectedId === null || related.has(id) ? 1 : 0.3;

  const lineY = (node: MysteryGraphDiagramNode, count: number, row: number) =>
    node.y + (count === 1 ? 24 : 17 + row * 13);
</script>

{#snippet legend()}
  <ul
    class="flex flex-wrap gap-x-4 gap-y-1 text-micro text-theme-text/70"
    aria-label="Legend"
  >
    {#each LEGEND as item (item.label)}
      <li class="flex items-center gap-1.5">
        <span class="h-0.5 w-5 {item.swatch}"></span>{item.label}
      </li>
    {/each}
    <li><span aria-hidden="true">☠</span> culprit</li>
    <li><span aria-hidden="true">◆</span> key item</li>
  </ul>
{/snippet}

{#snippet graphNode(node: MysteryGraphDiagramNode, lines: string[])}
  <g
    data-node-id={node.id}
    data-kind={node.kind}
    role="button"
    tabindex="0"
    aria-pressed={selectedId === node.id}
    aria-label="{node.label}. Show its connections"
    opacity={nodeOpacity(node.id)}
    class="cursor-pointer outline-none focus-visible:opacity-100"
    onclick={() => toggle(node.id)}
    onkeydown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle(node.id);
      }
    }}
  >
    <rect
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      rx="8"
      class={NODE_CLASS[node.kind]}
      stroke-width={node.mark ? 2.5 : 1}
    />
    {#each lines as line, row (row)}
      <text
        x={node.x + 10}
        y={lineY(node, lines.length, row)}
        class="fill-theme-text/90 font-body"
        font-size="10.5"
      >
        {line}
      </text>
    {/each}
    {#if node.mark}
      <title>{MARK_TITLE[node.mark]}: {node.label}</title>
      <text
        x={node.x + node.width - 8}
        y={node.y + 14}
        text-anchor="end"
        font-size="11"
        class="fill-theme-primary"
      >
        {node.mark === "culprit" ? "☠" : "◆"}
      </text>
    {/if}
  </g>
{/snippet}

{#if view}
  <section
    class="mb-6 w-full rounded-2xl border border-theme-border/50 bg-theme-surface/40 p-4"
    aria-label="GM clue graph"
    data-testid="mystery-clue-graph"
  >
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h3
        class="font-header text-xs font-bold uppercase tracking-wider text-theme-primary"
      >
        Clue Graph — GM Only
      </h3>
      <p class="w-full text-micro text-theme-text/60">
        Select a person, place, clue or conclusion to see what connects to it.
      </p>
      {@render legend()}
    </div>
    <div class="overflow-x-auto">
      <svg
        viewBox="0 0 {view.layout.width} {view.layout.height}"
        class="block h-auto w-full"
        role="img"
        aria-label="Graph of how people, places and clues lead to the conclusions of the case"
      >
        {#each view.layout.edges as edge, i (i)}
          <path
            d={edge.path}
            fill="none"
            class={EDGE_CLASS[edge.kind]}
            opacity={edgeOpacity(edge.from, edge.to)}
            stroke-width={edge.kind === "supports" ? 1.6 : 1}
            stroke-dasharray={edge.kind === "found" ? "3 3" : undefined}
          />
        {/each}
        {#each view.nodes as item (item.node.id)}
          {@render graphNode(item.node, item.lines)}
        {/each}
      </svg>
    </div>
  </section>
{/if}
