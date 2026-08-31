<script lang="ts">
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
</script>

<div data-testid="no-entities-found">
  <EmptyState
    icon="icon-[lucide--search-x]"
    headline="No entities found"
    body="Try adjusting your search or filters."
  />
</div>
