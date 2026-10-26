<script lang="ts">
  import type { BiomeExplorerStore } from "#lib/stores/biome-explorer.svelte.js";

  let { store }: { store: BiomeExplorerStore } = $props();

  const secondary =
    "rounded-lg border border-theme-border px-4 py-2 text-theme-text hover:border-theme-primary";

  function downloadMarkdown() {
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function")
      return;
    const blob = new Blob([store.exportDraftMarkdown()], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = store.markdownFilename();
    link.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="flex flex-wrap gap-3">
  <button
    type="button"
    class="rounded-lg bg-theme-primary px-4 py-2 text-theme-on-primary"
    onclick={() => store.copyMarkdown()}>Copy as Markdown</button
  >
  <button type="button" class={secondary} onclick={downloadMarkdown}
    >Download Markdown</button
  >
  <button type="button" class={secondary} onclick={() => store.discardDraft()}
    >Discard</button
  >
</div>
