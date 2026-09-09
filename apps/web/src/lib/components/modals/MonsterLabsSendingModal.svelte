<script lang="ts">
  import ModalShell from "$lib/components/ui/ModalShell.svelte";

  let {
    open,
    entityLabel,
    blockedUrl = null,
    onOpenBlocked,
  }: {
    open: boolean;
    /** The entity/draft name, shown so the notice reads as specific rather than generic. */
    entityLabel?: string;
    /**
     * Set once the instruction is ready but the browser blocked the
     * deferred `window.open` (crossing the compression `await` means the
     * tab-open is no longer guaranteed to count as part of the original
     * user gesture in every browser). Switches the modal to a manual
     * "open MonsterLabs" link — a real click on it is itself a fresh
     * gesture, so it will not be blocked.
     */
    blockedUrl?: string | null;
    /** Called after the user follows the manual link, so the caller can close this modal. */
    onOpenBlocked?: () => void;
  } = $props();
</script>

<ModalShell
  {open}
  onClose={() => {}}
  dismissible={false}
  labelledBy="monsterlabs-sending-heading"
  maxWidthClass="max-w-sm"
  class="rounded-xl border border-theme-border bg-theme-surface p-6"
  closeAriaLabel="Preparing MonsterLabs instruction"
  fadeDuration={120}
  scaleDuration={150}
>
  {#if blockedUrl}
    <div class="flex items-start gap-4">
      <span
        class="icon-[lucide--external-link] h-6 w-6 shrink-0 text-theme-primary"
        aria-hidden="true"
      ></span>
      <div class="flex-grow">
        <h2
          id="monsterlabs-sending-heading"
          class="text-sm font-bold uppercase tracking-wider text-theme-text"
        >
          MonsterLabs is ready
        </h2>
        <p class="mt-1 text-xs leading-relaxed text-theme-muted">
          Your browser blocked the automatic tab. Open it manually to continue.
        </p>
        <a
          href={blockedUrl}
          target="_blank"
          rel="noopener noreferrer"
          onclick={() => onOpenBlocked?.()}
          class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-theme-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-bg transition-all hover:brightness-110"
        >
          Open MonsterLabs
        </a>
      </div>
    </div>
  {:else}
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
          Preparing MonsterLabs instruction…
        </h2>
        <p class="mt-1 text-xs leading-relaxed text-theme-muted">
          {entityLabel
            ? `Getting ${entityLabel} ready for MonsterLabs.`
            : "Getting this ready for MonsterLabs."} Long descriptions are shortened
          by the Oracle first, so this can take a few seconds.
        </p>
      </div>
    </div>
  {/if}
</ModalShell>
