<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { diceHistory } from "$lib/stores/dice-history.svelte";
  import { diceEngine, diceParser } from "dice-engine";
  import { fly, fade, slide } from "svelte/transition";
  import RollLog from "./RollLog.svelte";
  import { tick } from "svelte";

  let formula = $state("");
  let error = $state("");
  let showHelp = $state(false);
  let formulaInput = $state<HTMLInputElement>();
  let rollLogComponent = $state<ReturnType<typeof RollLog>>();

  // Successive Click Accumulator
  let pendingSides = $state<number | null>(null);
  let pendingCount = $state(0);
  let pendingTimeout = $state<any>(null);

  const executeRoll = async (f: string) => {
    try {
      error = "";
      const command = diceParser.parse(f);
      const result = diceEngine.execute(command);
      await diceHistory.addResult(result, "modal");
      // Scroll to top to see new result
      await tick();
      rollLogComponent?.scrollToTop();
    } catch (e: any) {
      error = e.message;
    }
  };

  const roll = (customFormula?: string) => {
    // Flush any pending quick rolls first
    flushPending();

    const f = customFormula || formula;
    if (!f) return;
    executeRoll(f);
    if (!customFormula) {
      formula = "";
      formulaInput?.focus();
    }
  };

  const flushPending = () => {
    if (pendingSides !== null && pendingCount > 0) {
      executeRoll(`${pendingCount}d${pendingSides}`);
      pendingSides = null;
      pendingCount = 0;
      if (pendingTimeout) clearTimeout(pendingTimeout);
    }
  };

  const quickRoll = (sides: number) => {
    if (pendingSides === sides) {
      pendingCount++;
    } else {
      flushPending();
      pendingSides = sides;
      pendingCount = 1;
    }

    if (pendingTimeout) clearTimeout(pendingTimeout);
    pendingTimeout = setTimeout(() => {
      flushPending();
    }, 600); // 600ms window for accumulation
  };

  const reroll = (f: string) => {
    executeRoll(f);
  };

  const diceTypes = [
    { sides: 4, icon: "icon-[mdi--dice-d4]" },
    { sides: 6, icon: "icon-[mdi--dice-d6]" },
    { sides: 8, icon: "icon-[mdi--dice-d8]" },
    { sides: 10, icon: "icon-[mdi--dice-d10]" },
    { sides: 12, icon: "icon-[mdi--dice-d12]" },
    { sides: 20, icon: "icon-[mdi--dice-d20]" },
    { sides: 100, icon: "icon-[mdi--dice-multiple]" },
  ];
</script>

{#if uiStore.showDiceModal}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-theme-bg/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    onclick={() => {
      flushPending();
      uiStore.showDiceModal = false;
    }}
    onkeydown={(e) =>
      (e.key === "Escape" || e.key === " ") &&
      (flushPending(), (uiStore.showDiceModal = false))}
    transition:fade={{ duration: 200 }}
    role="button"
    tabindex="0"
    aria-label="Close Modal"
  >
    <!-- Modal Container -->
    <div
      class="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
      onclick={(e) => e.stopPropagation()}
      role="none"
      transition:fly={{ y: 20, duration: 300 }}
      data-testid="dice-modal"
    >
      <!-- Header -->
      <div
        class="p-4 border-b border-theme-border flex justify-between items-center bg-theme-bg/50"
      >
        <div class="flex items-center gap-2">
          <span class="icon-[lucide--dices] w-5 h-5 text-theme-primary"></span>
          <h2
            class="text-sm font-bold font-header tracking-widest text-theme-text uppercase"
          >
            Die Roller
          </h2>
        </div>
        <button
          class="p-1 hover:bg-theme-primary/10 rounded-md transition-colors text-theme-muted hover:text-theme-primary"
          onclick={() => {
            flushPending();
            uiStore.showDiceModal = false;
          }}
          aria-label="Close"
        >
          <span class="icon-[lucide--x] w-5 h-5"></span>
        </button>
      </div>

      <!-- Quick Roll Buttons -->
      <div class="p-4 border-b border-theme-border/50 bg-theme-bg/20">
        <div class="flex flex-wrap gap-2 justify-center mb-2">
          {#each diceTypes as die}
            <button
              class="flex flex-col items-center justify-center w-12 h-14 rounded-lg border border-theme-border bg-theme-bg hover:border-theme-primary hover:text-theme-primary transition-all active:scale-90 group relative"
              onclick={() => quickRoll(die.sides)}
              title="Click multiple times to roll more dice"
            >
              {#if pendingSides === die.sides && pendingCount > 0}
                <span
                  class="absolute -top-1 -right-1 bg-theme-primary text-theme-bg text-[10px] font-bold px-1.5 rounded-full shadow-lg animate-in zoom-in duration-100"
                >
                  {pendingCount}
                </span>
              {/if}
              <span
                class="text-[9px] font-bold opacity-50 group-hover:opacity-100 mb-1"
                >d{die.sides}</span
              >
              <span class="{die.icon} w-5 h-5"></span>
            </button>
          {/each}
        </div>
        <p class="text-[9px] text-center text-theme-muted italic opacity-60">
          Click in succession to roll multiple dice
        </p>
      </div>

      <!-- Custom Formula -->
      <div class="p-4 space-y-2 border-b border-theme-border/30">
        <form
          onsubmit={(e) => {
            e.preventDefault();
            roll();
          }}
          class="flex gap-2"
        >
          <div class="relative flex-1">
            <input
              bind:this={formulaInput}
              type="text"
              bind:value={formula}
              placeholder="Enter formula (e.g. 2d20kh1 + 5)"
              class="w-full bg-theme-bg border border-theme-border rounded-lg pl-3 pr-8 py-2 text-sm focus:border-theme-primary outline-none font-mono"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
              onclick={() => (showHelp = !showHelp)}
              title="Formula Help"
            >
              <span class="icon-[lucide--info] w-4 h-4"></span>
            </button>
          </div>
          <button
            type="submit"
            class="bg-theme-primary text-theme-bg font-bold px-4 py-2 rounded-lg text-xs tracking-widest hover:brightness-110 active:scale-95 transition-all"
          >
            ROLL
          </button>
        </form>

        {#if showHelp}
          <div
            class="bg-theme-bg/50 border border-theme-border/50 rounded-lg p-3 text-[10px] space-y-2"
            transition:slide
          >
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <span class="text-theme-primary font-bold">2d20kh1</span>
              <span class="text-theme-muted">Keep Highest (Advantage)</span>
              <span class="text-theme-primary font-bold">2d20kl1</span>
              <span class="text-theme-muted">Keep Lowest (Disadvantage)</span>
              <span class="text-theme-primary font-bold">4d6!</span>
              <span class="text-theme-muted">Exploding (Max rolls again)</span>
              <span class="text-theme-primary font-bold">1d10 + 5</span>
              <span class="text-theme-muted">Standard Modifier</span>
            </div>
          </div>
        {/if}

        {#if error}
          <p class="text-red-500 text-[10px] italic ml-1">{error}</p>
        {/if}
      </div>

      <!-- Roll Log -->
      <div class="flex-1 min-h-0 bg-theme-bg/30">
        <div
          class="px-4 py-2 flex justify-between items-center border-b border-theme-border/30"
        >
          <span
            class="text-[11px] font-bold text-theme-muted uppercase tracking-tighter"
            >Session History</span
          >
          <button
            class="text-[11px] font-bold text-theme-muted hover:text-red-500 uppercase transition-colors"
            onclick={() => diceHistory.clearHistory("modal")}
          >
            Clear
          </button>
        </div>
        <RollLog
          bind:this={rollLogComponent}
          rolls={diceHistory.modalHistory}
          onReroll={reroll}
        />
      </div>
    </div>
  </div>
{/if}
