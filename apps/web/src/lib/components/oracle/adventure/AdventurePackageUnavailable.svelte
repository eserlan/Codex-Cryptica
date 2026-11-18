<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import {
    PACKAGE_OTHER_VERSION_COPY,
    PACKAGE_UNAVAILABLE_COPY,
  } from "#lib/services/adventure/adventure-start-failure.js";

  let { manager }: { manager: AdventureManager } = $props();
  let retrying = $state(false);
  let stillUnavailable = $state(false);

  async function retry(): Promise<void> {
    if (retrying) return;
    retrying = true;
    stillUnavailable = false;
    try {
      stillUnavailable = !(await manager.retryPackageCheck());
    } catch {
      stillUnavailable = true;
    } finally {
      retrying = false;
    }
  }
</script>

<div
  class="rounded-lg border border-theme-border bg-theme-bg p-3 text-sm text-theme-text"
  role="status"
  data-testid="package-unavailable"
>
  <p>{PACKAGE_UNAVAILABLE_COPY}</p>
  {#if manager.packageUnavailable?.otherVersionAvailable}
    <p class="mt-2" data-testid="package-other-version">
      {PACKAGE_OTHER_VERSION_COPY}
    </p>
  {/if}
  <div class="mt-2 flex flex-wrap gap-2">
    <button
      type="button"
      class="min-h-11 rounded-lg border border-theme-border px-3 py-2 font-medium transition hover:bg-theme-primary/10 disabled:opacity-50"
      disabled={retrying}
      onclick={() => void retry()}
    >
      {retrying ? "Checking…" : "Retry"}
    </button>
    <button
      type="button"
      class="min-h-11 rounded-lg border border-theme-border px-3 py-2 font-medium transition hover:bg-theme-primary/10"
      onclick={() => void manager.close()}
    >
      Leave session
    </button>
  </div>
  {#if stillUnavailable}
    <p class="mt-2">The package is still unavailable.</p>
  {/if}
</div>
