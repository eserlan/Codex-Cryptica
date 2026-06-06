<script lang="ts">
  import { graph } from "$lib/stores/graph.svelte";

  let {
    onToggle,
  }: {
    onToggle?: () => void;
  } = $props();

  function toggle() {
    graph.toggleChronologyEditMode();
    onToggle?.();
  }
</script>

<button
  type="button"
  onclick={toggle}
  class={[
    "inline-flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-bold tracking-widest transition",
    graph.chronologyEditMode
      ? "border-feedback-warning/60 bg-feedback-warning/15 text-feedback-warning"
      : "border-theme-border bg-theme-surface/90 text-theme-muted hover:border-theme-primary hover:text-theme-primary",
  ]}
  aria-pressed={graph.chronologyEditMode}
  aria-label="Toggle edit chronology mode"
  title="Edit Chronology"
>
  <span class="icon-[lucide--move-horizontal] h-3.5 w-3.5"></span>
  EDIT CHRONOLOGY
</button>
