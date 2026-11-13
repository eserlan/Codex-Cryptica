<script lang="ts">
  let { isDemoMode }: { isDemoMode: boolean } = $props();
</script>

{#if isDemoMode}
  <div
    role="status"
    class="bg-theme-primary/10 border-b border-theme-primary/30 px-4 py-1.5 text-helper text-theme-text text-center"
  >
    Demo: changes are not saved
  </div>
{/if}
