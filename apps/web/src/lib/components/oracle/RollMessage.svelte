<script lang="ts">
  import type { ChatMessage } from "$lib/stores/oracle.svelte";
  import { slide } from "svelte/transition";
  import { getDiceIcon } from "$lib/utils/dice-icons";

  let { message }: { message: ChatMessage } = $props();
  const result = $derived(message.rollResult);
</script>

{#if result}
  <div
    class="flex flex-col gap-3 py-2 w-full max-w-full overflow-hidden"
    transition:slide
  >
    <!-- Header with Total -->
    <div
      class="grid grid-cols-[1fr_auto] items-end border-b border-theme-primary/20 pb-2 gap-x-4"
    >
      <div class="flex flex-col min-w-0">
        <span
          class="text-[9px] font-bold text-theme-muted uppercase tracking-widest leading-none mb-1"
          >Result</span
        >
        <span
          class="text-3xl font-bold text-theme-primary font-header leading-tight truncate"
        >
          {result.total}
        </span>
      </div>
      <div class="flex flex-col items-end shrink-0 min-w-0">
        <span
          class="text-[9px] font-bold text-theme-muted uppercase tracking-widest leading-none mb-1"
          >Formula</span
        >
        <span
          class="text-xs font-mono text-theme-text bg-theme-primary/10 px-2 py-1 rounded border border-theme-primary/20 whitespace-nowrap"
        >
          {result.formula}
        </span>
      </div>
    </div>

    <!-- Breakdown -->
    <div class="space-y-3">
      {#each result.parts as part, i}
        {#if part.type === "dice"}
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center gap-2">
              {#if part.sides}
                <span
                  class="{getDiceIcon(
                    part.sides,
                  )} w-3 h-3 text-theme-primary/60"
                ></span>
              {/if}
              <span
                class="text-[9px] font-bold text-theme-muted uppercase tracking-tighter"
                >Part {i + 1} breakdown</span
              >
            </div>
            <div class="flex flex-wrap gap-1.5">
              {#each part.rolls || [] as roll}
                <div
                  class="w-8 h-8 flex items-center justify-center rounded-md bg-theme-bg border border-theme-border text-sm font-bold text-theme-text shadow-inner"
                >
                  {roll}
                </div>
              {/each}
              {#if part.dropped && part.dropped.length > 0}
                {#each part.dropped as drop}
                  <div
                    class="w-8 h-8 flex items-center justify-center rounded-md bg-theme-bg/30 border border-theme-border/50 text-sm font-bold text-theme-muted/40 line-through"
                  >
                    {drop}
                  </div>
                {/each}
              {/if}
              <div
                class="h-8 flex items-center px-2 text-xs font-bold text-theme-primary/80"
              >
                = {part.value}
              </div>
            </div>
          </div>
        {:else}
          <div
            class="flex items-center gap-2 bg-theme-primary/5 rounded px-3 py-1.5 border border-theme-primary/10 w-fit"
          >
            <span class="text-[10px] font-bold text-theme-muted uppercase"
              >Modifier</span
            >
            <span class="text-sm font-bold text-theme-primary"
              >{part.value >= 0 ? "+" : "-"}{Math.abs(part.value)}</span
            >
          </div>
        {/if}
      {/each}
    </div>
  </div>
{/if}
