<script lang="ts">
  import type { ConnectionStance, LinkGroup } from "./entity-card-variant";
  import RelationAvatar from "./RelationAvatar.svelte";

  const STANCE_TEXT: Record<ConnectionStance, string> = {
    ally: "text-emerald-400",
    friend: "text-sky-400",
    enemy: "text-rose-400",
    neutral: "text-theme-muted",
  };

  let {
    groups,
    maxVisible = 4,
  }: {
    groups: LinkGroup[];
    maxVisible?: number;
  } = $props();

  let expandedGroups = $state<Record<string, boolean>>({});

  function toggleGroup(key: string) {
    expandedGroups[key] = !expandedGroups[key];
  }
</script>

{#if groups.length > 0}
  <div
    class="mt-2 border-t border-theme-border/30 pt-1.5 max-h-[420px] overflow-y-auto nodrag nowheel pr-1 space-y-2.5"
    data-testid="grouped-relation-links"
  >
    {#each groups as group, groupIndex (`${group.key}-${group.label}-${groupIndex}`)}
      {@const groupKey = `${group.key}-${group.label}`}
      {@const isExpanded = Boolean(expandedGroups[groupKey])}
      {@const visibleRows = isExpanded
        ? group.rows
        : group.rows.slice(0, maxVisible)}
      <div class="first:mt-0" data-testid="link-group-{group.key}">
        <div
          class="text-[9px] font-mono uppercase tracking-widest text-theme-muted font-bold flex items-center justify-between border-b border-theme-border/20 pb-0.5 mb-1.5"
        >
          <span>{group.label}</span>
          <span class="text-[8px] font-normal opacity-70"
            >({group.rows.length})</span
          >
        </div>
        <ul class="space-y-1.5">
          {#each visibleRows as row, rowIndex (`${groupKey}-${row.target}-${rowIndex}`)}
            <li
              class="flex items-start gap-2.5 text-[10px] leading-tight py-1 px-1.5 rounded-lg bg-theme-bg/30 border border-theme-border/30 hover:bg-theme-bg/60 transition-colors"
              title={row.title}
            >
              <div class="mt-0.5 shrink-0">
                <RelationAvatar entityId={row.target} title={row.title} />
              </div>
              <div class="flex flex-col min-w-0 flex-1">
                <span
                  class="text-[9px] font-semibold uppercase tracking-wider truncate {STANCE_TEXT[
                    row.stance
                  ]}"
                >
                  {row.text}
                </span>
                <span
                  class="font-bold text-theme-text font-header text-[11px] tracking-wide line-clamp-2 break-words leading-snug"
                >
                  {row.title}
                </span>
              </div>
            </li>
          {/each}
        </ul>
        {#if group.rows.length > maxVisible}
          <button
            type="button"
            class="nodrag mt-1 text-[10px] font-semibold text-theme-primary hover:underline flex items-center gap-1 py-0.5 px-1 rounded transition-colors"
            onclick={() => toggleGroup(groupKey)}
          >
            {#if isExpanded}
              Show less
            {:else}
              + {group.rows.length - maxVisible} more
            {/if}
          </button>
        {/if}
      </div>
    {/each}
  </div>
{/if}
