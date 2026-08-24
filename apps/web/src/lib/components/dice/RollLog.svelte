<script lang="ts">
  import type { ContextualRollResult } from "$lib/stores/dice-history.svelte";
  import { slide } from "svelte/transition";
  import { getDiceIcon } from "$lib/utils/dice-icons";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { addToOracleChatInput } from "$lib/components/oracle/oracle-chat-input";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let {
    rolls = [],
    onReroll,
    session = mapSession,
  }: {
    rolls: ContextualRollResult[];
    onReroll?: (formula: string) => void;
    session?: typeof mapSession;
  } = $props();

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

  function sendRollToChat(roll: ContextualRollResult) {
    if (roll.source) {
      const text = `${roll.source.sourceName}: ${roll.source.finalText}`;
      session.sendChatMessage(text);
      addToOracleChatInput(text);
    } else {
      const displayFormula = roll.label
        ? `${roll.label} (${roll.formula})`
        : roll.formula;
      session.sendResolvedRollMessage(displayFormula, roll);
      const oracleText = `${displayFormula} ➔ ${roll.total}`;
      addToOracleChatInput(oracleText);
    }
    notificationStore.notify("Result sent to chat.", "success");
  }
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
          {#if roll.label && !roll.source}
            <span
              class="text-theme-text text-xs font-bold font-header tracking-wide"
              data-testid="roll-label"
            >
              {roll.label}
            </span>
          {/if}
          <span
            class="text-theme-primary font-bold text-xs font-header tracking-wider bg-theme-primary/10 px-2 py-0.5 rounded uppercase"
            data-testid="roll-formula"
          >
            {roll.formula}
          </span>
        </div>
        <span
          class="text-[9px] text-theme-muted font-header uppercase tracking-tighter"
        >
          {new Date(roll.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>

      {#if roll.source}
        <!-- A table roll or deck draw: the text is the result, and the die
             value is only how it was reached (#2247, FR-018). -->
        <div class="flex items-start gap-4" data-testid="roll-source">
          <div
            class="flex min-w-[3.5rem] flex-col items-center justify-center border-r border-theme-border/30 py-1 pr-4"
          >
            <span
              class="text-3xl font-black text-theme-primary font-header leading-none tabular-nums"
            >
              {roll.total}
            </span>
            <span
              class="text-[8px] font-bold text-theme-muted uppercase tracking-tighter mt-1.5"
            >
              {roll.source.kind === "deck" ? "Draw" : "Rolled"}
            </span>
          </div>
          <div class="flex-1 flex flex-col gap-1">
            <span
              class="text-[9px] font-bold text-theme-muted uppercase tracking-widest"
              data-testid="roll-source-name"
            >
              {roll.source.sourceName}
            </span>
            <p
              class="text-sm text-theme-text font-body leading-relaxed whitespace-pre-wrap"
              data-testid="roll-source-text"
            >
              {roll.source.finalText}
            </p>
          </div>
        </div>
      {:else}
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
                          class="text-xs font-bold font-header transition-colors {isMax(
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
                        type="button"
                        onclick={() => toggleExpand(roll.id)}
                        class="text-[10px] font-bold text-theme-muted hover:text-theme-primary transition-colors px-2 py-1 bg-theme-bg border border-theme-border rounded"
                      >
                        +{hiddenCount} more
                      </button>
                    {:else if shouldCollapse(part.rolls) && isExpanded}
                      <button
                        type="button"
                        onclick={() => toggleExpand(roll.id)}
                        class="text-[10px] font-bold text-theme-muted hover:text-theme-primary transition-colors px-2 py-1 bg-theme-bg border border-theme-border rounded"
                      >
                        Show less
                      </button>
                    {/if}

                    {#if part.dropped && part.dropped.length > 0}
                      <div class="flex items-center gap-1">
                        <span
                          class="text-[10px] font-bold text-theme-muted mx-1"
                          >/</span
                        >
                        {#each part.dropped as d}
                          <div
                            class="flex items-center justify-center w-6 h-6 bg-theme-bg border border-theme-border/30 rounded text-[10px] font-header text-theme-muted line-through"
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
      {/if}

      <!-- Action buttons: Add to chat & Reroll -->
      <div
        class="absolute right-3 bottom-3 flex items-center gap-1.5 transition-opacity group-hover/item:opacity-100"
        class:opacity-0={_i !== 0}
        class:opacity-100={_i === 0}
      >
        <button
          class="p-2 rounded-lg bg-theme-primary/10 border border-theme-primary/20 text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg active:scale-95 shadow-lg"
          type="button"
          onclick={() => sendRollToChat(roll)}
          title="Send to chat"
          aria-label="Send to chat"
          data-testid="roll-log-add-to-chat"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--message-square-plus] w-4 h-4"
          ></span>
        </button>

        {#if !roll.source}
          <button
            class="p-2 rounded-lg bg-theme-primary/10 border border-theme-primary/20 text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg active:scale-95 shadow-lg"
            type="button"
            onclick={() => onReroll?.(roll.formula)}
            title="Reroll this formula"
            aria-label="Reroll this formula"
            data-testid="roll-log-reroll"
          >
            <span aria-hidden="true" class="icon-[lucide--refresh-cw] w-4 h-4"
            ></span>
          </button>
        {/if}
      </div>
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
