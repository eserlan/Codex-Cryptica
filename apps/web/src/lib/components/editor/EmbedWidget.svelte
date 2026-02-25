<script lang="ts">
  import { NodeViewWrapper } from "svelte-tiptap";

  // Props passed from Tiptap node
  interface NodeProps {
    node: {
      attrs: {
        src: string;
        title?: string;
      };
    };
    updateAttributes: (attrs: Record<string, any>) => void;
  }

  // Cast to any to avoid strict Svelte 5/Tiptap prop type issues for now, or use loose typing
  let { node } = $props() as unknown as NodeProps;

  let src = $derived(node?.attrs?.src || "");
  let title = $derived(node?.attrs?.title || "Embedded Content");
</script>

<NodeViewWrapper class="embed-widget my-4">
  <div
    class="border border-theme-border bg-theme-surface/50 rounded-lg overflow-hidden"
  >
    <div
      class="bg-theme-surface px-3 py-2 border-b border-theme-border flex justify-between items-center"
    >
      <span class="text-sm font-medium text-theme-text">{title}</span>
      <span class="text-xs text-theme-muted font-mono">{src}</span>
    </div>
    <div class="p-4 flex justify-center items-center bg-black/20 min-h-[100px]">
      {#if src}
        <div class="text-theme-muted italic">
          <!-- In a real app, this would be an iframe or dynamic loader -->
          [Embedded Content Placeholder: {src}]
        </div>
      {:else}
        <div class="text-theme-accent text-sm">No source configured</div>
      {/if}
    </div>
  </div>
</NodeViewWrapper>

<style>
  :global(.embed-widget) {
    /* Prevent prosemirror selection issues */
    user-select: none;
  }
</style>
