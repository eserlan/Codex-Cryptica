<script lang="ts">
  import type { ContextualRollResult } from "$lib/stores/dice-history.svelte";
  import { slide } from "svelte/transition";
  import { getDiceIcon } from "$lib/utils/dice-icons";

  let { rolls = [], onReroll } = $props<{
    rolls: ContextualRollResult[];
    onReroll?: (formula: string) => void;
  }>();

  let scrollContainer = $state<HTMLDivElement>();

  const sortedRolls = $derived(
    [...rolls].sort((a, b) => b.timestamp - a.timestamp),
  );

  const isMax = (roll: number, sides?: number) =>
    sides !== undefined && roll === sides;
  const isMin = (roll: number) => roll === 1;

  // For large pools, we might want to show a summary or a toggle
  let expandedRolls = $state<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    expandedRolls[id] = !expandedRolls[id];
  };

  const shouldCollapse = (rolls?: number[]) => (rolls?.length || 0) > 12;

  // Exported for parent access
  export const scrollToTop = () => {
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
</script>

<div
  bind:this={scrollContainer}
  class="flex flex-col gap-3 overflow-y-auto max-h-[450px] p-3 custom-scrollbar scroll-smooth"
>
  {#if sortedRolls.length === 0}
    <div
      class="text-theme-muted text-[10px] text-center py-8 italic uppercase tracking-widest opacity-50"
    >
      No recent rolls in this session
    </div>
  {/if}

  {#each sortedRolls as roll, _i (roll.id)}
    {@const isExpanded = expandedRolls[roll.id]}
    <div
      class="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col gap-3 transition-all hover:border-theme-primary/40 group/item relative h-auto shadow-sm"
      in:slide={{ duration: 200 }}
    >
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span
            class="text-theme-primary font-bold text-xs font-header tracking-wider bg-theme-primary/10 px-2 py-0.5 rounded uppercase"
            data-testid="roll-formula"
          >
            {roll.formula}
          </span>
        </div>
        <span class="text-[9px] text-theme-muted font-mono">
          {new Date(roll.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>

      <div class="flex items-center gap-4">
        <!-- Total Column -->
        <div
          class="flex flex-col items-center justify-center min-w-[3.5rem] py-1 border-r border-theme-border/30 pr-4"
        >
          <span
            class="text-3xl font-black text-theme-primary font-header leading-none tabular-nums"
          >
            {roll.total}
          </span>
          <span
            class="text-[8px] font-bold text-theme-muted uppercase tracking-tighter mt-1.5"
            >Total</span
          >
        </div>

        <!-- Details Column -->
        <div class="flex-1 flex flex-wrap gap-2 items-center min-h-[2.5rem]">
          {#if roll.parts && roll.parts.length > 0}
            {#each roll.parts as part}
              {#if part.type === "dice"}
                {@const rollsToShow =
                  shouldCollapse(part.rolls) && !isExpanded
                    ? part.rolls?.slice(0, 8)
                    : part.rolls}
                {@const hiddenCount =
                  (part.rolls?.length || 0) - (rollsToShow?.length || 0)}

                <div class="flex items-center gap-1.5 flex-wrap">
                  {#each rollsToShow || [] as r}
                    <div
                      class="relative flex items-center justify-center w-7 h-7 bg-theme-bg border border-theme-border rounded shadow-sm group/die"
                      title="d{part.sides}: {r}"
                    >
                      <span
                        class="absolute -top-1.5 -left-1.5 {getDiceIcon(
                          part.sides,
                        )} w-3 h-3 text-theme-muted"
                      ></span>
                      <span
                        class="text-xs font-bold font-mono transition-colors {isMax(
                          r,
                          part.sides,
                        )
                          ? 'text-theme-primary drop-shadow-[0_0_2px_rgba(var(--color-accent-primary),0.3)]'
                          : isMin(r)
                            ? 'text-red-500'
                            : 'text-theme-text'}"
                      >
                        {r}
                      </span>
                    </div>
                  {/each}

                  {#if hiddenCount > 0}
                    <button
                      onclick={() => toggleExpand(roll.id)}
                      class="text-[10px] font-bold text-theme-muted hover:text-theme-primary transition-colors px-2 py-1 bg-theme-bg border border-theme-border rounded"
                    >
                      +{hiddenCount} more
                    </button>
                  {:else if shouldCollapse(part.rolls) && isExpanded}
                    <button
                      onclick={() => toggleExpand(roll.id)}
                      class="text-[10px] font-bold text-theme-muted hover:text-theme-primary transition-colors px-2 py-1 bg-theme-bg border border-theme-border rounded"
                    >
                      Show less
                    </button>
                  {/if}

                  {#if part.dropped && part.dropped.length > 0}
                    <div class="flex items-center gap-1">
                      <span class="text-[10px] font-bold text-theme-muted mx-1"
                        >/</span
                      >
                      {#each part.dropped as d}
                        <div
                          class="flex items-center justify-center w-6 h-6 bg-theme-bg border border-theme-border/30 rounded text-[10px] font-mono text-theme-muted line-through"
                          title="Dropped: {d}"
                        >
                          {d}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {:else}
                <div
                  class="flex items-center justify-center px-2 py-1 bg-theme-bg border border-theme-border/30 rounded text-[10px] font-bold text-theme-muted"
                >
                  {part.value >= 0 ? "+" : "-"}{Math.abs(part.value)}
                </div>
              {/if}
            {/each}
          {:else}
            <!-- Fallback for legacy results or unexpected empty parts -->
            <span class="text-[10px] text-theme-muted italic"
              >Result Breakdown Unavailable</span
            >
          {/if}
        </div>
      </div>

      <!-- Reroll button -->
      <button
        class="absolute right-3 bottom-3 p-2 rounded-lg bg-theme-primary/10 border border-theme-primary/20 text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg active:scale-95 shadow-lg group-hover/item:opacity-100"
        class:opacity-0={_i !== 0}
        class:opacity-100={_i === 0}
        type="button"
        onclick={() => onReroll?.(roll.formula)}
        title="Reroll this formula"
        aria-label="Reroll this formula"
      >
        <span class="icon-[lucide--refresh-cw] w-4 h-4"></span>
      </button>
    </div>
  {/each}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-theme-primary);
    border-radius: 10px;
  }
</style>
