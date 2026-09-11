<script lang="ts">
  import type { ImageNode as ImageNodeType } from "@codex/stat-sheet-engine";

  let { node }: { node: ImageNodeType } = $props();
</script>

<img
  src={node.src}
  alt={node.alt}
  class="max-w-full rounded border border-theme-border"
/>
