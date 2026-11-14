<script lang="ts">
  /** Last-saved line, any sync error, and the recovery key when it is revealed. */
  interface Props {
    lastPushed: string | null;
    error: string | null;
    recoveryKey: string | null;
  }

  let { lastPushed, error, recoveryKey }: Props = $props();
</script>

<p class="text-sm text-theme-text">
  {#if lastPushed}
    Last saved {lastPushed}. Changes sync automatically while backup is on —
    Save to cloud pushes immediately.
  {:else}
    Not saved yet. Changes will sync automatically once the first save
    completes.
  {/if}
</p>
{#if error}
  <p class="text-sm text-red-400" role="alert">
    {error}
  </p>
{/if}
{#if recoveryKey}
  <p class="break-all font-mono text-xs text-theme-text">
    {recoveryKey}
  </p>
{/if}
