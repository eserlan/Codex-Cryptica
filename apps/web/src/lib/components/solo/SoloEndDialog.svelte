<script lang="ts">
  import { soloSessionStore } from "$lib/stores/solo-session-instance";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let { onclose }: { onclose: () => void } = $props();

  let busy = $state(false);

  async function end(endJournal: boolean) {
    if (busy) return;
    busy = true;
    try {
      await soloSessionStore.end({ endJournal });
      onclose();
    } finally {
      busy = false;
    }
  }

  // Without a running journal there is nothing to choose, so confirm once.
  if (!soloSessionStore.journalRunning) {
    void notificationStore
      .confirm({
        title: "End solo session?",
        message: "Your journal, rolls, map and vault stay as they are.",
        confirmLabel: "End session",
        cancelLabel: "Cancel",
      })
      .then((ok) => (ok ? end(false) : onclose()));
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") onclose();
  }
</script>

{#if soloSessionStore.journalRunning}
  <div
    class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
  >
    <div
      class="w-full max-w-sm rounded-xl border border-theme-border bg-theme-surface p-5 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="solo-end-title"
      tabindex="-1"
      onkeydown={onKeydown}
    >
      <h2 id="solo-end-title" class="font-header text-lg text-theme-text">
        End solo session?
      </h2>
      <p class="mt-2 text-sm text-theme-muted">
        Nothing is deleted. Your journal, rolls, map and vault stay as they are.
      </p>
      <div class="mt-5 flex flex-col gap-2">
        <button
          type="button"
          class="rounded-md border border-theme-border px-3 py-2 text-sm text-theme-text hover:border-theme-primary/60"
          data-testid="solo-end-keep-journal"
          onclick={() => end(false)}
        >
          End session, keep the journal running
        </button>
        <button
          type="button"
          class="rounded-md border border-theme-border px-3 py-2 text-sm text-theme-text hover:border-theme-primary/60"
          data-testid="solo-end-with-journal"
          onclick={() => end(true)}
        >
          End session and journal
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-2 text-sm text-theme-muted hover:text-theme-primary"
          data-testid="solo-end-cancel"
          onclick={onclose}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
