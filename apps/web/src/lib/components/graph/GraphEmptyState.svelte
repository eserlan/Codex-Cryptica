<script lang="ts">
  import EmptyState from "$lib/components/ui/EmptyState.svelte";

  let {
    isGuest,
    onCreate,
    onImport,
  }: {
    isGuest: boolean;
    onCreate: () => void;
    onImport: () => void;
  } = $props();
</script>

<div
  class="absolute inset-0 flex items-center justify-center pointer-events-none"
  data-testid="graph-empty-state"
>
  <div class="pointer-events-auto">
    <EmptyState
      icon="icon-[lucide--network]"
      headline="Your graph is empty"
      body={isGuest
        ? "Nothing has been shared with you yet."
        : "Add a character or place to begin. Mention another name in its notes, accept the suggested connection, and it'll appear here."}
      cta={isGuest ? undefined : "＋ Create"}
      ctaTestId={isGuest ? undefined : "graph-empty-state-cta"}
      onCta={isGuest ? undefined : onCreate}
      secondaryCta={isGuest ? undefined : "Populate with a pack"}
      onSecondaryCta={isGuest ? undefined : onImport}
    />
  </div>
</div>
