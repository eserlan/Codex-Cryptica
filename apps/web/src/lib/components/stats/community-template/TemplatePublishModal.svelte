<script lang="ts">
  import type { StatSheetTemplate } from "schema";
  import { projectTemplatePackage } from "@codex/stat-sheet-engine";
  import { publicTemplateDirectoryService } from "$lib/services/publishing/PublicTemplateDirectoryService";

  let {
    template,
    onClose = () => {},
    onPublished = () => {},
  } = $props<{
    template: StatSheetTemplate;
    onClose?: () => void;
    onPublished?: (listingId: string, ownerToken: string) => void;
  }>();
  let description = $state("");
  let system = $state("");
  let category = $state("");
  let ownerDisplayName = $state("");
  let acknowledged = $state(false);
  let error = $state("");
  let isPublishing = $state(false);
  let ownerToken = $state("");
  let initializedTemplateId = $state("");
  $effect(() => {
    if (initializedTemplateId === template.id) return;
    initializedTemplateId = template.id;
    description = template.description ?? "";
    system = template.category ? "" : "Homebrew";
    category = template.category ?? "";
  });
  const packagePreview = $derived(
    projectTemplatePackage(template, {
      description: description || undefined,
      system: system || undefined,
      category: category || undefined,
    }),
  );

  async function publish() {
    if (!acknowledged) return;
    isPublishing = true;
    error = "";
    try {
      const result = await publicTemplateDirectoryService.publishTemplate({
        package: packagePreview,
        ownerDisplayName: ownerDisplayName || undefined,
      });
      ownerToken = result.ownerToken;
      onPublished(result.listing.listingId, result.ownerToken);
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : "Could not publish this template.";
    } finally {
      isPublishing = false;
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-theme-bg/80 p-4"
  role="presentation"
>
  <div
    class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-theme-border bg-theme-surface p-5"
    role="dialog"
    aria-modal="true"
    aria-labelledby="publish-template-title"
  >
    <div class="flex items-center justify-between gap-4">
      <h2
        id="publish-template-title"
        class="font-header text-lg font-bold text-theme-text"
      >
        Share template
      </h2>
      <button type="button" aria-label="Close publish dialog" onclick={onClose}
        ><span class="icon-[lucide--x] h-4 w-4"></span></button
      >
    </div>
    <p class="mt-2 text-sm text-theme-muted">
      Only this layout and the public details below will be shared. Entity
      values and campaign notes stay local.
    </p>
    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <label class="text-xs font-bold uppercase tracking-wide text-theme-muted"
        >Description<input
          bind:value={description}
          class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
        /></label
      >
      <label class="text-xs font-bold uppercase tracking-wide text-theme-muted"
        >Game system<input
          bind:value={system}
          placeholder="Homebrew"
          class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
        /></label
      >
      <label class="text-xs font-bold uppercase tracking-wide text-theme-muted"
        >Entity category<select
          bind:value={category}
          class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
          ><option value="">None</option><option value="character"
            >Character</option
          ><option value="npc">NPC</option><option value="location"
            >Location</option
          ><option value="faction">Faction</option><option value="item"
            >Item</option
          ><option value="ship">Ship</option></select
        ></label
      >
      <label class="text-xs font-bold uppercase tracking-wide text-theme-muted"
        >Public display name (optional)<input
          bind:value={ownerDisplayName}
          class="mt-1 w-full rounded border border-theme-border bg-theme-bg px-2 py-2 text-sm text-theme-text"
        /></label
      >
    </div>
    <div class="mt-5 rounded-lg border border-theme-border p-3">
      <h3 class="text-sm font-bold text-theme-text">Fields shared</h3>
      <ul class="mt-2 grid gap-1 text-sm text-theme-muted sm:grid-cols-2">
        {#each packagePreview.template.fields as field (field.id)}<li>
            {field.label} <span class="text-xs">({field.type})</span>
          </li>{/each}
      </ul>
    </div>
    <label class="mt-5 flex gap-2 text-sm text-theme-text"
      ><input type="checkbox" bind:checked={acknowledged} /> I understand this template
      will be publicly discoverable.</label
    >
    {#if error}<p class="mt-3 text-sm text-red-400" role="alert">
        {error}
      </p>{/if}
    {#if ownerToken}
      <div
        class="mt-4 rounded-lg border border-theme-primary/40 bg-theme-primary/10 p-3 text-sm text-theme-text"
      >
        <strong>Save your owner token</strong>
        <p class="mt-1 text-xs text-theme-muted">
          Use it to recover controls after clearing browser data.
        </p>
        <code class="mt-2 block break-all rounded bg-theme-bg p-2 text-xs"
          >{ownerToken}</code
        ><button
          type="button"
          class="mt-2 rounded border border-theme-border px-3 py-1 text-xs"
          onclick={() => navigator.clipboard?.writeText(ownerToken)}
          >Copy token</button
        >
      </div>
    {/if}
    <div class="mt-5 flex justify-end gap-2">
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-2 text-sm"
        onclick={onClose}>{ownerToken ? "Done" : "Cancel"}</button
      >{#if !ownerToken}<button
          type="button"
          class="rounded bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg"
          disabled={!acknowledged || isPublishing}
          onclick={publish}
          >{isPublishing ? "Publishing…" : "Publish template"}</button
        >{/if}
    </div>
  </div>
</div>
