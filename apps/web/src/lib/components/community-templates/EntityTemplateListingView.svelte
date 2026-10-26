<script lang="ts">
  import type { EntityTemplateDetail } from "schema";
  import EntityTemplatePreview from "$lib/components/settings/entity-templates/EntityTemplatePreview.svelte";

  let {
    detail,
    canInstall,
    onInstall,
    onReport,
  }: {
    detail: EntityTemplateDetail;
    canInstall: boolean;
    onInstall: () => void;
    onReport: () => void;
  } = $props();

  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const updated = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
</script>

<header class="space-y-2">
  <h1 class="font-header text-3xl font-bold text-theme-text">
    {detail.title}
  </h1>
  <p class="text-sm text-theme-muted">
    {#if detail.ownerDisplayName}By {detail.ownerDisplayName} ·
    {/if}Updated
    {updated(detail.listingUpdatedAt)}
  </p>
  <div class="flex flex-wrap gap-1.5 text-xs text-theme-primary">
    <span class="rounded-full border border-theme-primary/30 px-2 py-1"
      >{titleCase(detail.entityType)}</span
    >
    {#each detail.labels as label, index (`${label}-${index}`)}
      <span class="rounded-full border border-theme-border px-2 py-1"
        >{label}</span
      >
    {/each}
  </div>
</header>

<p class="text-sm text-theme-text">{detail.description}</p>

<div class="space-y-2">
  <h2 class="text-sm font-bold text-theme-text">A new note starts like this</h2>
  <EntityTemplatePreview markdown={detail.previewMarkdown} />
</div>

<div class="flex flex-wrap items-center gap-3">
  <button
    type="button"
    class="rounded-lg bg-theme-primary px-4 py-2 text-sm font-bold text-theme-bg disabled:opacity-50"
    disabled={!canInstall}
    onclick={onInstall}>Install</button
  >
  <button
    type="button"
    class="text-xs text-theme-muted underline hover:text-theme-text"
    onclick={onReport}>Report this template</button
  >
  {#if !canInstall}
    <p class="text-xs text-theme-muted" data-testid="install-unavailable">
      Templates can't be added to this vault. Open one of your own vaults to
      install this template.
    </p>
  {/if}
</div>
