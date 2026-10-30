<script lang="ts">
  import type { ComponentProps } from "svelte";
  import GeneratorConfigForm from "./GeneratorConfigForm.svelte";
  let {
    generatorId = $bindable(),
    questHook,
    onPlotTwist,
    ...configProps
  }: ComponentProps<typeof GeneratorConfigForm> & {
    questHook?: { title: string };
    onPlotTwist: () => void;
  } = $props();
</script>

{#if questHook && generatorId !== "plot-twist"}
  <div
    class="mb-4 rounded-lg border border-chrome-accent/30 bg-chrome-accent/5 p-3"
    data-testid="plot-twist-from-quest-hook"
  >
    <div class="flex items-start gap-3">
      <span
        aria-hidden="true"
        class="icon-[lucide--sparkles] mt-0.5 h-4 w-4 shrink-0 text-chrome-accent"
      ></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-semibold text-chrome-text">
          One quest hook is in your campaign memory
        </p>
        <p class="mt-1 truncate text-xs text-chrome-muted">
          {questHook.title}
        </p>
        <button
          type="button"
          class="mt-2 inline-flex items-center gap-2 rounded border border-chrome-accent/50 px-2.5 py-1.5 text-xs font-semibold text-chrome-accent transition hover:bg-chrome-accent/10"
          onclick={onPlotTwist}
        >
          <span aria-hidden="true" class="icon-[lucide--shuffle] h-3.5 w-3.5"
          ></span>
          Turn it into a Plot Twist
        </button>
      </div>
    </div>
  </div>
{/if}
<GeneratorConfigForm {...configProps} bind:generatorId />
