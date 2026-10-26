<script lang="ts">
  import type { BiomeExplorerStore } from "#lib/stores/biome-explorer.svelte.js";

  let { store }: { store: BiomeExplorerStore } = $props();
</script>

{#if store.copyFallbackText}
  <div class="flex flex-col gap-2" data-testid="biome-copy-fallback">
    <label for="biome-copy-fallback" class="text-sm text-theme-muted">
      Your browser didn't let us copy automatically. Select this text and copy
      it yourself.
    </label>
    <textarea
      id="biome-copy-fallback"
      readonly
      rows="8"
      class="w-full rounded border border-theme-border bg-theme-surface p-2 font-mono text-xs text-theme-text"
      onfocus={(e) => e.currentTarget.select()}
      >{store.copyFallbackText}</textarea
    >
    <button
      type="button"
      class="self-start rounded border border-theme-border px-3 py-1 text-sm text-theme-text hover:border-theme-primary"
      onclick={() => (store.copyFallbackText = null)}>Close</button
    >
  </div>
{/if}
