<script lang="ts">
  import ModalShell from "$lib/components/ui/ModalShell.svelte";

  let {
    open,
    entityLabel,
  }: {
    open: boolean;
    /** The entity/draft name, shown so the notice reads as specific rather than generic. */
    entityLabel?: string;
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
</ModalShell>
