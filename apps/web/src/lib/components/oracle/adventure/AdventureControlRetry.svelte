<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";

  let { manager }: { manager: AdventureManager } = $props();
  let retryingControl = $state(false);
  let controlRetryMessage = $state<string | null>(null);

  async function retryControl(): Promise<void> {
    if (retryingControl) return;
    retryingControl = true;
    controlRetryMessage = null;
    try {
      if (!(await manager.tryTakeControl())) {
        controlRetryMessage =
          "This adventure is still in use elsewhere. Leave it in the other tab and try again.";
      }
    } catch (cause) {
      controlRetryMessage =
        cause instanceof Error
          ? `Unable to take control: ${cause.message}`
          : "Unable to take control of this adventure.";
    } finally {
      retryingControl = false;
    }
  }
</script>

<div
  class="rounded-lg border border-theme-border bg-theme-bg p-3 text-sm text-theme-text"
  role="status"
>
  <p>
    Another tab may be controlling this adventure. Leave it there or close that
    tab, then try again here. Your progress is saved.
  </p>
  <button
    type="button"
    class="mt-2 min-h-11 rounded-lg border border-theme-border px-3 py-2 font-medium transition hover:bg-theme-primary/10 disabled:opacity-50"
    disabled={retryingControl}
    onclick={() => void retryControl()}
  >
    {retryingControl ? "Checking…" : "Try to take control"}
  </button>
  {#if retryingControl}
    <p class="mt-2 text-theme-text" data-testid="control-retry-waiting">
      Waiting for the other tab to let go. This can take up to 10 seconds.
    </p>
  {/if}
  {#if controlRetryMessage}
    <p class="mt-2 text-theme-text">{controlRetryMessage}</p>
  {/if}
</div>
