<script lang="ts">
  import ModalShell from "$lib/components/ui/ModalShell.svelte";
  import type { GeneratorShareFlowState } from "$lib/services/sharing/generator-share-flow.svelte";

  let {
    open,
    state,
    subject,
    shareData,
    onConfirm,
    onCopyLink,
    onClose,
  }: {
    open: boolean;
    state: GeneratorShareFlowState;
    subject?: string;
    shareData?: { url: string; title?: string; text?: string };
    onConfirm: () => void;
    onCopyLink: (url: string) => void;
    onClose: () => void;
  } = $props();

  const label = $derived(subject || "this");
</script>

<ModalShell
  {open}
  onClose={state === "loading" ? () => {} : onClose}
  dismissible={state !== "loading"}
  labelledBy="share-heading"
  maxWidthClass="max-w-sm"
  class="rounded-xl border border-theme-border bg-theme-surface p-6"
  closeAriaLabel="Close"
  fadeDuration={120}
  scaleDuration={150}
>
  {#if state === "confirm"}
    <h2
      id="share-heading"
      class="text-sm font-bold uppercase tracking-wider text-theme-text"
    >
      Share Result
    </h2>
    <p class="mt-1 text-xs leading-relaxed text-theme-muted">
      Create a shareable link for {label}.
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
        data-testid="share-confirm-button"
      >
        Create Link
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
          id="share-heading"
          class="text-sm font-bold uppercase tracking-wider text-theme-text"
        >
          Creating Link…
        </h2>
        <p class="mt-1 text-xs leading-relaxed text-theme-muted">
          Setting up your share.
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
          id="share-heading"
          class="text-sm font-bold uppercase tracking-wider text-theme-text"
        >
          Link Ready
        </h2>
        <p class="mt-1 text-xs leading-relaxed text-theme-muted">
          Share this link with others.
        </p>
        {#if shareData}
          <div class="mt-3 flex flex-col gap-2">
            <a
              href={shareData.url}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-md bg-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-bg transition hover:opacity-90"
              data-testid="share-open-link"
            >
              <span
                class="icon-[lucide--external-link] h-3 w-3"
                aria-hidden="true"
              ></span>
              Open Link
            </a>
            <button
              type="button"
              onclick={() => onCopyLink(shareData.url)}
              class="inline-flex items-center justify-center gap-2 rounded-md border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-text transition hover:bg-theme-surface-hover"
              data-testid="share-copy-button"
            >
              <span class="icon-[lucide--copy] h-3 w-3" aria-hidden="true"
              ></span>
              Copy Link
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</ModalShell>
