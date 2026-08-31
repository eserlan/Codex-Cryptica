<script lang="ts">
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let { isGuest }: { isGuest: boolean } = $props();
</script>

<div data-testid="no-entities-found">
  <EmptyState
    icon="icon-[lucide--ghost]"
    headline="No entities yet"
    body={isGuest
      ? "Nothing has been shared with you yet."
      : "Create your first entity to start building your vault."}
    cta={isGuest ? undefined : "＋ Create"}
    onCta={isGuest ? undefined : () => modalUIStore.openIntentCreateMenu()}
  />
</div>
