<script lang="ts">
  import { diceHistory } from "$lib/stores/dice-history.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { diceEngine, diceParser } from "dice-engine";
  import { slide } from "svelte/transition";
  import RollLog from "./RollLog.svelte";
  import { tick } from "svelte";
  import { getDiceIcon } from "$lib/utils/dice-icons";

  let { isStandalone = false } = $props<{ isStandalone?: boolean }>();

  let formula = $state("");
  let error = $state("");
  let showHelp = $state(false);
  let formulaInput = $state<HTMLInputElement>();
  let rollLogComponent = $state<ReturnType<typeof RollLog>>();

  // History Navigation
  let historyIndex = $state(-1);
  let originalFormula = "";

  const executeRoll = async (f: string) => {
    try {
      error = "";
      const command = diceParser.parse(f);
      const result = diceEngine.execute(command);
      await diceHistory.addResult(result, "modal");
      if (mapSession.vttEnabled) {
        mapSession.sendResolvedRollMessage(f, result);
      }
      // Reset history navigation
      historyIndex = -1;
      // Scroll to top to see new result
      await tick();
      rollLogComponent?.scrollToTop();
    } catch (e: any) {
      error = e.message;
    }
  };

  const roll = (customFormula?: string) => {
    const f = customFormula || formula;
    if (!f) return;
    executeRoll(f);
    if (!customFormula) {
      formula = "";
      formulaInput?.focus();
    }
  };

  const quickAdd = (sides: number) => {
    if (!formula) {
      formula = `1d${sides}`;
    } else {
      const diePattern = new RegExp(`(\\d+)d${sides}\\b`, "i");
      const match = formula.match(diePattern);

      if (match) {
        const count = parseInt(match[1]) + 1;
        formula = formula.replace(diePattern, `${count}d${sides}`);
      } else {
        const trimmed = formula.trim();
        const lastChar = trimmed.slice(-1);
        if (/[0-9a-z]/i.test(lastChar)) {
          formula = `${trimmed} + 1d${sides}`;
        } else {
          formula = `${trimmed} 1d${sides}`;
        }
      }
    }
    formulaInput?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const history = diceHistory.modalHistory;
    const uniqueFormulas = Array.from(
      new Set(history.map((h) => h.formula)),
    ).reverse();

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (uniqueFormulas.length === 0) return;

      if (historyIndex === -1) {
        originalFormula = formula;
      }

      if (historyIndex < uniqueFormulas.length - 1) {
        historyIndex++;
        formula = uniqueFormulas[historyIndex];
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        formula = uniqueFormulas[historyIndex];
      } else if (historyIndex === 0) {
        historyIndex = -1;
        formula = originalFormula;
      }
    }
  };

  const reroll = (f: string) => {
    executeRoll(f);
  };

  const diceTypes = [
    { sides: 4 },
    { sides: 6 },
    { sides: 8 },
    { sides: 10 },
    { sides: 12 },
    { sides: 20 },
    { sides: 100 },
  ];
</script>

<div
  class="flex flex-col h-full {isStandalone
    ? 'bg-theme-bg'
    : 'bg-theme-surface'}"
>
  <!-- Quick Roll Buttons -->
  <div class="p-4 border-b border-theme-border/50 bg-theme-bg/20">
    <div class="flex flex-wrap gap-2 justify-center mb-2">
      {#each diceTypes as die}
        <button
          class="flex flex-col items-center justify-center w-12 h-14 rounded-lg border border-theme-border bg-theme-bg hover:border-theme-primary hover:text-theme-primary transition-all active:scale-90 group relative"
          onclick={() => quickAdd(die.sides)}
          title="Add {die.sides}-sided die to formula"
        >
          <span
            class="text-[9px] font-bold opacity-50 group-hover:opacity-100 mb-1"
            >d{die.sides}</span
          >
          <span class="{getDiceIcon(die.sides)} w-5 h-5"></span>
        </button>
      {/each}
    </div>
    <p class="text-[9px] text-center text-theme-muted italic opacity-60">
      Click dice to build your formula
    </p>
  </div>

  <!-- Custom Formula -->
  <div class="p-4 space-y-3 border-b border-theme-border/30 bg-theme-bg/10">
    <form
      onsubmit={(e) => {
        e.preventDefault();
        roll();
      }}
      class="flex gap-2"
    >
      <div class="relative flex-1 group">
        <input
          bind:this={formulaInput}
          type="text"
          bind:value={formula}
          onkeydown={handleKeyDown}
          placeholder="Enter formula (e.g. 2d20kh1 + 5)"
          class="w-full bg-theme-bg border border-theme-border rounded-xl pl-4 pr-10 py-3 text-sm focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none font-body transition-all placeholder:opacity-40"
        />
        <button
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors p-1"
          onclick={() => (showHelp = !showHelp)}
          title="Formula Help"
        >
          <span class="icon-[lucide--info] w-4 h-4"></span>
        </button>
      </div>
      <button
        type="submit"
        class="bg-theme-primary text-theme-bg font-bold px-6 py-2 rounded-xl text-xs tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-theme-primary/20"
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
