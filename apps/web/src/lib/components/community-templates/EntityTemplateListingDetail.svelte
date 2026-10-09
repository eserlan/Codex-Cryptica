<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import type { EntityTemplate } from "entity-template-engine";
  import type { EntityTemplateDetail } from "schema";
  import { entityTemplateStore } from "$lib/stores/entity-templates/entity-template-store.svelte";
  import {
    entityTemplatePublishStore,
    type PublishMetadata,
  } from "$lib/stores/entity-templates/entity-template-publish-store.svelte";
  import EntityTemplateListingView from "./EntityTemplateListingView.svelte";
  import OwnerControls from "./OwnerControls.svelte";
  import EntityTemplatePublishModal from "./EntityTemplatePublishModal.svelte";
  import ReportListingModal from "./ReportListingModal.svelte";
  import EntityTemplateInstallModal from "./EntityTemplateInstallModal.svelte";

  let {
    detail: listing,
    listingId,
    canInstall = () => entityTemplateStore.canEdit,
  }: {
    /** `null` when the listing is missing, unpublished or removed. */
    detail: EntityTemplateDetail | null;
    listingId: string;
    canInstall?: () => boolean;
  } = $props();

  // Once the owner unpublishes or deletes the listing, stop showing it.
  let hidden = $state(false);
  const detail = $derived(hidden ? null : listing);

  let showInstall = $state(false);
  let showOwner = $state(false);
  let showReport = $state(false);
  let updating = $state<{
    template: EntityTemplate;
    initial: PublishMetadata;
  } | null>(null);

  // A device that already holds this listing's owner token opens the controls.
  onMount(async () => {
    try {
      await entityTemplatePublishStore.loadLinks?.();
      if (await entityTemplatePublishStore.hasOwnerToken?.(listingId)) {
        showOwner = true;
      }
    } catch {
      // Owner controls are optional; the public view still works.
    }
  });

  const linkedTemplate = $derived.by(() => {
    const id = Object.entries(entityTemplatePublishStore.links ?? {}).find(
      ([, link]) => link.listingId === listingId,
    )?.[0];
    return id ? entityTemplateStore.list.find((t) => t.id === id) : undefined;
  });

  async function startUpdate() {
    const template = linkedTemplate;
    if (!template) return;
    const initial = await entityTemplatePublishStore.loadOwnerMeta(template.id);
    updating = { template, initial };
  }
</script>

<svelte:head>
  <title>{detail ? detail.title : "Community template"}</title>
  <!-- Community listings are never offered to search engines. -->
  <meta name="robots" content="noindex" />
</svelte:head>

<section
  class="mx-auto w-full max-w-3xl space-y-6 p-6"
  data-testid="entity-template-detail"
>
  <a
    href={resolve("/templates?kind=entity" as any)}
    class="text-sm text-theme-primary underline"
    >← Back to community templates</a
  >

  {#if !detail}
    <div
      class="rounded-lg border border-theme-border bg-theme-surface p-6 text-sm text-theme-text"
      role="alert"
    >
      This template is no longer available. It may have been taken down by its
      author.
    </div>
  {:else}
    <EntityTemplateListingView
      {detail}
      canInstall={canInstall()}
      onInstall={() => (showInstall = true)}
      onReport={() => (showReport = true)}
    />
  {/if}

  <div class="space-y-3 border-t border-theme-border pt-4">
    {#if showOwner}
      <OwnerControls
        {listingId}
        onUpdate={linkedTemplate ? startUpdate : undefined}
        onChanged={(change) => {
          if (change === "unpublished" || change === "deleted") hidden = true;
        }}
      />
    {:else}
      <button
        type="button"
        class="text-xs text-theme-primary underline"
        onclick={() => (showOwner = true)}>I published this template</button
      >
    {/if}
  </div>
</section>

{#if updating}
  <EntityTemplatePublishModal
    template={updating.template}
    mode="update"
    initial={updating.initial}
    onClose={() => (updating = null)}
  />
{/if}

{#if showReport && detail}
  <ReportListingModal
    listingId={detail.listingId}
    title={detail.title}
    onClose={() => (showReport = false)}
  />
{/if}

{#if showInstall && detail}
  <EntityTemplateInstallModal
    listingId={detail.listingId}
    title={detail.title}
    onClose={() => (showInstall = false)}
  />
{/if}
