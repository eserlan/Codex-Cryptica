<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  import type { AdventureNodeData, AdventureNodeType } from "generator-engine";

  let {
    data,
    selected = false,
    onLaunchDungeon,
    onCreateEntity,
  }: {
    data: AdventureNodeData;
    selected?: boolean;
    onLaunchDungeon?: (nodeData: AdventureNodeData) => void;
    onCreateEntity?: (nodeData: AdventureNodeData) => void;
  } = $props();

  function getTypeBadge(type: AdventureNodeType) {
    switch (type) {
      case "situation":
        return {
          label: "Situation",
          icon: "icon-[lucide--play]",
          color: "border-purple-500/40 bg-purple-500/10 text-purple-400",
        };
      case "location":
        return {
          label: "Location",
          icon: "icon-[lucide--map-pin]",
          color: "border-amber-500/40 bg-amber-500/10 text-amber-400",
        };
      case "npc":
        return {
          label: "NPC / Faction",
          icon: "icon-[lucide--users]",
          color: "border-blue-500/40 bg-blue-500/10 text-blue-400",
        };
      case "clue":
        return {
          label: "Clue / Secret",
          icon: "icon-[lucide--search]",
          color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
        };
      case "threat":
        return {
          label: "Threat",
          icon: "icon-[lucide--skull]",
          color: "border-rose-500/40 bg-rose-500/10 text-rose-400",
        };
      case "outcome":
        return {
          label: "Outcome",
          icon: "icon-[lucide--flag]",
          color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
        };
    }
  }

  const badge = $derived(getTypeBadge(data.type));
</script>

<div
  class="relative min-w-[220px] max-w-[260px] rounded-xl border bg-theme-bg/95 p-3.5 shadow-md transition-all duration-200 {selected
    ? 'border-theme-primary ring-2 ring-theme-primary/40 shadow-lg'
    : 'border-theme-border/70 hover:border-theme-border'}"
>
  <Handle
    type="target"
    position={Position.Top}
    class="w-3 h-3 !bg-theme-primary"
  />

  <div class="flex items-center justify-between gap-2 mb-1.5">
    <span
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border font-bold {badge.color}"
    >
      <span class="{badge.icon} h-3 w-3" aria-hidden="true"></span>
      {badge.label}
    </span>
  </div>

  <h4
    class="font-header font-bold text-xs text-theme-text/95 line-clamp-1 mb-1"
  >
    {data.title || "Untitled Node"}
  </h4>

  {#if data.description || data.summary}
    <p
      class="text-[10px] text-theme-muted line-clamp-3 leading-tight mb-2"
      title={data.description || data.summary}
    >
      {data.description || data.summary}
    </p>
  {/if}

  {#if data.role || data.leverage || data.dilemma}
    <div
      class="space-y-1 my-2 text-[9px] border-t border-theme-border/30 pt-1.5"
    >
      {#if data.role}
        <div class="text-theme-muted line-clamp-1">
          <strong class="text-theme-text font-semibold">Role:</strong>
          {data.role}
        </div>
      {/if}
      {#if data.leverage}
        <div class="text-theme-muted line-clamp-1">
          <strong class="text-theme-text font-semibold">Leverage:</strong>
          {data.leverage}
        </div>
      {/if}
      {#if data.dilemma}
        <div class="text-theme-muted line-clamp-1">
          <strong class="text-theme-text font-semibold">Dilemma:</strong>
          {data.dilemma}
        </div>
      {/if}
    </div>
  {/if}

  <div
    class="flex items-center justify-between gap-1 pt-1.5 mt-auto border-t border-theme-border/40"
  >
    {#if data.canLaunchDungeon}
      <button
        type="button"
        onclick={() => onLaunchDungeon?.(data)}
        class="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
        title="Launch Dungeon Builder from this location"
      >
        <span class="icon-[lucide--castle] h-3 w-3" aria-hidden="true"></span>
        Dungeon Builder
      </button>
    {/if}

    <button
      type="button"
      onclick={() => onCreateEntity?.(data)}
      class="inline-flex items-center gap-1 text-[9px] font-semibold text-theme-primary hover:text-theme-primary/80 transition-colors ml-auto"
      title="Create or view linked vault entity"
    >
      <span class="icon-[lucide--plus] h-3 w-3" aria-hidden="true"></span>
      {data.entityId ? "View Entity" : "Create Entity"}
    </button>
  </div>

  <Handle
    type="source"
    position={Position.Bottom}
    class="w-3 h-3 !bg-theme-primary"
  />
</div>
