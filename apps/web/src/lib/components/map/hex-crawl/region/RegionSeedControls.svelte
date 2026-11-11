<script lang="ts">
  import { onDestroy } from "svelte";
  import { clipboardService } from "#lib/services/ClipboardService.js";
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";

  /** The seed: type one to repeat a result, copy it, or roll a new one. */
  let {
    store,
    copy = (text: string) => clipboardService.copyContent({ markdown: text }),
  }: {
    store: RegionGenerationStore;
    copy?: (text: string) => Promise<boolean>;
  } = $props();

  let seedText = $state("");
  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(timer));

  $effect(() => {
    if (store.review) seedText = store.review.seed;
  });

  function applySeed() {
    if (!store.setSeed(seedText) && store.review) seedText = store.review.seed;
  }

  async function copySeed() {
    if (!store.review) return;
    copied = await copy(store.review.seed);
    clearTimeout(timer);
    timer = setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="flex items-end gap-2">
  <label class="min-w-0 flex-1 space-y-1">
    <span
      class="text-micro font-bold uppercase tracking-widest text-theme-muted"
      >Seed</span
    >
    <input
      type="text"
      maxlength="32"
      class="min-h-11 w-full rounded-lg border border-theme-border bg-theme-bg px-2 font-mono text-sm text-theme-text"
      bind:value={seedText}
      onchange={applySeed}
    />
  </label>
  <button
    type="button"
    class="min-h-11 min-w-11 rounded-lg border border-theme-border text-theme-text"
    aria-label="Copy seed"
    onclick={copySeed}
  >
    <span
      class="{copied ? 'icon-[lucide--check]' : 'icon-[lucide--copy]'} h-4 w-4"
      aria-hidden="true"
    ></span>
  </button>
  <button
    type="button"
    class="min-h-11 min-w-11 rounded-lg border border-theme-border text-theme-text"
    aria-label="Reroll"
    onclick={() => store.reroll()}
  >
    <span class="icon-[lucide--dices] h-4 w-4" aria-hidden="true"></span>
  </button>
</div>
