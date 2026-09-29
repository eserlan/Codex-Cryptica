<script lang="ts">
  /** Problems with the publish form, and any error from the last attempt. */
  let {
    issues,
    error,
  }: {
    /** Shown only once the user has tried to publish. */
    issues: string[];
    error: string;
  } = $props();
</script>

{#if issues.length}
  <ul
    class="space-y-1 text-xs text-theme-danger"
    role="alert"
    data-testid="publish-issues"
  >
    {#each issues as issue (issue)}<li>{issue}</li>{/each}
  </ul>
{/if}
{#if error}
  <p class="text-sm text-theme-danger" role="alert">{error}</p>
{/if}
