<script lang="ts">
  import {
    clipboardService as defaultClipboardService,
    type ClipboardService,
  } from "$lib/services/ClipboardService";

  let {
    text,
    clipboardService = defaultClipboardService,
  }: {
    /** What to copy, as markdown. */
    text: string;
    clipboardService?: Pick<ClipboardService, "copyContent">;
  } = $props();

  let copied = $state(false);
  let failed = $state(false);

  async function copy() {
    failed = false;
    try {
      const success = await clipboardService.copyContent({ markdown: text });
      copied = success;
      failed = !success;
      if (success) setTimeout(() => (copied = false), 2000);
    } catch {
      failed = true;
    }
  }
</script>

<div class="flex flex-wrap items-center gap-3">
  <button
    type="button"
    onclick={copy}
    class="min-h-11 justify-center inline-flex items-center gap-2 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-base sm:text-sm font-bold uppercase tracking-wider text-theme-text transition-colors hover:border-theme-primary/50"
  >
    <span class="icon-[lucide--copy] h-4 w-4" aria-hidden="true"></span>
    Copy result
  </button>
  {#if copied}
    <span class="text-base sm:text-sm text-theme-muted" role="status"
      >Copied</span
    >
  {/if}
  {#if failed}
    <span class="text-base sm:text-sm text-theme-muted" role="alert"
      >Couldn't copy. Select the text and copy it instead.</span
    >
  {/if}
</div>
