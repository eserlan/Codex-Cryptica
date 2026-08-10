<script lang="ts">
  import { DEFAULT_CATEGORIES } from "schema";
  import type { LandingPageGraphStep } from "$lib/content/for/schema";

  let { steps }: { steps: LandingPageGraphStep[] } = $props();

  // Color resolution matching WelcomeGraphPreview & canonical graph palette
  const typeColor = (id: string) =>
    DEFAULT_CATEGORIES.find((c) => c.id === id)?.color ?? "#e6b450";

  function getNodeColor(sublabel?: string): string {
    if (!sublabel) return "#e6b450";
    const key = sublabel.toLowerCase();
    if (
      key.includes("character") ||
      key.includes("vampire") ||
      key.includes("archmage")
    )
      return typeColor("character");
    if (
      key.includes("location") ||
      key.includes("haven") ||
      key.includes("city hub") ||
      key.includes("manor")
    )
      return typeColor("location");
    if (
      key.includes("faction") ||
      key.includes("court") ||
      key.includes("guild")
    )
      return typeColor("faction");
    if (key.includes("event") || key.includes("heirloom"))
      return typeColor("event");
    if (
      key.includes("creature") ||
      key.includes("hunter") ||
      key.includes("dhampir")
    )
      return typeColor("creature");
    return typeColor("note");
  }

  const SELECT_ACCENT = "#e6b450";

  // Spanned 2D viewBox (540 x 280) with enlarged node coordinates and spacing
  const POSITIONS = [
    { cx: 270, cy: 140 }, // Center Hub (Node 0)
    { cx: 120, cy: 70 }, // Top Left (Node 1)
    { cx: 420, cy: 80 }, // Top Right (Node 2)
    { cx: 410, cy: 215 }, // Bottom Right (Node 3)
    { cx: 130, cy: 215 }, // Bottom Left (Node 4)
  ];

  let selectedIndex = $state(0);
  let activeNode = $derived(steps[selectedIndex] || steps[0]);
  let activeColor = $derived(getNodeColor(activeNode?.sublabel));
  let selPos = $derived(POSITIONS[selectedIndex % POSITIONS.length]);
</script>

<div
  class="flex flex-col md:flex-row h-[22rem] sm:h-[26rem] md:h-[30rem] lg:h-[34rem] xl:h-[36rem] rounded-xl border border-theme-border/80 bg-theme-bg/95 overflow-hidden shadow-2xl"
  style:background-image="var(--bg-texture-overlay)"
>
  <!-- Graph Canvas -->
  <div class="relative flex-1 min-h-[16rem] md:min-h-0">
    <svg
      viewBox="0 0 540 280"
      class="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <!-- Peripheral interconnect lines (dim background web) -->
      {#if steps.length > 2}
        <g stroke="#8a8175" stroke-opacity="0.3" stroke-width="1.8">
          <line
            x1={POSITIONS[1].cx}
            y1={POSITIONS[1].cy}
            x2={POSITIONS[2].cx}
            y2={POSITIONS[2].cy}
          />
          {#if steps.length > 3}
            <line
              x1={POSITIONS[2].cx}
              y1={POSITIONS[2].cy}
              x2={POSITIONS[3].cx}
              y2={POSITIONS[3].cy}
            />
          {/if}
        </g>
      {/if}

      <!-- Star/Hub lines connecting Center Node (0) to spokes -->
      {#each steps as step, i}
        {#if i > 0}
          {@const hub = POSITIONS[0]}
          {@const pos = POSITIONS[i % POSITIONS.length]}
          {@const isLinked = selectedIndex === 0 || selectedIndex === i}
          {@const color = isLinked ? SELECT_ACCENT : "#8a8175"}

          <line
            x1={hub.cx}
            y1={hub.cy}
            x2={pos.cx}
            y2={pos.cy}
            stroke={color}
            stroke-opacity={isLinked ? "0.75" : "0.35"}
            stroke-width={isLinked ? "2.8" : "1.5"}
          />

          {#if step.relation}
            {@const midX = (hub.cx + pos.cx) / 2}
            {@const midY = (hub.cy + pos.cy) / 2}
            <!-- Relation label badge -->
            <rect
              x={midX - 42}
              y={midY - 11}
              width="84"
              height="22"
              rx="6"
              fill="#14161f"
              fill-opacity="0.95"
              stroke={isLinked ? SELECT_ACCENT : "#475569"}
              stroke-opacity={isLinked ? "0.9" : "0.5"}
              stroke-width="1.2"
            />
            <text
              x={midX}
              y={midY + 3.5}
              font-family="var(--font-mono, monospace)"
              font-size="10.5"
              font-weight="700"
              text-anchor="middle"
              fill={isLinked ? SELECT_ACCENT : "#cbd5e1"}
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
        r="42"
        fill={SELECT_ACCENT}
        fill-opacity="0.18"
      >
        <animate
          attributeName="opacity"
          values="0.12;0.3;0.12"
          dur="3s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="r"
          values="32;44;32"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      <!-- Selection bounding box -->
      <rect
        x={selPos.cx - 27}
        y={selPos.cy - 27}
        width="54"
        height="54"
        rx="12"
        fill="none"
        stroke={SELECT_ACCENT}
        stroke-opacity="0.7"
        stroke-width="1.5"
        stroke-dasharray="5 3"
      />

      <!-- Render Nodes -->
      {#each steps as step, i}
        {@const pos = POSITIONS[i % POSITIONS.length]}
        {@const color = getNodeColor(step.sublabel)}
        {@const isHub = i === 0}
        {@const isSelected = i === selectedIndex}
        {@const r = isHub ? 20 : 15}

        <g
          class="cursor-pointer transition-transform hover:scale-110"
          tabindex="0"
          role="button"
          aria-label="Select {step.label}"
          onclick={() => (selectedIndex = i)}
          onkeydown={(e) =>
            (e.key === "Enter" || e.key === " ") && (selectedIndex = i)}
        >
          <!-- Outer ring -->
          {#if isSelected}
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={r + 6}
              fill="none"
              stroke={SELECT_ACCENT}
              stroke-width="2.5"
            />
          {/if}
          <!-- Node circle -->
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
            stroke-width="2"
          />

          <!-- Label text -->
          <text
            x={pos.cx}
            y={pos.cy + (isHub ? 38 : 32)}
            font-family="var(--font-header, serif)"
            font-size={isHub ? "14" : "12"}
            font-weight={isHub || isSelected ? "700" : "600"}
            text-anchor="middle"
            fill={isSelected ? "#f6dca0" : "#f1f5f9"}
            fill-opacity={isSelected ? "1" : "0.95"}
          >
            {step.label}
          </text>
        </g>
      {/each}
    </svg>
  </div>

  <!-- Entity Side Detail Panel -->
  {#if activeNode}
    <div
      class="w-full md:w-56 shrink-0 border-t md:border-t-0 md:border-l border-theme-border bg-theme-bg/80 p-5 text-left flex flex-col justify-between"
    >
      <div>
        <div
          class="w-12 h-12 rounded-xl mb-3 flex items-center justify-center border border-theme-border/60 shadow-sm"
          style="background-color: {activeColor}2e"
        >
          <span
            class="icon-[lucide--network] w-6 h-6"
            style="color: {activeColor}"
          ></span>
        </div>
        <div
          class="font-header text-sm sm:text-base font-bold text-theme-text leading-tight"
        >
          {activeNode.label}
        </div>
        {#if activeNode.sublabel}
          <div
            class="text-[10px] sm:text-xs font-mono uppercase tracking-[0.16em] mt-1 mb-4 font-bold"
            style="color: {activeColor}"
          >
            {activeNode.sublabel}
          </div>
        {/if}
        <div
          class="space-y-2 text-xs font-body leading-relaxed text-theme-muted"
        >
          <div
            class="flex items-center justify-between border-b border-theme-border/40 pb-1.5"
          >
            <span>Graph Node Type</span>
            <span class="text-theme-text font-bold capitalize"
              >{activeNode.sublabel || "Entity"}</span
            >
          </div>
          <div
            class="flex items-center justify-between border-b border-theme-border/40 pb-1.5"
          >
            <span>Vault Storage</span>
            <span class="text-theme-text font-bold">Local-first</span>
          </div>
          <div
            class="flex items-center gap-1.5 text-theme-primary pt-1 font-mono text-[10px] font-bold"
          >
            <span class="icon-[lucide--sparkles] w-3.5 h-3.5 shrink-0"></span>
            Connected Web Entity
          </div>
        </div>
      </div>

      <div
        class="border-t border-theme-border/60 pt-3 text-[10px] font-mono text-theme-muted uppercase tracking-wider flex items-center justify-between"
      >
        <span>Interactive Node</span>
        <span class="icon-[lucide--pointer] w-3.5 h-3.5 text-theme-primary"
        ></span>
      </div>
    </div>
  {/if}
</div>
