<script lang="ts">
  import type { PrepSource } from "generator-engine";

  let { source }: { source: PrepSource } = $props();
</script>

{#if source === "ai"}
  <span
    class="shrink-0 rounded bg-theme-primary/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-theme-primary"
    title="Drafted by AI. Edit it to make it yours."
  >
    AI
  </span>
{/if}
