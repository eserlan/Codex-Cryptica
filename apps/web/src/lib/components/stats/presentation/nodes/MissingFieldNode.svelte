<script lang="ts">
  import type { MissingFieldNode as MissingFieldNodeType } from "@codex/stat-sheet-engine";

  let { node }: { node: MissingFieldNodeType } = $props();
</script>

<span
  class="inline-flex items-center gap-1 rounded border border-dashed border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-600 dark:text-amber-400"
  data-testid="presentation-missing-field"
  title={`This template refers to a field ("${node.fieldId}") that no longer exists on the schema.`}
>
  <span class="icon-[lucide--alert-triangle] h-3 w-3" aria-hidden="true"></span>
  {node.label ?? node.fieldId} (missing field)
</span>
