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

  // Spanned 2D viewBox (540 x 280) tuned for aspect ratio fill
  const POSITIONS = [
    { cx: 270, cy: 140 }, // Center Hub (Node 0)
    { cx: 85, cy: 65 }, // Top Left (Node 1)
    { cx: 455, cy: 75 }, // Top Right (Node 2)
    { cx: 435, cy: 220 }, // Bottom Right (Node 3)
    { cx: 105, cy: 220 }, // Bottom Left (Node 4)
  ];

  let selectedIndex = $state(0);
  let activeNode = $derived(steps[selectedIndex] || steps[0]);
  let activeColor = $derived(getNodeColor(activeNode?.sublabel));
  let selPos = $derived(POSITIONS[selectedIndex % POSITIONS.length]);
</script>

<div
  class="flex flex-col md:flex-row min-h-[26rem] sm:min-h-[30rem] md:min-h-[34rem] lg:min-h-[38rem] rounded-xl border border-theme-border/80 bg-[#0b0f19] text-slate-100 overflow-hidden shadow-2xl"
>
  <!-- Dark High-Contrast SVG Graph Canvas -->
  <div class="relative flex-1 min-h-[22rem] md:min-h-0 bg-[#0b0f19] p-3">
    <!-- Subtle background grid pattern -->
    <div
      class="absolute inset-0 opacity-20 pointer-events-none"
      style="background-image: radial-gradient(#e2e8f0 1.5px, transparent 1.5px); background-size: 28px 28px;"
    ></div>

    <svg
      viewBox="0 0 540 280"
      class="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <!-- Peripheral interconnect lines (dim background web) -->
      {#if steps.length > 2}
        <g stroke="#64748b" stroke-opacity="0.35" stroke-width="2.5">
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
          {@const color = isLinked ? SELECT_ACCENT : "#475569"}

          <line
            x1={hub.cx}
            y1={hub.cy}
            x2={pos.cx}
            y2={pos.cy}
            stroke={color}
            stroke-opacity={isLinked ? "0.85" : "0.4"}
            stroke-width={isLinked ? "4.5" : "2"}
          />

          {#if step.relation}
            {@const midX = (hub.cx + pos.cx) / 2}
            {@const midY = (hub.cy + pos.cy) / 2}
            <!-- Relation label badge -->
            <rect
              x={midX - 54}
              y={midY - 14}
              width="108"
              height="28"
              rx="7"
              fill="#0f172a"
              fill-opacity="0.95"
              stroke={isLinked ? SELECT_ACCENT : "#334155"}
              stroke-opacity={isLinked ? "1" : "0.6"}
              stroke-width="1.8"
            />
            <text
              x={midX}
              y={midY + 5}
              font-family="var(--font-mono, monospace)"
              font-size="12.5"
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
        r="64"
        fill={SELECT_ACCENT}
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
          values="52;68;52"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      <!-- Selection dashed bounding box -->
      <rect
        x={selPos.cx - 44}
        y={selPos.cy - 44}
        width="88"
        height="88"
        rx="18"
        fill="none"
        stroke={SELECT_ACCENT}
        stroke-opacity="0.85"
        stroke-width="2.5"
        stroke-dasharray="7 5"
      />

      <!-- Render Nodes -->
      {#each steps as step, i}
        {@const pos = POSITIONS[i % POSITIONS.length]}
        {@const color = getNodeColor(step.sublabel)}
        {@const isHub = i === 0}
        {@const isSelected = i === selectedIndex}
        {@const r = isHub ? 38 : 28}

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
              stroke={SELECT_ACCENT}
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

          <!-- High-Contrast Ultra-Legible Label Text -->
          <text
            x={pos.cx}
            y={pos.cy + (isHub ? 58 : 48)}
            font-family="var(--font-header, serif)"
            font-size={isHub ? "21" : "17"}
            font-weight="700"
            text-anchor="middle"
            fill={isSelected ? "#fde047" : "#ffffff"}
            style="filter: drop-shadow(0px 2px 6px rgba(0, 0, 0, 0.95));"
          >
            {step.label}
          </text>
        </g>
      {/each}
    </svg>
  </div>

  <!-- Entity Side Detail Panel (High Contrast Slate) -->
  {#if activeNode}
    <div
      class="w-full md:w-60 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 bg-[#0f172a] p-5 text-left flex flex-col justify-between"
    >
      <div>
        <div
          class="w-12 h-12 rounded-xl mb-3 flex items-center justify-center border border-slate-700 shadow-md"
          style="background-color: {activeColor}33"
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
            class="flex items-center justify-between border-b border-slate-800 pb-2"
          >
            <span class="text-slate-400">Category</span>
            <span class="text-white font-bold capitalize"
              >{activeNode.sublabel || "Entity"}</span
            >
          </div>
          <div
            class="flex items-center justify-between border-b border-slate-800 pb-2"
          >
            <span class="text-slate-400">Vault Mode</span>
            <span class="text-emerald-400 font-bold">Local-first</span>
          </div>
          <div
            class="flex items-center gap-1.5 text-amber-400 pt-1 font-mono text-[11px] font-bold"
          >
            <span class="icon-[lucide--sparkles] w-4 h-4 shrink-0"></span>
            Interactive Web Node
          </div>
        </div>
      </div>

      <div
        class="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between"
      >
        <span>Inspect Node</span>
        <span class="icon-[lucide--pointer] w-4 h-4 text-amber-400"></span>
      </div>
    </div>
  {/if}
</div>
