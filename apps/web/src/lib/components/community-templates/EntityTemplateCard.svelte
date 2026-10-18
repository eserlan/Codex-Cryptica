<script lang="ts">
  import type { EntityTemplateListing } from "schema";
  import TemplateCardShell from "./TemplateCardShell.svelte";

  let {
    listing,
    onOpen,
  }: { listing: EntityTemplateListing; onOpen: () => void } = $props();

  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const updated = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
</script>

<TemplateCardShell
  title={listing.title}
  ownerDisplayName={listing.ownerDisplayName}
  description={listing.description}
  {onOpen}
>
  <div class="mt-4 flex flex-wrap gap-1.5 text-xs text-theme-primary">
    <span class="rounded-full border border-theme-primary/30 px-2 py-1"
      >{titleCase(listing.entityType)}</span
    >
    {#each listing.labels as label, index (`${listing.listingId}-${label}-${index}`)}
      <span class="rounded-full border border-theme-border px-2 py-1"
        >{label}</span
      >
    {/each}
  </div>
  <p class="mt-3 text-xs text-theme-muted">
    Updated {updated(listing.listingUpdatedAt)}
  </p>
</TemplateCardShell>
