<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";
  import type { DelveRoomNodeData } from "generator-engine";
  import { getDelveRoomCardPreview, getRoleBadgeConfig } from "./delve-helpers";

  let {
    data,
    selected = false,
  }: {
    data: DelveRoomNodeData;
    selected?: boolean;
  } = $props();

  const roleConfig = $derived(getRoleBadgeConfig(data.role ?? "encounter"));
  const preview = $derived(getDelveRoomCardPreview(data));
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

  {#if preview.description}
    <p
      class="text-[10px] text-theme-muted line-clamp-2 leading-tight mb-1.5"
      title={preview.description}
    >
      {preview.description}
    </p>
  {/if}

  <div
    class="flex items-center gap-1 mt-auto pt-1 border-t border-theme-border/40"
  >
    {#if preview.detail}
      <span
        class="flex min-w-0 flex-1 items-center gap-1 text-[8px] text-theme-muted"
        title="{preview.detail.label}: {preview.detail.text}"
      >
        <span
          class="{preview.detail.icon} h-2.5 w-2.5 shrink-0 text-theme-primary"
          aria-hidden="true"
        ></span>
        <span class="truncate">{preview.detail.text}</span>
        {#if preview.detail.additionalCount > 0}
          <span class="shrink-0">+{preview.detail.additionalCount}</span>
        {/if}
      </span>
    {/if}
    <div class="ml-auto flex shrink-0 flex-wrap justify-end gap-1">
      {#if encountersCount > 0}
        <span
          class="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400"
          title={data.stocking.encounters?.join("\n")}
        >
          <span class="icon-[lucide--swords] w-2.5 h-2.5"></span>
          {encountersCount}
        </span>
      {/if}
      {#if hazardsCount > 0}
        <span
          class="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400"
          title={data.stocking.hazards?.join("\n")}
        >
          <span class="icon-[lucide--alert-triangle] w-2.5 h-2.5"></span>
          {hazardsCount}
        </span>
      {/if}
      {#if treasureCount > 0}
        <span
          class="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400"
          title={data.stocking.treasure?.join("\n")}
        >
          <span class="icon-[lucide--gem] w-2.5 h-2.5"></span>
          {treasureCount}
        </span>
      {/if}
      {#if secretsCount > 0}
        <span
          class="inline-flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400"
          title={data.stocking.secrets?.join("\n")}
        >
          <span class="icon-[lucide--eye] w-2.5 h-2.5"></span>
          {secretsCount}
        </span>
      {/if}
    </div>
  </div>

  <Handle
    type="source"
    position={Position.Bottom}
    class="w-3 h-3 !bg-theme-primary"
  />
</div>
