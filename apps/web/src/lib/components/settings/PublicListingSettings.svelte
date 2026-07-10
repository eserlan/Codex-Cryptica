<script lang="ts">
  import {
    type ListingDraft,
    type PublicListing,
    PUBLISH_LIMITS,
  } from "schema";

  function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > max * 0.8) {
      return cut.slice(0, lastSpace) + "...";
    }
    return cut.slice(0, max - 3) + "...";
  }
  import { base } from "$app/paths";
  import {
    PublicDirectoryService,
    publicDirectoryService,
  } from "$lib/services/publishing/PublicDirectoryService";
  import { worldStore } from "$lib/stores/world.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";

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
  let rightsAcknowledged = $state(false);
  let fanContent = $state(false);
  let fanContentDisclaimer = $state("");
  let isSuspended = $state(false);
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
      labels.length > 0 &&
      rightsAcknowledged,
  );
  const guestDestination = $derived(
    publishId ? `/guest/${publishId}` : "/guest/[publishId]",
  );

  function hydrateDraft(draft: ListingDraft) {
    title = draft.title;
    description = draft.description;
    labelsText = draft.labels.join(", ");
    coverImageAssetId = draft.coverImageAssetId ?? "";
    ownerDisplayName = draft.ownerDisplayName ?? "";
    rightsAcknowledged = draft.rightsAcknowledged ?? false;
    fanContent = draft.fanContent ?? false;
  }

  async function loadListing() {
    if (!publishId || publishId === hydratedPublishId) return;

    isLoading = true;
    loadError = "";

    try {
      if (
        vault.activeVaultId &&
        (!worldStore.metadata ||
          worldStore.activeVaultId !== vault.activeVaultId)
      ) {
        await worldStore.load(vault.activeVaultId);
      }

      const listing = await service.getPublicListing(publishId);
      existingListing = listing;
      hydrateDraft(
        service.createListingDraft({
          publishId,
          vaultTitle,
          existingListing: listing,
          defaultDescription: worldStore.metadata?.description
            ? truncate(
                worldStore.metadata.description,
                PUBLISH_LIMITS.maxListingDescriptionLength,
              )
            : undefined,
          defaultCoverImageAssetId:
            worldStore.metadata?.coverImage || undefined,
          defaultLabels: themeStore.activeTheme?.name
            ? [themeStore.activeTheme.name.toLowerCase()]
            : undefined,
        }),
      );
      try {
        const notice = await service.getNotice(publishId);
        if (notice) {
          fanContent = notice.fanContent ?? false;
          fanContentDisclaimer = notice.fanContentDisclaimer ?? "";
          if (notice.rightsAcknowledgedAt) {
            rightsAcknowledged = true;
          }
          if (notice.suspended === true) {
            isSuspended = true;
          } else {
            isSuspended = false;
          }
        }
      } catch {
        // notice sidecar might not exist yet for old snapshots
      }
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
      ownerDisplayName = "";
      rightsAcknowledged = false;
      fanContent = false;
      fanContentDisclaimer = "";
      isSuspended = false;
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
      let resolvedCoverId = coverImageAssetId.trim();
      if (resolvedCoverId) {
        try {
          const cleanPath = resolvedCoverId;
          const trueAssetId = cleanPath.replace(/[^a-zA-Z0-9.-]/g, "_");

          const objectUrl = await vault.resolveImageUrl(cleanPath);
          if (objectUrl) {
            const blobRes = await fetch(objectUrl);
            if (blobRes.ok) {
              const blob = await blobRes.blob();
              await service.uploadAsset(
                publishId,
                trueAssetId,
                blob.type || "image/webp",
                cleanPath.split("/").pop() || trueAssetId,
                blob,
                writeToken,
              );
              resolvedCoverId = trueAssetId;
            }
          }
        } catch (err) {
          console.warn(
            "[PublicListingSettings] Failed to auto-publish cover image asset:",
            err,
          );
        }
      }

      const listing = await service.enablePublicListing(
        publishId,
        {
          title: title.trim(),
          description: description.trim(),
          labels,
          coverImageAssetId: resolvedCoverId || undefined,
          coverImageAlt: coverImageAlt.trim() || undefined,
          ownerDisplayName: ownerDisplayName.trim() || undefined,
          rightsAcknowledged: rightsAcknowledged as true,
          fanContent,
        },
        writeToken,
      );
      try {
        await service.saveNotice(
          publishId,
          {
            fanContent,
            fanContentDisclaimer: fanContent
              ? fanContentDisclaimer.trim() || undefined
              : undefined,
            rightsAcknowledged,
          },
          writeToken,
        );
      } catch (noticeErr) {
        console.warn(
          "[PublicListingSettings] Failed to update notice sidecar:",
          noticeErr,
        );
      }
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

  {#if isSuspended}
    <div
      class="border border-red-500/50 bg-red-950/40 text-red-200 rounded-md p-4 space-y-1 flex items-start gap-3 text-sm"
      data-testid="public-listing-suspended-banner"
    >
      <span
        class="icon-[lucide--alert-triangle] h-5 w-5 text-red-400 shrink-0 mt-0.5"
        aria-hidden="true"
      ></span>
      <div>
        <p class="font-bold">
          This world is currently suspended or under review.
        </p>
        <p class="text-xs text-red-200/80">
          It is delisted from the public directory and/or restricted pending
          moderation review.
        </p>
      </div>
    </div>
  {/if}

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

      <div
        class="md:col-span-2 rounded border border-theme-border/60 bg-theme-bg/30 p-4 space-y-4"
      >
        <label class="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={rightsAcknowledged}
            class="mt-0.5 rounded border-theme-border text-theme-primary focus:ring-theme-primary"
            data-testid="public-listing-rights-acknowledgement"
          />
          <div class="space-y-1 text-sm">
            <span class="font-bold text-theme-text"
              >I acknowledge my publishing rights and responsibilities</span
            >
            <p class="text-xs text-theme-text/70">
              I confirm that I own original rights to this content or have
              explicit permission to publish it, and that it contains no
              copyrighted material I am not authorized to distribute.
            </p>
          </div>
        </label>

        <label
          class="flex items-start gap-3 cursor-pointer border-t border-theme-border/40 pt-3"
        >
          <input
            type="checkbox"
            bind:checked={fanContent}
            class="mt-0.5 rounded border-theme-border text-theme-primary focus:ring-theme-primary"
            data-testid="public-listing-fan-content"
          />
          <div class="space-y-1 text-sm">
            <span class="font-bold text-theme-text"
              >This world contains fan content or third-party IP</span
            >
            <p class="text-xs text-theme-text/70">
              Check this if your world uses third-party game rules, lore, or
              characters under a community content agreement or fan policy.
            </p>
          </div>
        </label>

        {#if fanContent}
          <label class="block space-y-1 pl-7 pt-1">
            <span
              class="text-xs uppercase tracking-wider font-header text-theme-text/60"
            >
              Fan content disclaimer / attribution (optional)
            </span>
            <textarea
              bind:value={fanContentDisclaimer}
              maxlength="500"
              rows="3"
              placeholder="e.g. Unofficial Fan Content permitted under Wizards of the Coast Fan Content Policy..."
              class="w-full rounded border border-theme-border bg-theme-bg/50 px-3 py-2 text-sm text-theme-text"
              data-testid="public-listing-fan-disclaimer"
            ></textarea>
          </label>
        {/if}
      </div>
    </div>

    {#if saveAttempted && !canSave}
      <p class="text-sm text-red-400" data-testid="public-listing-validation">
        {#if !rightsAcknowledged}
          You must acknowledge your publishing rights before listing this world
          publicly.
        {:else}
          Add a public title, description, and at least one label before listing
          this world publicly.
        {/if}
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

    {#if existingListing}
      <a
        href="{base}/worlds"
        class="inline-flex items-center gap-1.5 self-start text-xs font-bold uppercase tracking-wider text-theme-primary underline hover:text-theme-primary/80 transition-colors"
        data-testid="public-listing-view-directory"
      >
        <span class="icon-[lucide--compass] h-3.5 w-3.5"></span>
        View in Explore Worlds
      </a>
    {/if}

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
