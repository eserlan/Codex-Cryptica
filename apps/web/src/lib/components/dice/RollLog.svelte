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

  // Exported for parent access
  export const scrollToTop = () => {
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
</script>

<div
  bind:this={scrollContainer}
  class="flex flex-col gap-2 overflow-y-auto max-h-[400px] p-2 custom-scrollbar scroll-smooth"
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
      class="bg-theme-surface/50 border border-theme-border rounded-lg p-3 flex flex-col gap-1 transition-all hover:border-theme-primary/30 group/item relative"
      in:slide={{ duration: 200 }}
    >
      <div class="flex justify-between items-center">
        <span
          class="text-theme-primary font-bold text-sm font-header tracking-tighter"
          data-testid="roll-formula"
        >
          {roll.formula}
        </span>
        <span class="text-[10px] text-theme-muted font-mono opacity-70">
          {new Date(roll.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>

      <div class="flex items-baseline gap-2">
        <span class="text-lg font-bold text-theme-text font-header">
          {roll.total}
        </span>

        <div class="flex flex-wrap gap-1 items-center">
          {#each roll.parts as part}
            {#if part.type === "dice"}
              <div
                class="flex items-center gap-0.5 bg-theme-bg/50 border border-theme-border rounded px-1.5 py-0.5 text-[9px] font-mono"
              >
                <span class="text-theme-muted">[</span>
                {#each part.rolls || [] as r, i}
                  <span class="text-theme-text">{r}</span>
                  {#if i < (part.rolls?.length || 0) - 1}<span
                      class="text-theme-muted">,</span
                    >{/if}
                {/each}
                {#if part.dropped && part.dropped.length > 0}
                  <span class="text-theme-muted">|</span>
                  {#each part.dropped as d, i}
                    <span class="text-red-500/50 line-through">{d}</span>
                    {#if i < part.dropped.length - 1}<span
                        class="text-theme-muted">,</span
                      >{/if}
                  {/each}
                {/if}
                <span class="text-theme-muted">]</span>
              </div>
            {:else}
              <span class="text-[10px] text-theme-muted font-bold"
                >{part.value >= 0 ? "+" : "-"}{Math.abs(part.value)}</span
              >
            {/if}
          {/each}
        </div>
      </div>

      <!-- Reroll button (visible on hover or if it's the latest roll) -->
      <button
        class="absolute right-2 bottom-2 p-1.5 rounded-md bg-theme-primary/10 border border-theme-primary/20 text-theme-primary opacity-0 group-hover/item:opacity-100 transition-all hover:bg-theme-primary hover:text-theme-bg active:scale-95 {i ===
        0
          ? 'opacity-40'
          : ''}"
        onclick={() => onReroll?.(roll.formula)}
        title="Reroll this formula"
      >
        <span class="icon-[lucide--refresh-cw] w-3 h-3"></span>
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
