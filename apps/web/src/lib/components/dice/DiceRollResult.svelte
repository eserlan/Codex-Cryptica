<script lang="ts">
  import { getDiceIcon } from "$lib/utils/dice-icons";

  export interface DiceRollResultData {
    formula: string;
    total: number;
    parts: Array<{
      type: "dice" | "modifier";
      value: number;
      sides?: number;
      rolls?: number[];
      dropped?: number[];
    }>;
  }

  // Parse a target-roll outcome from the formula string.
  // Matches patterns like: "Evade (1d100 vs 67 - Success)"
  function parseOutcome(formula: string): {
    label: string;
    target: number | null;
    cleanFormula: string;
  } | null {
    const m = formula.match(
      /\((.+?)\s+vs\s+(\d+)\s+-\s+(Critical Success|Success|Failure|Fumble)\)$/i,
    );
    if (!m) return null;
    return {
      label: m[3],
      target: Number(m[2]),
      cleanFormula: formula.replace(/\s*\(.*vs.*\)$/, "").trim(),
    };
  }

  let { result }: { result: DiceRollResultData | undefined } = $props();

  const outcome = $derived(result ? parseOutcome(result.formula) : null);
  const displayFormula = $derived(
    outcome ? outcome.cleanFormula : (result?.formula ?? ""),
  );

  const outcomeStyle = $derived.by(() => {
    if (!outcome) return null;
    switch (outcome.label.toLowerCase()) {
      case "critical success":
        return {
          border: "border-yellow-400/60",
          bg: "bg-yellow-400/10",
          text: "text-yellow-300",
          glow: "shadow-[0_0_14px_rgba(250,204,21,0.4)]",
          icon: "icon-[lucide--star]",
        };
      case "success":
        return {
          border: "border-emerald-400/60",
          bg: "bg-emerald-400/10",
          text: "text-emerald-300",
          glow: "shadow-[0_0_14px_rgba(52,211,153,0.35)]",
          icon: "icon-[lucide--circle-check]",
        };
      case "fumble":
        return {
          border: "border-orange-500/60",
          bg: "bg-orange-500/10",
          text: "text-orange-400",
          glow: "shadow-[0_0_14px_rgba(249,115,22,0.35)]",
          icon: "icon-[lucide--skull]",
        };
      default: // Failure
        return {
          border: "border-red-500/50",
          bg: "bg-red-500/10",
          text: "text-red-400",
          glow: "shadow-[0_0_14px_rgba(239,68,68,0.3)]",
          icon: "icon-[lucide--circle-x]",
        };
    }
  });
</script>

{#if result}
  <div class="flex flex-col gap-3 py-2 w-full max-w-full overflow-hidden">
    {#if outcome && outcomeStyle}
      <!-- Outcome banner -->
      <div
        class="flex items-center justify-between gap-3 rounded-lg border {outcomeStyle.border} {outcomeStyle.bg} {outcomeStyle.glow} px-3 py-2.5"
      >
        <div class="flex items-center gap-2">
          <span
            class="{outcomeStyle.icon} h-5 w-5 {outcomeStyle.text}"
            aria-hidden="true"
          ></span>
          <span
            class="text-base font-bold tracking-wide font-header {outcomeStyle.text}"
          >
            {outcome.label.toUpperCase()}
          </span>
        </div>
        <div class="flex items-center gap-1.5 font-mono">
          <span class="text-xl font-bold font-header {outcomeStyle.text}"
            >{result.total}</span
          >
          <span class="text-xs opacity-50 text-theme-muted">vs</span>
          <span class="text-sm font-bold text-theme-text">{outcome.target}</span
          >
        </div>
      </div>
    {/if}

    <div
      class="grid grid-cols-[1fr_auto] items-end gap-x-4 {outcome
        ? ''
        : 'border-b border-theme-primary/20 pb-2'}"
    >
      {#if !outcome}
        <div class="flex flex-col min-w-0">
          <span
            class="text-[9px] font-bold text-theme-muted uppercase tracking-widest leading-none mb-1 font-header"
            >Result</span
          >
          <span
            class="text-3xl font-bold text-theme-primary font-header leading-tight truncate"
          >
            {result.total}
          </span>
        </div>
      {:else}
        <div></div>
      {/if}
      <div class="flex flex-col items-end shrink-0 min-w-0">
        <span
          class="text-[9px] font-bold text-theme-muted uppercase tracking-widest leading-none mb-1 font-header"
          >Formula</span
        >
        <span
          class="text-xs font-header text-theme-text bg-theme-primary/10 px-2 py-1 rounded border border-theme-primary/20 whitespace-nowrap"
        >
          {displayFormula}
        </span>
      </div>
    </div>

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
                class="text-[9px] font-bold text-theme-muted uppercase tracking-tighter font-header"
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
                class="h-8 flex items-center px-2 text-xs font-bold text-theme-primary/80 font-header"
              >
                = {part.value}
              </div>
            </div>
          </div>
        {:else}
          <div
            class="flex items-center gap-2 bg-theme-primary/5 rounded px-3 py-1.5 border border-theme-primary/10 w-fit"
          >
            <span
              class="text-[10px] font-bold text-theme-muted uppercase font-header"
              >Modifier</span
            >
            <span class="text-sm font-bold text-theme-primary font-header"
              >{part.value >= 0 ? "+" : "-"}{Math.abs(part.value)}</span
            >
          </div>
        {/if}
      {/each}
    </div>
  </div>
{/if}
