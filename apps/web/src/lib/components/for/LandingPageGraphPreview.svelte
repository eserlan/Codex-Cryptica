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

  // Hub & spoke 2D layout matching WelcomeGraphPreview (viewBox 0 0 480 260)
  const POSITIONS = [
    { cx: 240, cy: 130 }, // Center Hub (Node 0)
    { cx: 115, cy: 68 }, // Top Left (Node 1)
    { cx: 365, cy: 75 }, // Top Right (Node 2)
    { cx: 355, cy: 195 }, // Bottom Right (Node 3)
    { cx: 125, cy: 195 }, // Bottom Left (Node 4)
  ];

  let selectedIndex = $state(0);
  let activeNode = $derived(steps[selectedIndex] || steps[0]);
  let activeColor = $derived(getNodeColor(activeNode?.sublabel));
  let selPos = $derived(POSITIONS[selectedIndex % POSITIONS.length]);
</script>

<div
  class="flex h-[18rem] sm:h-[22rem] md:h-[26rem] lg:h-[28rem] rounded-xl border border-theme-border/80 bg-theme-bg/95 overflow-hidden shadow-xl"
  style:background-image="var(--bg-texture-overlay)"
>
  <!-- Graph Canvas -->
  <div class="relative flex-1">
    <svg
      viewBox="0 0 480 260"
      class="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <!-- Peripheral interconnect lines (dim background web) -->
      {#if steps.length > 2}
        <g stroke="#8a8175" stroke-opacity="0.25" stroke-width="1.2">
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
            stroke-opacity={isLinked ? "0.6" : "0.3"}
            stroke-width={isLinked ? "2" : "1.2"}
          />

          {#if step.relation}
            {@const midX = (hub.cx + pos.cx) / 2}
            {@const midY = (hub.cy + pos.cy) / 2}
            <!-- Relation label badge -->
            <rect
              x={midX - 34}
              y={midY - 9}
              width="68"
              height="16"
              rx="4"
              fill="#1a1c23"
              fill-opacity="0.9"
              stroke={isLinked ? SELECT_ACCENT : "#475569"}
              stroke-opacity={isLinked ? "0.8" : "0.4"}
              stroke-width="1"
            />
            <text
              x={midX}
              y={midY + 2.5}
              font-family="var(--font-mono, monospace)"
              font-size="8.5"
              font-weight="600"
              text-anchor="middle"
              fill={isLinked ? SELECT_ACCENT : "#94a3b8"}
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
        r="32"
        fill={SELECT_ACCENT}
        fill-opacity="0.14"
      >
        <animate
          attributeName="opacity"
          values="0.1;0.25;0.1"
          dur="3s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="r"
          values="24;30;24"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      <!-- Selection bounding box -->
      <rect
        x={selPos.cx - 20}
        y={selPos.cy - 20}
        width="40"
        height="40"
        rx="9"
        fill="none"
        stroke={SELECT_ACCENT}
        stroke-opacity="0.6"
        stroke-width="1.2"
        stroke-dasharray="4 3"
      />

      <!-- Render Nodes -->
      {#each steps as step, i}
        {@const pos = POSITIONS[i % POSITIONS.length]}
        {@const color = getNodeColor(step.sublabel)}
        {@const isHub = i === 0}
        {@const isSelected = i === selectedIndex}
        {@const r = isHub ? 13 : 9}

        <g
          class="cursor-pointer transition-transform hover:scale-110"
          tabindex="0"
          role="button"
          aria-label="Select {step.label}"
          onclick={() => (selectedIndex = i)}
          onkeydown={(e) =>
            (e.key === "Enter" || e.key === " ") && (selectedIndex = i)}
        >
          <!-- Node circle -->
          <circle cx={pos.cx} cy={pos.cy} {r} fill={color} fill-opacity="0.9" />
          <circle
            cx={pos.cx}
            cy={pos.cy}
            {r}
            fill="none"
            stroke={isSelected ? SELECT_ACCENT : color}
            stroke-opacity={isSelected ? "1" : "0.6"}
            stroke-width={isSelected ? "2" : "1"}
          />

          <!-- Label text -->
          <text
            x={pos.cx}
            y={pos.cy + (isHub ? 30 : 22)}
            font-family="var(--font-header, serif)"
            font-size={isHub ? "11" : "9.5"}
            font-weight={isHub || isSelected ? "700" : "600"}
            text-anchor="middle"
            fill={isSelected ? "#f6dca0" : "#d7d2c8"}
            fill-opacity={isSelected ? "1" : "0.92"}
          >
            {step.label}
          </text>
        </g>
      {/each}
    </svg>
  </div>

  <!-- Entity Side Detail Panel (matching WelcomeGraphPreview structure) -->
  {#if activeNode}
    <div
      class="w-36 sm:w-44 md:w-52 shrink-0 border-l border-theme-border bg-theme-bg/60 p-4 text-left flex flex-col justify-between"
    >
      <div>
        <div
          class="w-10 h-10 rounded-lg mb-2.5 flex items-center justify-center border border-theme-border/50"
          style="background-color: {activeColor}2e"
        >
          <span
            class="icon-[lucide--network] w-5 h-5"
            style="color: {activeColor}"
          ></span>
        </div>
        <div
          class="font-header text-xs sm:text-sm font-bold text-theme-text leading-tight"
        >
          {activeNode.label}
        </div>
        {#if activeNode.sublabel}
          <div
            class="text-[9px] font-mono uppercase tracking-[0.15em] mt-0.5 mb-3"
            style="color: {activeColor}"
          >
            {activeNode.sublabel}
          </div>
        {/if}
        <div
          class="space-y-1.5 text-[9px] sm:text-[10px] font-body leading-snug text-theme-muted"
        >
          <div>
            Status: <span class="text-theme-text font-medium"
              >Active Graph Node</span
            >
          </div>
          <div>
            Vault Storage: <span class="text-theme-text font-medium"
              >Local First</span
            >
          </div>
          <div
            class="flex items-center gap-1 text-theme-primary pt-1 font-mono text-[9px]"
          >
            <span class="icon-[lucide--sparkles] w-3 h-3 shrink-0"></span>
            Connected Web Node
          </div>
        </div>
      </div>

      <div
        class="border-t border-theme-border/60 pt-2 text-[9px] font-mono text-theme-muted uppercase tracking-wider"
      >
        Click node to inspect
      </div>
    </div>
  {/if}
</div>
