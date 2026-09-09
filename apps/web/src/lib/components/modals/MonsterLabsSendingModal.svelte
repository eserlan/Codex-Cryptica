<script lang="ts">
  import ModalShell from "$lib/components/ui/ModalShell.svelte";
  import type { MonsterLabsHandoffState } from "$lib/services/seo/monsterlabs-handoff-flow.svelte";

  let {
    open,
    state,
    entityLabel,
    url,
    onConfirm,
    onOpen,
    onClose,
  }: {
    open: boolean;
    state: MonsterLabsHandoffState;
    /** The entity/draft name, shown so the notice reads as specific rather than generic. */
    entityLabel?: string;
    /** The built MonsterLabs URL, once `state` is "ready". */
    url?: string;
    onConfirm: () => void;
    onOpen: () => void;
    onClose: () => void;
  } = $props();

  const label = $derived(entityLabel || "this");
</script>

<ModalShell
  {open}
  onClose={state === "loading" ? () => {} : onClose}
  dismissible={state !== "loading"}
  labelledBy="monsterlabs-sending-heading"
  maxWidthClass="max-w-sm"
  class="rounded-xl border border-theme-border bg-theme-surface p-6"
  closeAriaLabel="Close"
  fadeDuration={120}
  scaleDuration={150}
>
  {#if state === "confirm"}
    <h2
      id="monsterlabs-sending-heading"
      class="text-sm font-bold uppercase tracking-wider text-theme-text"
    >
      Send to MonsterLabs?
    </h2>
    <p class="mt-1 text-xs leading-relaxed text-theme-muted">
      This sends {label} to monsterlabs.app in a new tab. Long descriptions are shortened
      by the Oracle first, so this can take a few seconds.
    </p>
    <div class="mt-4 flex justify-end gap-2">
      <button
        type="button"
        onclick={onClose}
        class="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-muted transition hover:text-theme-text"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={onConfirm}
        class="rounded-md bg-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-bg transition hover:opacity-90"
        data-testid="monsterlabs-confirm-button"
      >
        Go to MonsterLabs
      </button>
    </div>
  {:else if state === "loading"}
    <div class="flex items-start gap-4">
      <span
        class="icon-[lucide--loader-2] h-6 w-6 shrink-0 animate-spin text-theme-primary"
        aria-hidden="true"
      ></span>
      <div>
        <h2
          id="monsterlabs-sending-heading"
          class="text-sm font-bold uppercase tracking-wider text-theme-text"
        >
          Asking the Oracle…
        </h2>
        <p class="mt-1 text-xs leading-relaxed text-theme-muted">
          Shortening {label} to fit MonsterLabs' prompt limit.
        </p>
      </div>
    </div>
  {:else}
    <div class="flex items-start gap-4">
      <span
        class="icon-[lucide--check-circle-2] h-6 w-6 shrink-0 text-theme-primary"
        aria-hidden="true"
      ></span>
      <div class="min-w-0">
        <h2
          id="monsterlabs-sending-heading"
          class="text-sm font-bold uppercase tracking-wider text-theme-text"
        >
          Ready for MonsterLabs
        </h2>
        <p class="mt-1 text-xs leading-relaxed text-theme-muted">
          A new tab should have opened. If it didn't, your browser may have
          blocked the popup — use the link below instead.
        </p>
        {#if url}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onclick={onOpen}
            class="mt-3 inline-block rounded-md bg-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-bg transition hover:opacity-90"
            data-testid="monsterlabs-open-link"
          >
            Open MonsterLabs
          </a>
        {/if}
      </div>
    </div>
  {/if}
</ModalShell>
