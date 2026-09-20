<script lang="ts">
  let { show }: { show: boolean } = $props();
</script>

{#if show}
  <span
    class="ml-2 rounded border border-theme-primary/40 bg-theme-primary/10 px-2 py-0.5 align-middle text-base sm:text-sm font-bold text-theme-primary"
    >Updated</span
  >
{/if}
