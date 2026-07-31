<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import type { PublicTemplatePackage, TemplateDirectoryResult } from "schema";
  import { publicTemplateDirectoryService } from "$lib/services/publishing/PublicTemplateDirectoryService";
  import TemplateImportModal from "$lib/components/stats/community-template/TemplateImportModal.svelte";
  import TemplateOwnerRecovery from "$lib/components/stats/community-template/TemplateOwnerRecovery.svelte";
  import { saveTemplateOwnerToken } from "$lib/stores/publishing/template-publish-registry";

  let listing = $state<TemplateDirectoryResult | null>(null);
  let packageData = $state<PublicTemplatePackage | null>(null);
  let isLoading = $state(true);
  let error = $state("");
  let showImport = $state(false);
  let reportReason = $state("");
  let reportSent = $state(false);
  let isReporting = $state(false);
  let ownerToken = $state("");
  let managedTitle = $state("");
  let managedDescription = $state("");
  let isManaging = $state(false);
  let managementMessage = $state("");
  let managementError = $state("");
  let isImporting = $state(false);
  const listingId = $derived(page.params.listingId ?? "");

  onMount(async () => {
    try {
      listing =
        await publicTemplateDirectoryService.getTemplateListing(listingId);
      if (!listing) error = "This template is no longer available.";
      if (listing) {
        managedTitle = listing.title;
        managedDescription = listing.description;
      }
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : "Could not load this template.";
    } finally {
      isLoading = false;
    }
  });

  async function beginImport() {
    if (isImporting) return;
    isImporting = true;
    try {
      packageData =
        await publicTemplateDirectoryService.downloadTemplatePackage(listingId);
      showImport = true;
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : "This template is no longer available.";
    } finally {
      isImporting = false;
    }
  }

  async function updateListing() {
    if (!ownerToken || !managedTitle.trim() || !managedDescription.trim())
      return;
    isManaging = true;
    managementError = "";
    managementMessage = "";
    try {
      const pkg =
        await publicTemplateDirectoryService.downloadTemplatePackage(listingId);
      const updated = await publicTemplateDirectoryService.updateTemplate(
        listingId,
        {
          package: {
            ...pkg,
            template: {
              ...pkg.template,
              name: managedTitle.trim(),
              description: managedDescription.trim(),
            },
          },
        },
        ownerToken,
      );
      if (listing) {
        listing = { ...listing, ...updated };
      }
      managementMessage = "Published template updated.";
    } catch (cause) {
      managementError =
        cause instanceof Error
          ? cause.message
          : "Could not update the template.";
    } finally {
      isManaging = false;
    }
  }

  async function unpublishListing() {
    if (!ownerToken || !confirm("Unpublish this community template?")) return;
    isManaging = true;
    managementError = "";
    try {
      await publicTemplateDirectoryService.unpublishTemplate(
        listingId,
        ownerToken,
      );
      listing = null;
      error = "This template has been unpublished.";
    } catch (cause) {
      managementError =
        cause instanceof Error
          ? cause.message
          : "Could not unpublish the template.";
    } finally {
      isManaging = false;
    }
  }

  async function reportTemplate() {
    if (!reportReason.trim()) return;
    isReporting = true;
    try {
      await publicTemplateDirectoryService.reportTemplate(listingId, {
        reason: reportReason.trim(),
      });
      reportSent = true;
      reportReason = "";
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : "Could not send the report.";
    } finally {
      isReporting = false;
    }
  }
</script>

<svelte:head
  ><title>{listing?.title ?? "Community template"}</title></svelte:head
>

<section class="mx-auto w-full max-w-3xl space-y-6 p-6">
  {#if isLoading}<p
      class="py-12 text-center text-sm text-theme-muted"
      role="status"
    >
      Loading template…
    </p>
  {:else if error}<p
      class="rounded-lg border border-theme-border bg-theme-surface p-6 text-sm text-theme-text"
      role="alert"
    >
      {error}
    </p>
  {:else if listing}
    <a class="text-sm text-theme-primary underline" href={resolve("/templates")}
      >Back to community templates</a
    >
    <header class="space-y-2">
      <h1 class="font-header text-3xl font-bold text-theme-text">
        {listing.title}
      </h1>
      <p class="text-sm text-theme-muted">{listing.description}</p>
      <div class="flex flex-wrap gap-2 text-xs text-theme-primary">
        {#if listing.system}<span
            class="rounded-full border border-theme-primary/30 px-2 py-1"
            >{listing.system}</span
          >{/if}
        {#if listing.category}<span
            class="rounded-full border border-theme-primary/30 px-2 py-1"
            >{listing.category}</span
          >{/if}
        {#each listing.labels as label, labelIndex (`${listing.listingId}-${label}-${labelIndex}`)}<span
            class="rounded-full border border-theme-border px-2 py-1"
            >{label}</span
          >{/each}
      </div>
    </header>
    <div class="rounded-xl border border-theme-border bg-theme-surface p-5">
      <h2 class="font-header text-lg font-bold text-theme-text">
        Fields in this layout
      </h2>
      <ol class="mt-3 space-y-2">
        {#each listing.fieldPreview as field (field.id)}<li
            class="flex items-center justify-between rounded border border-theme-border/70 px-3 py-2 text-sm"
          >
            <span class="text-theme-text">{field.label}</span><span
              class="text-xs uppercase text-theme-muted">{field.type}</span
            >
          </li>{/each}
      </ol>
    </div>
    <button
      type="button"
      class="rounded-lg bg-theme-primary px-4 py-2 text-sm font-bold text-theme-bg disabled:opacity-50"
      disabled={isImporting}
      onclick={beginImport}
      >{isImporting ? "Downloading…" : "Import to this vault"}</button
    >
    <section
      class="space-y-4 rounded-lg border border-theme-border bg-theme-surface p-4"
      aria-labelledby="manage-heading"
    >
      <h2
        id="manage-heading"
        class="font-header text-base font-bold text-theme-text"
      >
        Manage your published template
      </h2>
      <TemplateOwnerRecovery
        {listingId}
        token={ownerToken}
        onSave={(token) => {
          ownerToken = token.trim();
          void saveTemplateOwnerToken(listingId, ownerToken);
        }}
      />
      {#if ownerToken}
        <div class="grid gap-3">
          <label class="text-sm text-theme-text" for="managed-template-title"
            >Public title<input
              id="managed-template-title"
              bind:value={managedTitle}
              class="mt-1 w-full rounded border border-theme-border bg-theme-bg p-2 text-sm text-theme-text"
              maxlength="120"
            /></label
          >
          <label
            class="text-sm text-theme-text"
            for="managed-template-description"
            >Public description<textarea
              id="managed-template-description"
              bind:value={managedDescription}
              class="mt-1 min-h-20 w-full rounded border border-theme-border bg-theme-bg p-2 text-sm text-theme-text"
              maxlength="500"
            ></textarea></label
          >
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded border border-theme-border px-3 py-2 text-sm text-theme-text disabled:opacity-50"
              disabled={isManaging ||
                !managedTitle.trim() ||
                !managedDescription.trim()}
              onclick={updateListing}
              >{isManaging ? "Saving…" : "Update listing"}</button
            >
            <button
              type="button"
              class="rounded border border-red-400/50 px-3 py-2 text-sm text-red-300 disabled:opacity-50"
              disabled={isManaging}
              onclick={unpublishListing}>Unpublish</button
            >
          </div>
          {#if managementMessage}<p
              class="text-sm text-theme-muted"
              role="status"
            >
              {managementMessage}
            </p>{/if}
          {#if managementError}<p class="text-sm text-red-400" role="alert">
              {managementError}
            </p>{/if}
        </div>
      {/if}
    </section>
    <aside
      class="space-y-3 rounded-lg border border-theme-border p-4"
      aria-labelledby="report-heading"
    >
      <h2
        id="report-heading"
        class="font-header text-base font-bold text-theme-text"
      >
        Report this template
      </h2>
      {#if reportSent}
        <p class="text-sm text-theme-muted" role="status">
          Thanks. Your report was submitted.
        </p>
      {:else}
        <label class="block text-sm text-theme-text" for="report-reason"
          >Reason</label
        >
        <textarea
          id="report-reason"
          class="min-h-20 w-full rounded border border-theme-border bg-theme-bg p-2 text-sm text-theme-text"
          bind:value={reportReason}
          maxlength="1000"
          placeholder="Tell us what needs attention"
        ></textarea>
        <button
          type="button"
          class="rounded-lg border border-theme-border px-3 py-2 text-sm text-theme-text disabled:opacity-50"
          disabled={isReporting || !reportReason.trim()}
          onclick={reportTemplate}
          >{isReporting ? "Sending…" : "Send report"}</button
        >
      {/if}
    </aside>
  {/if}
</section>

{#if showImport && packageData}
  <TemplateImportModal {packageData} onClose={() => (showImport = false)} />
{/if}
