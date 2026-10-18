<script lang="ts">
  let {
    canEdit,
    warnings,
    importError,
  }: {
    canEdit: boolean;
    warnings: string[];
    importError: string;
  } = $props();
</script>

{#if !canEdit}
  <p
    class="rounded border border-theme-border bg-theme-surface p-3 text-xs text-theme-muted"
    data-testid="entity-template-readonly"
  >
    Templates can be viewed here but not changed in this vault.
  </p>
{/if}

{#if warnings.length}
  <ul
    class="space-y-1 rounded border border-theme-warning/40 bg-theme-warning/10 p-3 text-xs text-theme-text"
    data-testid="entity-template-warnings"
  >
    {#each warnings as warning, i (i)}
      <li>{warning}</li>
    {/each}
  </ul>
{/if}

{#if importError}
  <p
    class="text-xs text-theme-danger"
    role="alert"
    data-testid="entity-template-import-error"
  >
    {importError}
  </p>
{/if}
