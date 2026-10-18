<script lang="ts">
  import type { StatBlockImportController } from "./stat-block-import-controller.svelte";

  let { controller }: { controller: StatBlockImportController } = $props();

  function convertTo5eTov() {
    controller.setMode("convert-5e");
    void controller.read();
  }
</script>

<div class="flex flex-col gap-2">
  {#if controller.result?.reader === "rules"}
    <p
      class="text-sm text-theme-muted"
      data-testid="stat-block-quick-reader-notice"
    >
      AI is off, so a quick reader was used. Some fields may need filling in by
      hand.
    </p>
  {/if}
  {#if controller.result?.looksLike === "5e" && controller.mode === "copy" && controller.aiAvailable}
    <div
      class="flex items-center justify-between gap-2 rounded border border-theme-border p-2 text-sm"
      data-testid="stat-block-5e-notice"
    >
      <span
        >This looks like a 5e stat block. Want to convert it to Tales of the
        Valiant instead?</span
      >
      <button
        type="button"
        class="rounded border border-theme-border px-2 py-1 text-micro font-bold uppercase tracking-wide hover:border-theme-primary"
        onclick={convertTo5eTov}
      >
        Convert from 5e
      </button>
    </div>
  {/if}
</div>
