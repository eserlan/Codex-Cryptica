<script lang="ts">
  let {
    message,
    firstRetry,
    copyFailed,
    copied,
    retryLabel = "Retry",
    reloadLabel = "Reload page",
    onRetry,
    onCopy,
    onReload,
    onReloadCopied = onReload,
  }: {
    message: string;
    firstRetry: boolean;
    copyFailed: boolean;
    copied: boolean;
    retryLabel?: string;
    reloadLabel?: string;
    onRetry: () => void;
    onCopy: () => void;
    onReload: () => void;
    onReloadCopied?: () => void;
  } = $props();
</script>

<div class="mt-3 text-sm text-theme-text" role="alert">
  <p>{message}</p>
  {#if firstRetry}
    <button class="underline" onclick={onRetry}>{retryLabel}</button>
  {:else if copyFailed}
    <button class="underline" onclick={onCopy}
      >Copy result before leaving</button
    >
    <span role="status">Could not preserve the result for reload.</span>
  {:else if copied}
    <span role="status">Result copied. You can reload safely.</span>
    <button class="underline" onclick={onReloadCopied}>Reload page</button>
  {:else}
    <button class="underline" onclick={onReload}>{reloadLabel}</button>
  {/if}
</div>
