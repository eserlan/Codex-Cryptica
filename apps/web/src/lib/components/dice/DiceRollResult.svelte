<script lang="ts">
  import DiceBreakdown from "./DiceBreakdown.svelte";

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

    <DiceBreakdown
      parts={result.parts}
      total={result.total}
      showFormula={false}
      showTotal={false}
      framed={false}
    />
  </div>
{/if}
