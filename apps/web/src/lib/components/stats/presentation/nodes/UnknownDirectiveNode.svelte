<script lang="ts">
  import type { UnknownDirectiveNode as UnknownDirectiveNodeType } from "@codex/stat-sheet-engine";

  let { node }: { node: UnknownDirectiveNodeType } = $props();
</script>

<div
  class="rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-600 dark:text-amber-400"
  data-testid="presentation-unknown-directive"
  title={`This template uses a directive ("${node.name}") this version of the app doesn't recognize.`}
>
  <span
    class="icon-[lucide--alert-triangle] mr-1 h-3 w-3 align-[-1px]"
    aria-hidden="true"
  ></span>
  Unsupported layout section: {node.name}
</div>
