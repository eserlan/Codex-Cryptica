<script lang="ts">
  import type { ContextualRollResult } from "$lib/stores/dice-history.svelte";
  import { slide } from "svelte/transition";

  let { rolls = [], onReroll } = $props<{
    rolls: ContextualRollResult[];
    onReroll?: (formula: string) => void;
  }>();

  let scrollContainer = $state<HTMLDivElement>();

  const sortedRolls = $derived(
    [...rolls].sort((a, b) => b.timestamp - a.timestamp),
  );

  const getDiceIcon = (sides?: number) => {
    switch (sides) {
      case 4:
        return "icon-[mdi--dice-d4]";
      case 6:
        return "icon-[mdi--dice-d6]";
      case 8:
        return "icon-[mdi--dice-d8]";
      case 10:
        return "icon-[mdi--dice-d10]";
      case 12:
        return "icon-[mdi--dice-d12]";
      case 20:
        return "icon-[mdi--dice-d20]";
      default:
        return "icon-[mdi--dice-multiple]";
    }
  };

  const isMax = (roll: number, sides?: number) => sides && roll === sides;
  const isMin = (roll: number) => roll === 1;

  // Exported for parent access
  export const scrollToTop = () => {
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
</script>

<div
  bind:this={scrollContainer}
  class="flex flex-col gap-3 overflow-y-auto max-h-[400px] p-3 custom-scrollbar scroll-smooth"
>
  {#if sortedRolls.length === 0}
    <div
      class="text-theme-muted text-[10px] text-center py-8 italic uppercase tracking-widest opacity-50"
    >
      No recent rolls in this session
    </div>
  {/if}

  {#each sortedRolls as roll, i (roll.id)}
    <div
      class="bg-theme-surface/40 border border-theme-border/50 rounded-xl p-4 flex flex-col gap-3 transition-all hover:border-theme-primary/40 group/item relative overflow-hidden"
      in:slide={{ duration: 200 }}
    >
      <!-- Background Glow for latest roll -->
      {#if i === 0}
        <div
          class="absolute inset-0 bg-gradient-to-br from-theme-primary/5 to-transparent pointer-events-none"
        ></div>
      {/if}

      <div class="flex justify-between items-center relative z-10">
        <div class="flex items-center gap-2">
          <span
            class="text-theme-primary font-bold text-xs font-header tracking-wider bg-theme-primary/10 px-2 py-0.5 rounded uppercase"
            data-testid="roll-formula"
          >
            {roll.formula}
          </span>
        </div>
        <span class="text-[9px] text-theme-muted font-mono opacity-60">
          {new Date(roll.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>

      <div class="flex items-center gap-4 relative z-10">
        <div class="flex flex-col items-center">
          <span
            class="text-3xl font-black text-theme-text font-header leading-none tabular-nums"
          >
            {roll.total}
          </span>
          <span
            class="text-[8px] font-bold text-theme-muted uppercase tracking-tighter mt-1 opacity-50"
            >Total</span
          >
        </div>

        <div class="flex-1 flex flex-wrap gap-2 items-center">
          {#each roll.parts as part}
            {#if part.type === "dice"}
              <div class="flex items-center gap-1.5 flex-wrap">
                {#each part.rolls || [] as r}
                  <div
                    class="relative flex items-center justify-center w-7 h-7 bg-theme-bg border border-theme-border/80 rounded shadow-sm group/die"
                    title="d{part.sides}: {r}"
                  >
                    <span
                      class="absolute -top-1.5 -left-1.5 {getDiceIcon(
                        part.sides,
                      )} w-3 h-3 text-theme-muted opacity-40"
                    ></span>
                    <span
                      class="text-xs font-bold font-mono transition-colors {isMax(
                        r,
                        part.sides,
                      )
                        ? 'text-theme-primary drop-shadow-[0_0_4px_rgba(var(--color-theme-primary-rgb),0.5)]'
                        : isMin(r)
                          ? 'text-red-500'
                          : 'text-theme-text'}"
                    >
                      {r}
                    </span>
                  </div>
                {/each}

                {#if part.dropped && part.dropped.length > 0}
                  {#each part.dropped as d}
                    <div
                      class="flex items-center justify-center w-6 h-6 bg-theme-bg/30 border border-theme-border/30 rounded text-[10px] font-mono text-theme-muted/40 line-through"
                      title="Dropped: {d}"
                    >
                      {d}
                    </div>
                  {/each}
                {/if}
              </div>
            {:else}
              <div
                class="flex items-center justify-center px-2 py-1 bg-theme-surface border border-theme-border/30 rounded text-[10px] font-bold text-theme-muted"
              >
                {part.value >= 0 ? "+" : "-"}{Math.abs(part.value)}
              </div>
            {/if}
          {/each}
        </div>
      </div>

      <!-- Reroll button (visible on hover or if it's the latest roll) -->
      <button
        class="absolute right-3 bottom-3 p-2 rounded-lg bg-theme-primary/10 border border-theme-primary/20 text-theme-primary opacity-0 group-hover/item:opacity-100 transition-all hover:bg-theme-primary hover:text-theme-bg active:scale-95 shadow-lg"
        onclick={() => onReroll?.(roll.formula)}
        title="Reroll this formula"
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
    background: var(--color-theme-border);
    border-radius: 10px;
  }
</style>
