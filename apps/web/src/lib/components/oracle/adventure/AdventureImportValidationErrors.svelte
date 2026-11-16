<script lang="ts">
  interface ImportValidationIssue {
    code: string;
    message: string;
    path?: string;
    entityId?: string;
  }
  let { errors }: { errors: ImportValidationIssue[] } = $props();
</script>

{#if errors.length > 0}
  <ul class="space-y-1.5 pl-1" data-testid="adventure-import-error-list">
    {#each errors as err, index (`${err.code}-${index}`)}
      <li
        class="rounded border border-theme-danger/30 bg-theme-surface/70 p-2 text-xs"
      >
        <div class="flex flex-wrap items-center gap-2 font-mono">
          <span class="font-semibold">{err.code}</span>
          {#if err.path}
            <span class="break-all">path: {err.path}</span>
          {/if}
          {#if err.entityId}
            <span class="break-all">entity: {err.entityId}</span>
          {/if}
        </div>
        <p class="mt-0.5 text-sm">{err.message}</p>
      </li>
    {/each}
  </ul>
{/if}
