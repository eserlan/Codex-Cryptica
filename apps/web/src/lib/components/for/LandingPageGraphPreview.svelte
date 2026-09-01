<script lang="ts">
  import { DEFAULT_CATEGORIES } from "schema";
  import type {
    LandingPageGraphCategory,
    LandingPageGraphPalette,
    LandingPageGraphStep,
    LandingPageSurfaceStyle,
  } from "$lib/content/for/schema";
  import { onMount } from "svelte";
  import {
    getPositions,
    WIDE_VIEWBOX,
    COMPACT_VIEWBOX,
  } from "$lib/components/for/graph-preview-layout";

  let {
    steps,
    palette = "default",
    surfaceStyle = "soft",
  }: {
    steps: LandingPageGraphStep[];
    palette?: LandingPageGraphPalette;
    surfaceStyle?: LandingPageSurfaceStyle;
  } = $props();

  let isSharp = $derived(surfaceStyle === "sharp");
  /** Panel corners, in px. */
  let panelRadius = $derived(isSharp ? 3 : 12);
  /** Relation badge corners, in SVG user units. */
  let badgeRadius = $derived(isSharp ? 2 : 7);

  type GraphPalette = {
    /** Node fill per entity category. */
    categories: Record<LandingPageGraphCategory, string>;
    accent: string;
    selectedLabel: string;
    shellBorder: string;
    shellBg: string;
    canvasBg: string;
    gridDot: string;
    /** Unselected hub spokes. */
    dimEdge: string;
    /** Background web between peripheral nodes. */
    webEdge: string;
    badgeFill: string;
    badgeStroke: string;
    badgeText: string;
    panelBorder: string;
    panelBg: string;
    panelDivider: string;
    panelHighlight: string;
    panelPositive: string;
  };

  const categoryColor = (id: string) =>
    DEFAULT_CATEGORIES.find((c) => c.id === id)?.color ?? "#94a3b8";

  const PALETTES: Record<LandingPageGraphPalette, GraphPalette> = {
    // Canonical vault graph colours, matching WelcomeGraphPreview.
    default: {
      categories: {
        character: categoryColor("character"),
        creature: categoryColor("creature"),
        location: categoryColor("location"),
        item: categoryColor("item"),
        event: categoryColor("event"),
        faction: categoryColor("faction"),
        note: categoryColor("note"),
      },
      accent: "#e6b450",
      selectedLabel: "#fde047",
      shellBorder: "#1e293b",
      shellBg: "#0b0f19",
      canvasBg: "#0b0f19",
      gridDot: "#e2e8f0",
      dimEdge: "#475569",
      webEdge: "#64748b",
      badgeFill: "#0f172a",
      badgeStroke: "#334155",
      badgeText: "#cbd5e1",
      panelBorder: "#1e293b",
      panelBg: "#0f172a",
      panelDivider: "#1e293b",
      panelHighlight: "#fbbf24",
      panelPositive: "#34d399",
    },
    // Dried-blood on near-black, for pages that reveal the graph as a dark layer.
    oxblood: {
      categories: {
        character: "#b91c1c",
        creature: "#dc2626",
        location: "#78350f",
        item: "#a16207",
        event: "#9f1239",
        faction: "#801414",
        note: "#991b1b",
      },
      accent: "#f87171",
      selectedLabel: "#fca5a5",
      shellBorder: "#450a0a",
      shellBg: "#0a0505",
      canvasBg: "#0c0606",
      gridDot: "#801414",
      dimEdge: "#451a1a",
      webEdge: "#451a1a",
      badgeFill: "#140808",
      badgeStroke: "#801414",
      badgeText: "#f87171",
      panelBorder: "#450a0a",
      panelBg: "#120808",
      panelDivider: "#451a1a",
      panelHighlight: "#f87171",
      panelPositive: "#f87171",
    },
  };

  let p = $derived(PALETTES[palette] ?? PALETTES.default);

  const getNodeColor = (step?: LandingPageGraphStep) =>
    p.categories[step?.category ?? "note"];

  let selectAccent = $derived(p.accent);

  // Below `sm` the panel is too narrow for the wide desktop canvas: it scales
  // down uniformly, which crowds all relation badges near the hub and clips
  // outer node labels. Swap in a taller, narrower layout instead.
  let isCompact = $state(false);
  onMount(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => (isCompact = mq.matches);
    update();
    // Safari <14 and some embedded webviews only support the legacy
    // addListener/removeListener pair, matching the fallback in theme.svelte.ts.
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  });

  let viewBox = $derived(isCompact ? COMPACT_VIEWBOX : WIDE_VIEWBOX);
  /** Uniform shrink for node radii, glow, and text on the smaller canvas. */
  let scale = $derived(isCompact ? 0.82 : 1);

  const MAX_LABEL_LENGTH = 16;
  const truncateLabel = (label: string, compact: boolean) =>
    compact && label.length > MAX_LABEL_LENGTH
      ? `${label.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`
      : label;

  let positions = $derived(getPositions(steps.length, isCompact));
  let selectedIndex = $state(0);
  let activeNode = $derived(steps[selectedIndex] || steps[0]);
  let activeColor = $derived(getNodeColor(activeNode));
  let selPos = $derived(positions[selectedIndex % positions.length]);
</script>

<div
  class="flex flex-col md:flex-row min-h-[26rem] sm:min-h-[30rem] md:min-h-[34rem] lg:min-h-[38rem] border text-slate-100 overflow-hidden shadow-2xl"
  style="border-color: {p.shellBorder}; background-color: {p.shellBg}; border-radius: {panelRadius}px;"
>
  <!-- Dark High-Contrast SVG Graph Canvas -->
  <div
    class="relative flex-1 min-h-[22rem] md:min-h-0 p-3"
    style="background-color: {p.canvasBg};"
  >
    <!-- Subtle background grid pattern -->
    <div
      class="absolute inset-0 opacity-20 pointer-events-none"
      style="background-image: radial-gradient({p.gridDot} 1.5px, transparent 1.5px); background-size: 28px 28px;"
    ></div>

    <svg
      viewBox="0 0 {viewBox.width} {viewBox.height}"
      class="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <!-- Peripheral interconnect lines (dim background web) -->
      {#if steps.length > 2}
        <g stroke={p.webEdge} stroke-opacity="0.35" stroke-width="2.5">
          {#each Array(Math.min(steps.length, positions.length) - 2) as _, idx}
            <line
              x1={positions[idx + 1].cx}
              y1={positions[idx + 1].cy}
              x2={positions[idx + 2].cx}
              y2={positions[idx + 2].cy}
            />
          {/each}
        </g>
      {/if}

      <!-- Star/Hub lines connecting Center Node (0) to spokes -->
      {#each steps as step, i}
        {#if i > 0}
          {@const hub = positions[0]}
          {@const pos = positions[i % positions.length]}
          {@const isLinked = selectedIndex === 0 || selectedIndex === i}
          {@const color = isLinked ? selectAccent : p.dimEdge}
          <!-- Distinct from isLinked: the hub being selected links every
               spoke's line, but compact badge visibility should only follow
               the one spoke actually picked, or all 4 badges show at once
               on the default (hub-selected) state. -->
          {@const isSpokeSelected = selectedIndex === i}

          <line
            x1={hub.cx}
            y1={hub.cy}
            x2={pos.cx}
            y2={pos.cy}
            stroke={color}
            stroke-opacity={isLinked ? "0.85" : "0.4"}
            stroke-width={isLinked ? "4.5" : "2"}
          />

          {#if step.relation && (!isCompact || isSpokeSelected)}
            {@const midX = (hub.cx + pos.cx) / 2}
            {@const midY = (hub.cy + pos.cy) / 2}
            <!-- Relation label badge, sized to its text so short relations
                 don't crowd the hub or the neighbouring node labels.
                 Compact canvases only show the badge for the linked spoke —
                 four labels converging on a narrow hub can't stay legible
                 at once, so the rest reveal on selection instead. -->
            {@const badgeW = Math.max(
              54 * scale,
              Math.round(step.relation.length * 7.4 * scale) + 18 * scale,
            )}
            {@const badgeH = 28 * scale}
            <rect
              x={midX - badgeW / 2}
              y={midY - badgeH / 2}
              width={badgeW}
              height={badgeH}
              rx={badgeRadius}
              fill={p.badgeFill}
              fill-opacity="0.95"
              stroke={isLinked ? selectAccent : p.badgeStroke}
              stroke-opacity={isLinked ? "1" : "0.6"}
              stroke-width="1.8"
            />
            <text
              x={midX}
              y={midY + 5 * scale}
              font-family="var(--font-mono, monospace)"
              font-size={12.5 * scale}
              font-weight="700"
              text-anchor="middle"
              fill={isLinked ? selectAccent : p.badgeText}
            >
              {step.relation}
            </text>
          {/if}
        {/if}
      {/each}

      <!-- Selection Glow Halo for Active Node -->
      <circle
        cx={selPos.cx}
        cy={selPos.cy}
        r={64 * scale}
        fill={selectAccent}
        fill-opacity="0.25"
      >
        <animate
          attributeName="opacity"
          values="0.15;0.35;0.15"
          dur="3s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="r"
          values="{52 * scale};{68 * scale};{52 * scale}"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      <!-- Selection dashed bounding box -->
      <rect
        x={selPos.cx - 44 * scale}
        y={selPos.cy - 44 * scale}
        width={88 * scale}
        height={88 * scale}
        rx="18"
        fill="none"
        stroke={selectAccent}
        stroke-opacity="0.85"
        stroke-width="2.5"
        stroke-dasharray="7 5"
      />

      <!-- Render Nodes -->
      {#each steps as step, i}
        {@const pos = positions[i % positions.length]}
        {@const color = getNodeColor(step)}
        {@const isHub = i === 0}
        {@const isSelected = i === selectedIndex}
        {@const r = (isHub ? 38 : 28) * scale}

        <g
          class="cursor-pointer transition-transform hover:scale-110"
          tabindex="0"
          role="button"
          aria-label="Select {step.label}"
          onclick={() => (selectedIndex = i)}
          onkeydown={(e) =>
            (e.key === "Enter" || e.key === " ") && (selectedIndex = i)}
        >
          <!-- Outer selection ring -->
          {#if isSelected}
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={r + 9}
              fill="none"
              stroke={selectAccent}
              stroke-width="4"
            />
          {/if}
          <!-- Main Node circle -->
          <circle
            cx={pos.cx}
            cy={pos.cy}
            {r}
            fill={color}
            fill-opacity="0.95"
          />
          <circle
            cx={pos.cx}
            cy={pos.cy}
            {r}
            fill="none"
            stroke={isSelected ? "#ffffff" : color}
            stroke-opacity={isSelected ? "1" : "0.7"}
            stroke-width="3"
          />

          <!-- High-Contrast Ultra-Legible Label Text.
               The hub label sits above its node: relation badges land at the
               midpoint of every spoke, which crowds the space below the hub. -->
          <text
            x={pos.cx}
            y={pos.cy + (isHub ? -54 : 48) * scale}
            font-family="var(--font-header, serif)"
            font-size={(isHub ? 21 : 17) * scale}
            font-weight="700"
            text-anchor="middle"
            fill={isSelected ? p.selectedLabel : "#ffffff"}
            style="filter: drop-shadow(0px 2px 6px rgba(0, 0, 0, 0.95));"
          >
            {truncateLabel(step.label, isCompact)}
          </text>
        </g>
      {/each}
    </svg>
  </div>

  <!-- Entity Side Detail Panel -->
  {#if activeNode}
    <div
      class="w-full md:w-60 shrink-0 border-t md:border-t-0 md:border-l p-5 text-left flex flex-col justify-between"
      style="border-color: {p.panelBorder}; background-color: {p.panelBg};"
    >
      <div>
        <div
          class="w-12 h-12 mb-3 flex items-center justify-center border shadow-md"
          style="background-color: {activeColor}33; border-color: {p.panelDivider}; border-radius: {panelRadius}px;"
        >
          <span
            class="icon-[lucide--network] w-6 h-6"
            style="color: {activeColor}"
          ></span>
        </div>
        <div
          class="font-header text-base sm:text-lg font-bold text-white leading-tight"
        >
          {activeNode.label}
        </div>
        {#if activeNode.sublabel}
          <div
            class="text-xs font-mono uppercase tracking-[0.18em] mt-1 mb-4 font-bold"
            style="color: {activeColor}"
          >
            {activeNode.sublabel}
          </div>
        {/if}
        <div
          class="space-y-2.5 text-xs font-body leading-relaxed text-slate-300"
        >
          <div
            class="flex items-center justify-between border-b pb-2"
            style="border-color: {p.panelDivider}"
          >
            <span class="text-slate-400">Category</span>
            <span class="text-white font-bold capitalize"
              >{activeNode.sublabel || "Entity"}</span
            >
          </div>
          <div
            class="flex items-center justify-between border-b pb-2"
            style="border-color: {p.panelDivider}"
          >
            <span class="text-slate-400">Vault Mode</span>
            <span class="font-bold" style="color: {p.panelPositive}"
              >Local-first</span
            >
          </div>
          <div
            class="flex items-center gap-1.5 pt-1 font-mono text-[11px] font-bold"
            style="color: {p.panelHighlight}"
          >
            <span class="icon-[lucide--sparkles] w-4 h-4 shrink-0"></span>
            Interactive Web Node
          </div>
        </div>
      </div>

      <div
        class="border-t pt-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between"
        style="border-color: {p.panelBorder}"
      >
        <span>Inspect Node</span>
        <span
          class="icon-[lucide--pointer] w-4 h-4"
          style="color: {p.panelHighlight}"
        ></span>
      </div>
    </div>
  {/if}
</div>
