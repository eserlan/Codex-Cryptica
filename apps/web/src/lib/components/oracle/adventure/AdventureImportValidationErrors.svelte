<script lang="ts">
  interface ImportValidationIssue {
    code: string;
    message: string;
    path?: string;
    entityId?: string;
  }
  let {
    errors,
    repairPrompt = null,
  }: { errors: ImportValidationIssue[]; repairPrompt?: string | null } =
    $props();

  let copyStatus = $state<"success" | "failure" | null>(null);

  async function copyRepairPrompt(): Promise<void> {
    copyStatus = null;
    if (!repairPrompt || typeof navigator === "undefined") {
      copyStatus = "failure";
      return;
    }

    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) {
      copyStatus = "failure";
      return;
    }

    try {
      await clipboard.writeText(repairPrompt);
      copyStatus = "success";
    } catch {
      copyStatus = "failure";
    }
  }
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

  {#if repairPrompt}
    <div class="space-y-2 pt-1">
      <button
        type="button"
        class="inline-flex min-h-11 items-center justify-center rounded-md border border-theme-text bg-theme-surface px-3 py-2 text-sm font-medium text-theme-text transition hover:bg-theme-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
        onclick={copyRepairPrompt}
      >
        Copy repair prompt
      </button>

      {#if copyStatus === "success"}
        <p
          role="status"
          aria-live="polite"
          class="rounded-md border border-theme-primary/30 bg-theme-primary/5 px-3 py-2 text-sm text-theme-text"
          data-testid="adventure-repair-copy-success"
        >
          Repair prompt copied. You can choose where to paste it.
        </p>
      {:else if copyStatus === "failure"}
        <p
          role="alert"
          aria-live="assertive"
          class="rounded-md border border-theme-danger/30 bg-theme-danger/10 px-3 py-2 text-sm text-theme-text"
          data-testid="adventure-repair-copy-failure"
        >
          Could not copy the repair prompt. Check clipboard access and try
          again.
        </p>
      {/if}
    </div>
  {/if}
{/if}
