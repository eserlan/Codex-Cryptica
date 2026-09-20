<script lang="ts">
  import { getMode, type ModeId } from "generator-engine";

  let { mode, turn }: { mode: ModeId; turn?: number } = $props();

  const label = $derived(getMode(mode)?.label);
  const turnText = $derived(turn ? ` · Turn ${turn}` : "");
</script>

{#if label}
  <p
    class="font-mono text-base sm:text-sm font-bold uppercase tracking-[0.24em] text-theme-muted"
    data-testid="mode-label"
  >
    {label} mode{turnText}
  </p>
{/if}
