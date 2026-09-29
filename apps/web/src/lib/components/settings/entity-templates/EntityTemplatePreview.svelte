<script lang="ts">
  let { markdown }: { markdown: string } = $props();
</script>

{#if markdown.trim()}
  <pre
    class="max-h-72 overflow-auto whitespace-pre-wrap rounded border border-theme-border bg-theme-bg p-3 text-xs leading-relaxed text-theme-text"
    data-testid="entity-template-preview">{markdown}</pre>
{:else}
  <p
    class="rounded border border-dashed border-theme-border p-3 text-xs text-theme-muted"
    data-testid="entity-template-preview-empty"
  >
    New notes from this template start blank.
  </p>
{/if}
