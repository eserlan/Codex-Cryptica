<script lang="ts">
  import AdventureImportValidationErrors from "./AdventureImportValidationErrors.svelte";

  interface ImportValidationIssue {
    code: string;
    message: string;
    path?: string;
    entityId?: string;
  }

  let {
    importing,
    importError,
    importValidationErrors,
    importRepairPrompt = null,
  }: {
    importing: boolean;
    importError: string | null;
    importValidationErrors: ImportValidationIssue[];
    importRepairPrompt?: string | null;
  } = $props();
</script>

{#if importing}
  <div
    role="status"
    data-testid="adventure-import-loading"
    class="rounded-lg border border-theme-border bg-theme-surface p-3 text-sm text-theme-text"
  >
    Importing adventure…
  </div>
{/if}

{#if importError || importValidationErrors.length > 0}
  <div
    role="alert"
    data-testid="adventure-import-error"
    class="space-y-2 rounded-lg border border-theme-danger/50 bg-theme-danger/10 p-3 text-sm text-theme-text"
  >
    {#if importError}
      <p class="font-medium">{importError}</p>
    {/if}
    <AdventureImportValidationErrors
      errors={importValidationErrors}
      repairPrompt={importRepairPrompt}
    />
  </div>
{/if}
