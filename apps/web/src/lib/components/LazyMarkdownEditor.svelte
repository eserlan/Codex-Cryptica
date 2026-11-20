<script lang="ts">
  import type { ComponentProps } from "svelte";
  import type MarkdownEditorType from "./MarkdownEditor.svelte";

  let props: ComponentProps<typeof MarkdownEditorType> = $props();
</script>

{#await import("#lib/components/MarkdownEditor.svelte")}
  <div
    class="min-h-32 animate-pulse rounded-lg border border-theme-border bg-theme-surface/50 p-3 text-xs text-theme-text"
  >
    Loading editor…
  </div>
{:then { default: MarkdownEditor }}
  <MarkdownEditor {...props} />
{/await}
