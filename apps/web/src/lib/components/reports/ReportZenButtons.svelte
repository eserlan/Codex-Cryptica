<script lang="ts">
  import type { Entity } from "schema";
  import {
    exportReport,
    isReportEntity,
    regenerateReport,
  } from "./ReportZenActions";

  let { entity }: { entity: Entity } = $props();

  let busy = $state(false);

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    busy = true;
    try {
      await action();
    } finally {
      busy = false;
    }
  }
</script>

{#if isReportEntity(entity)}
  <button
    type="button"
    onclick={() => run(() => regenerateReport(entity))}
    disabled={busy}
    title="Regenerate report"
    aria-label="Regenerate report"
    data-testid="report-regenerate-button"
    class="flex items-center gap-2 rounded border border-theme-border px-2 py-1.5 text-micro font-bold tracking-widest text-theme-secondary transition hover:text-theme-primary disabled:opacity-50 md:px-3 md:text-xs"
  >
    <span aria-hidden="true" class="icon-[lucide--refresh-cw] h-4 w-4"></span>
    <span class="hidden sm:inline">REGENERATE</span>
  </button>
  <button
    type="button"
    onclick={() => run(() => exportReport(entity))}
    disabled={busy}
    title="Copy report as Markdown"
    aria-label="Copy report as Markdown"
    data-testid="report-export-button"
    class="flex items-center gap-2 rounded border border-theme-border px-2 py-1.5 text-micro font-bold tracking-widest text-theme-secondary transition hover:text-theme-primary disabled:opacity-50 md:px-3 md:text-xs"
  >
    <span aria-hidden="true" class="icon-[lucide--clipboard-copy] h-4 w-4"
    ></span>
    <span class="hidden sm:inline">EXPORT</span>
  </button>
{/if}
