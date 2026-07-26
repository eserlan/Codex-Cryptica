<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  import type { DelveRoomNodeData } from "generator-engine";
  import { getRoleBadgeConfig } from "./delve-helpers";

  let {
    data,
    selected = false,
  }: {
    data: DelveRoomNodeData;
    selected?: boolean;
  } = $props();

  const roleConfig = $derived(getRoleBadgeConfig(data.role ?? "encounter"));
  const encountersCount = $derived(data.stocking?.encounters?.length ?? 0);
  const hazardsCount = $derived(data.stocking?.hazards?.length ?? 0);
  const secretsCount = $derived(data.stocking?.secrets?.length ?? 0);
  const treasureCount = $derived(data.stocking?.treasure?.length ?? 0);
</script>

<div
  class="relative min-w-[200px] max-w-[240px] rounded-xl border bg-theme-bg/95 p-3 shadow-md transition-all duration-200 {selected
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
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border font-bold {roleConfig.colorClass}"
    >
      <span class="{roleConfig.icon} w-3 h-3" aria-hidden="true"></span>
      {roleConfig.label}
    </span>
    <div class="flex items-center gap-1">
      {#if data.sectorName}
        <span
          class="text-[9px] font-mono text-theme-muted truncate max-w-[70px]"
          title={data.sectorName}
        >
          {data.sectorName}
        </span>
      {/if}
    </div>
  </div>

  <h4
    class="font-header font-bold text-xs text-theme-text/95 line-clamp-1 mb-1"
  >
    {data.name || "Unnamed Room"}
  </h4>

  {#if data.summary}
    <p class="text-[10px] text-theme-muted line-clamp-2 leading-tight mb-2">
      {data.summary}
    </p>
  {/if}

  <div
    class="flex flex-wrap gap-1 mt-auto pt-1 border-t border-theme-border/40"
  >
    {#if encountersCount > 0}
      <span
        class="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400"
      >
        <span class="icon-[lucide--swords] w-2.5 h-2.5"></span>
        {encountersCount}
      </span>
    {/if}
    {#if hazardsCount > 0}
      <span
        class="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400"
      >
        <span class="icon-[lucide--alert-triangle] w-2.5 h-2.5"></span>
        {hazardsCount}
      </span>
    {/if}
    {#if treasureCount > 0}
      <span
        class="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400"
      >
        <span class="icon-[lucide--gem] w-2.5 h-2.5"></span>
        {treasureCount}
      </span>
    {/if}
    {#if secretsCount > 0}
      <span
        class="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400"
      >
        <span class="icon-[lucide--eye] w-2.5 h-2.5"></span>
        {secretsCount}
      </span>
    {/if}
  </div>

  <Handle
    type="source"
    position={Position.Bottom}
    class="w-3 h-3 !bg-theme-primary"
  />
</div>
