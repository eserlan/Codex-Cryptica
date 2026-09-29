<script lang="ts">
  type PublishState =
    | { kind: "duplicate-first" }
    | { kind: "unavailable" }
    | { kind: "publish" }
    | { kind: "published"; link: { status: "active" | "unpublished" } };

  let {
    canEdit,
    publishState,
    onPublish,
    onUpdateListing,
    onUnpublish,
    onRepublish,
    onDeleteListing,
  }: {
    canEdit: boolean;
    publishState: PublishState;
    onPublish: () => void;
    onUpdateListing: () => void;
    onUnpublish: () => void;
    onRepublish: () => void;
    onDeleteListing: () => void;
  } = $props();

  const smallButton =
    "inline-flex items-center gap-1 rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted transition-colors hover:border-theme-primary/40 hover:text-theme-text";

  const offersPublish = $derived(
    canEdit &&
      (publishState.kind === "publish" ||
        publishState.kind === "duplicate-first"),
  );
  const listing = $derived(
    canEdit && publishState.kind === "published" ? publishState.link : null,
  );
</script>

{#if offersPublish}
  <button
    type="button"
    class={smallButton}
    title={publishState.kind === "duplicate-first"
      ? "Duplicate this template first, then publish your copy."
      : undefined}
    onclick={onPublish}
    data-testid="entity-template-publish">Publish</button
  >
{/if}
{#if listing}
  <button
    type="button"
    class={smallButton}
    onclick={onUpdateListing}
    data-testid="entity-template-update-listing">Update listing</button
  >
  <button
    type="button"
    class={smallButton}
    onclick={listing.status === "active" ? onUnpublish : onRepublish}
    data-testid={listing.status === "active"
      ? "entity-template-unpublish"
      : "entity-template-republish"}
    >{listing.status === "active" ? "Unpublish" : "Republish"}</button
  >
  <button
    type="button"
    class={smallButton}
    onclick={onDeleteListing}
    data-testid="entity-template-delete-listing">Delete listing</button
  >
{/if}
