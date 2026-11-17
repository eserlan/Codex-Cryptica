<script lang="ts">
  import type { EffectiveValue } from "@codex/stat-sheet-engine";

  let { effective }: { effective: EffectiveValue } = $props();

  const formatAmount = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const summary = $derived(
    effective.contributions
      .map((c) => `${c.sourceTitle}: ${c.traitName} ${formatAmount(c.amount)}`)
      .join(", "),
  );
</script>

<span
  class="text-micro text-theme-text"
  data-testid="effective-value-note"
  title="Base value {effective.base}"
>
  Effective {effective.effective} · {summary}
</span>
