<script lang="ts">
  import type { SoloExplorationRecorder } from "./solo-exploration-recorder.svelte";

  let {
    recorder,
    visible,
  }: {
    recorder?: SoloExplorationRecorder;
    visible: boolean;
  } = $props();

  function describe(
    travel: { hexes: number | null; distance: number; unit: string } | null,
  ) {
    if (!travel) return "—";
    const distanceText = `${travel.distance} ${travel.unit}`;
    if (travel.hexes === null) return distanceText;

    const hexText = `${travel.hexes} ${travel.hexes === 1 ? "hex" : "hexes"}`;
    return `${hexText} (${distanceText})`;
  }
</script>

{#if visible && recorder}
  <div
    class="flex items-center gap-2 rounded-md border border-theme-border bg-theme-surface/80 px-2 py-1 text-nano text-theme-text"
    data-help-target="vtt-travel-readout"
    aria-live="polite"
    aria-atomic="true"
  >
    <span
      >Last: {describe(recorder.lastMove)} · Total: {describe(
        recorder.total,
      )}</span
    >
    <button
      type="button"
      class="touch-target rounded px-1.5 py-1 font-bold text-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-theme-primary"
      onclick={() => recorder.reset()}
      aria-label="Reset travel distance">Reset</button
    >
  </div>
{/if}
