<script lang="ts">
  import { getMode, type ModeId } from "generator-engine";

  let {
    mode,
    turn,
    maxTurns,
  }: { mode: ModeId; turn?: number; maxTurns?: number } = $props();

  const label = $derived(getMode(mode)?.label);
  const turnText = $derived(
    turn && maxTurns ? ` · Turn ${turn} of ${maxTurns}` : "",
  );
</script>

{#if label}
  <p
    class="font-mono text-base sm:text-sm font-bold uppercase tracking-[0.24em] text-theme-muted"
    data-testid="mode-label"
  >
    {label} mode{turnText}
  </p>
{/if}
