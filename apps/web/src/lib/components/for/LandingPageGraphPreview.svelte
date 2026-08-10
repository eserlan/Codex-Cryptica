<script lang="ts">
  import type { LandingPageGraphStep } from "$lib/content/for/schema";

  let { steps }: { steps: LandingPageGraphStep[] } = $props();

  // Canonical node colors matching real graph / WelcomeGraphPreview
  const CATEGORY_COLORS: Record<string, string> = {
    character: "#3b82f6", // blue
    vampire: "#a855f7", // purple
    archmage: "#3b82f6", // blue
    location: "#10b981", // emerald
    haven: "#10b981", // emerald
    "city hub": "#10b981", // emerald
    faction: "#f59e0b", // amber
    court: "#f59e0b", // amber
    guild: "#f59e0b", // amber
    event: "#ec4899", // pink
    hunter: "#ef4444", // red
    dhampir: "#ef4444", // red
    default: "#e6b450", // gold
  };

  function getNodeColor(sublabel?: string): string {
    if (!sublabel) return CATEGORY_COLORS.default;
    const key = sublabel.toLowerCase();
    for (const [k, color] of Object.entries(CATEGORY_COLORS)) {
      if (key.includes(k)) return color;
    }
    return CATEGORY_COLORS.default;
  }

  // Calculate 2D SVG coordinates for up to 4 nodes in a staggered network layout
  const NODE_POSITIONS = [
    { cx: 75, cy: 110 },
    { cx: 185, cy: 175 },
    { cx: 295, cy: 85 },
    { cx: 405, cy: 155 },
  ];

  let selectedIndex = $state(0);
  let activeNode = $derived(steps[selectedIndex] || steps[0]);
  let activeColor = $derived(getNodeColor(activeNode?.sublabel));
</script>

<div
  class="rounded-xl border border-theme-border/80 bg-theme-bg/95 p-4 sm:p-6 shadow-inner"
>
  <div
    class="flex flex-col md:flex-row h-[18rem] sm:h-[21rem] md:h-[23rem] gap-4"
  >
    <!-- SVG Graph Canvas -->
    <div
      class="relative flex-1 rounded-lg border border-theme-border/40 bg-theme-bg/80 overflow-hidden"
    >
      <svg
        viewBox="0 0 480 250"
        class="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <!-- Connection Edges with Relation Labels -->
        {#each steps as step, i}
          {#if i < steps.length - 1}
            {@const p1 = NODE_POSITIONS[i % NODE_POSITIONS.length]}
            {@const p2 = NODE_POSITIONS[(i + 1) % NODE_POSITIONS.length]}
            {@const midX = (p1.cx + p2.cx) / 2}
            {@const midY = (p1.cy + p2.cy) / 2}

            <line
              x1={p1.cx}
              y1={p1.cy}
              x2={p2.cx}
              y2={p2.cy}
              stroke={i === selectedIndex || i + 1 === selectedIndex
                ? activeColor
                : "#8a8175"}
              stroke-opacity={i === selectedIndex || i + 1 === selectedIndex
                ? "0.75"
                : "0.3"}
              stroke-width={i === selectedIndex || i + 1 === selectedIndex
                ? "2.2"
                : "1.2"}
            />

            {#if step.relation}
              <!-- Relation Label -->
              <rect
                x={midX - 32}
                y={midY - 10}
                width="64"
                height="16"
                rx="4"
                fill="var(--color-theme-surface, #1e293b)"
                stroke="var(--color-theme-border, #334155)"
                stroke-width="0.8"
              />
              <text
                x={midX}
                y={midY + 1.5}
                font-family="var(--font-mono, monospace)"
                font-size="8.5"
                text-anchor="middle"
                fill="var(--color-theme-primary, #e6b450)"
                font-weight="600"
              >
                {step.relation}
              </text>
            {/if}
          {/if}
        {/each}

        <!-- Nodes -->
        {#each steps as step, i}
          {@const pos = NODE_POSITIONS[i % NODE_POSITIONS.length]}
          {@const color = getNodeColor(step.sublabel)}
          {@const isSelected = i === selectedIndex}

          <!-- Active Glow Halo -->
          {#if isSelected}
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r="26"
              fill={color}
              fill-opacity="0.18"
            >
              <animate
                attributeName="r"
                values="22;28;22"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.15;0.3;0.15"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
            <rect
              x={pos.cx - 20}
              y={pos.cy - 20}
              width="40"
              height="40"
              rx="8"
              fill="none"
              stroke={color}
              stroke-opacity="0.6"
              stroke-width="1.5"
              stroke-dasharray="3 2"
            />
          {/if}

          <!-- Clickable Node Circle -->
          <g
            class="cursor-pointer transition-transform hover:scale-110"
            tabindex="0"
            role="button"
            aria-label="Select {step.label}"
            onclick={() => (selectedIndex = i)}
            onkeydown={(e) =>
              (e.key === "Enter" || e.key === " ") && (selectedIndex = i)}
          >
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r="12"
              fill={color}
              fill-opacity="0.9"
            />
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r="12"
              fill="none"
              stroke={isSelected ? "#ffffff" : color}
              stroke-opacity={isSelected ? "1" : "0.5"}
              stroke-width={isSelected ? "2" : "1"}
            />

            <!-- Node Label -->
            <text
              x={pos.cx}
              y={pos.cy + 26}
              font-family="var(--font-header, serif)"
              font-size="10.5"
              font-weight="700"
              text-anchor="middle"
              fill={isSelected ? "var(--color-theme-text, #ffffff)" : "#d7d2c8"}
            >
              {step.label}
            </text>
          </g>
        {/each}
      </svg>
    </div>

    <!-- Entity Sidebar Panel (matching WelcomeGraphPreview) -->
    {#if activeNode}
      <div
        class="w-full md:w-52 shrink-0 rounded-lg border border-theme-border bg-theme-surface/70 p-4 text-left shadow-sm flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center gap-2.5 mb-2">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-theme-primary/20 bg-theme-primary/10"
              style="background-color: {activeColor}22"
            >
              <span
                class="icon-[lucide--network] h-5 w-5"
                style="color: {activeColor}"
              ></span>
            </div>
            <div>
              <div
                class="font-header text-sm font-bold text-theme-text leading-tight"
              >
                {activeNode.label}
              </div>
              {#if activeNode.sublabel}
                <div
                  class="font-mono text-[9px] font-bold uppercase tracking-[0.16em]"
                  style="color: {activeColor}"
                >
                  {activeNode.sublabel}
                </div>
              {/if}
            </div>
          </div>

          <div
            class="mt-4 space-y-2 text-xs font-body leading-relaxed text-theme-muted"
          >
            <div class="flex items-center gap-1.5 text-theme-text/90">
              <span class="icon-[lucide--link] h-3.5 w-3.5 text-theme-primary"
              ></span>
              <span>Connected Entity</span>
            </div>
            <p class="font-light text-[11px]">
              Part of the campaign's interactive graph web. Linked dynamically
              in your local vault.
            </p>
          </div>
        </div>

        <div
          class="mt-4 border-t border-theme-border/60 pt-3 flex items-center justify-between font-mono text-[10px] text-theme-primary"
        >
          <span>Interactive Preview</span>
          <span class="icon-[lucide--sparkles] h-3.5 w-3.5"></span>
        </div>
      </div>
    {/if}
  </div>
</div>
