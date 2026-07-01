<script lang="ts">
  import type { ListingDraft, PublicListing } from "schema";
  import {
    PublicDirectoryService,
    publicDirectoryService,
  } from "$lib/services/publishing/PublicDirectoryService";
  import { worldStore } from "$lib/stores/world.svelte";

  interface NotificationLike {
    notify: (message: string, kind?: "success" | "error" | "info") => void;
  }

  interface Props {
    publishId?: string;
    writeToken?: string;
    vaultTitle?: string;
    service?: PublicDirectoryService;
    notificationStore?: NotificationLike;
  }

  let {
    publishId = "",
    writeToken = "",
    vaultTitle = "Untitled World",
    service = publicDirectoryService,
    notificationStore,
  }: Props = $props();

  let title = $state("");
  let description = $state("");
  let labelsText = $state("");
  let coverImageAssetId = $state("");
  let coverImageAlt = $state("");
  let ownerDisplayName = $state("");
  let saveAttempted = $state(false);
  let isSaving = $state(false);
  let isLoading = $state(false);
  let loadError = $state("");
  let existingListing = $state<PublicListing | null>(null);
  let hydratedPublishId = $state("");

  const labels = $derived.by(() =>
    labelsText
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean),
  );
  const canSave = $derived(
    !!publishId &&
      !!writeToken &&
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      labels.length > 0,
  );
  const guestDestination = $derived(
    publishId ? `/guest/${publishId}` : "/guest/[publishId]",
  );

  function hydrateDraft(draft: ListingDraft) {
    title = draft.title;
    description = draft.description;
    labelsText = draft.labels.join(", ");
    coverImageAssetId = draft.coverImageAssetId ?? "";
    coverImageAlt = draft.coverImageAlt ?? "";
    ownerDisplayName = draft.ownerDisplayName ?? "";
  }

  async function loadListing() {
    if (!publishId || publishId === hydratedPublishId) return;

    isLoading = true;
    loadError = "";

    try {
      const listing = await service.getPublicListing(publishId);
      existingListing = listing;
      hydrateDraft(
        service.createListingDraft({
          publishId,
          vaultTitle,
          existingListing: listing,
          defaultDescription: worldStore.metadata?.description || undefined,
          defaultCoverImageAssetId:
            worldStore.metadata?.coverImage || undefined,
        }),
      );
      hydratedPublishId = publishId;
    } catch (error: any) {
      loadError = error?.message || "Failed to load saved listing.";
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (!publishId) {
      title = "";
      description = "";
      labelsText = "";
      coverImageAssetId = "";
      coverImageAlt = "";
      ownerDisplayName = "";
      existingListing = null;
      hydratedPublishId = "";
      return;
    }
    void loadListing();
  });

  async function handleSave() {
    if (isSaving) return;
    saveAttempted = true;
    if (!canSave || !publishId || !writeToken) return;

    isSaving = true;
    try {
      const listing = await service.enablePublicListing(
        publishId,
        {
          title: title.trim(),
          description: description.trim(),
          labels,
          coverImageAssetId: coverImageAssetId.trim() || undefined,
          coverImageAlt: coverImageAlt.trim() || undefined,
          ownerDisplayName: ownerDisplayName.trim() || undefined,
        },
        writeToken,
      );
      existingListing = listing;
      hydratedPublishId = publishId;
      notificationStore?.notify("Public listing saved.", "success");
    } catch (error: any) {
      notificationStore?.notify(
        error?.message || "Failed to save public listing.",
        "error",
      );
    } finally {
      isSaving = false;
    }
  }

  async function handleDelist() {
    if (isSaving || !publishId || !writeToken) return;

    isSaving = true;
    try {
      await service.disablePublicListing(publishId, writeToken);
      existingListing = null;
      notificationStore?.notify("Public listing removed.", "success");
    } catch (error: any) {
      notificationStore?.notify(
        error?.message || "Failed to remove public listing.",
        "error",
      );
    } finally {
      isSaving = false;
    }
  }
</script>

<section
  class="border border-theme-border rounded-lg bg-theme-surface/30 p-6 space-y-5"
  data-testid="public-listing-settings"
>
  <div class="space-y-2">
    <div class="flex items-start gap-3">
      <span
        class="icon-[lucide--globe] h-5 w-5 text-theme-primary mt-0.5"
        aria-hidden="true"
      ></span>
      <div class="space-y-1">
        <h4
          class="text-sm font-bold uppercase tracking-wider font-header text-theme-text"
        >
          Public Directory Listing
        </h4>
        <p class="text-sm text-theme-text/70">
          Sharing by link stays unlisted. Listing publicly makes this world
          discoverable to anyone browsing the directory.
        </p>
      </div>
    </div>
  </div>

  {#if !publishId || !writeToken}
    <p class="text-sm text-theme-text/70" data-testid="public-listing-blocked">
      Publish a guest snapshot before you list this world publicly.
    </p>
  {:else}
    {#if loadError}
      <p class="text-sm text-red-400" data-testid="public-listing-load-error">
        {loadError}
      </p>
    {/if}

    <div class="grid gap-4 md:grid-cols-2">
      <label class="space-y-1">
        <span
          class="text-xs uppercase tracking-wider font-header text-theme-text/60"
          >Public title</span
        >
        <input
          bind:value={title}
          type="text"
          class="w-full rounded border border-theme-border bg-theme-bg/50 px-3 py-2 text-sm text-theme-text"
          data-testid="public-listing-title"
        />
      </label>

      <label class="space-y-1">
        <span
          class="text-xs uppercase tracking-wider font-header text-theme-text/60"
          >Owner display name</span
        >
        <input
          bind:value={ownerDisplayName}
          type="text"
          class="w-full rounded border border-theme-border bg-theme-bg/50 px-3 py-2 text-sm text-theme-text"
          data-testid="public-listing-owner"
        />
      </label>

      <label class="space-y-1 md:col-span-2">
        <span
          class="text-xs uppercase tracking-wider font-header text-theme-text/60"
          >Public description</span
        >
        <textarea
          bind:value={description}
          rows="4"
          class="w-full rounded border border-theme-border bg-theme-bg/50 px-3 py-2 text-sm text-theme-text"
          data-testid="public-listing-description"
        ></textarea>
      </label>

      <label class="space-y-1 md:col-span-2">
        <span
          class="text-xs uppercase tracking-wider font-header text-theme-text/60"
          >Labels</span
        >
        <input
          bind:value={labelsText}
          type="text"
          placeholder="cyberpunk, intrigue, nomads"
          class="w-full rounded border border-theme-border bg-theme-bg/50 px-3 py-2 text-sm text-theme-text"
          data-testid="public-listing-labels"
        />
      </label>

      <label class="space-y-1">
        <span
          class="text-xs uppercase tracking-wider font-header text-theme-text/60"
          >Cover image asset ID</span
        >
        <input
          bind:value={coverImageAssetId}
          type="text"
          class="w-full rounded border border-theme-border bg-theme-bg/50 px-3 py-2 text-sm text-theme-text"
          data-testid="public-listing-cover"
        />
      </label>

      <label class="space-y-1">
        <span
          class="text-xs uppercase tracking-wider font-header text-theme-text/60"
          >Cover image alt text</span
        >
        <input
          bind:value={coverImageAlt}
          type="text"
          class="w-full rounded border border-theme-border bg-theme-bg/50 px-3 py-2 text-sm text-theme-text"
          data-testid="public-listing-cover-alt"
        />
      </label>
    </div>

    {#if saveAttempted && !canSave}
      <p class="text-sm text-red-400" data-testid="public-listing-validation">
        Add a public title, description, and at least one label before listing
        this world publicly.
      </p>
    {/if}

    <div
      class="rounded border border-theme-border/60 bg-theme-bg/30 p-4 space-y-3"
      data-testid="public-listing-preview"
    >
      <div class="space-y-1">
        <p
          class="text-xs uppercase tracking-wider font-header text-theme-text/50"
        >
          Preview
        </p>
        <h5 class="text-base font-bold font-header text-theme-text">
          {title.trim() || vaultTitle}
        </h5>
        <p class="text-sm text-theme-text/70">
          {description.trim() || "Add a short public description."}
        </p>
      </div>

      {#if labels.length}
        <div class="flex flex-wrap gap-2">
          {#each labels as label (label)}
            <span
              class="rounded border border-theme-primary/30 bg-theme-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-theme-primary"
              >{label}</span
            >
          {/each}
        </div>
      {/if}

      <p
        class="text-xs text-theme-text/60"
        data-testid="public-listing-destination"
      >
        Directory visitors open the read-only guest view at <code
          >{guestDestination}</code
        >.
      </p>
    </div>

    <p
      class="text-sm text-theme-text/70"
      data-testid="public-listing-confirmation"
    >
      Anyone can find this world in the public directory once you save this
      listing.
    </p>

    <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
      {#if existingListing}
        <button
          type="button"
          onclick={handleDelist}
          class="rounded border border-red-500/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400"
          data-testid="public-listing-delist"
          disabled={isSaving}
        >
          Delist World
        </button>
      {/if}
      <button
        type="button"
        onclick={handleSave}
        class="rounded bg-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
        data-testid="public-listing-save"
        disabled={isSaving || isLoading}
      >
        {existingListing ? "Update Listing" : "List Publicly"}
      </button>
    </div>
  {/if}
</section>
