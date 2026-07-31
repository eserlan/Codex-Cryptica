<script lang="ts">
  import type { PublicTemplatePackage } from "schema";
  import { statSheetTemplates } from "$lib/stores/stat-sheet-templates.svelte";

  let {
    packageData,
    onClose = () => {},
    onImported = () => {},
  } = $props<{
    packageData: PublicTemplatePackage;
    onClose?: () => void;
    onImported?: () => void;
  }>();
  let name = $state("");
  let error = $state("");
  let isSaving = $state(false);
  let initializedPackageName = $state("");
  $effect(() => {
    if (initializedPackageName === packageData.template.name) return;
    initializedPackageName = packageData.template.name;
    name = packageData.template.name;
  });

  async function importTemplate() {
    isSaving = true;
    error = "";
    try {
      const saved = await statSheetTemplates.importPublicTemplate(packageData, {
        name,
      });
      if (!saved) {
        error =
          "A template with that name already exists. Choose a different name.";
        return;
      }
      onImported();
      onClose();
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : "This template could not be imported.";
    } finally {
      isSaving = false;
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-theme-bg/80 p-4"
  role="presentation"
  onclick={(event) => event.target === event.currentTarget && onClose()}
>
  <div
    class="w-full max-w-md rounded-xl border border-theme-border bg-theme-surface p-5"
    role="dialog"
    aria-modal="true"
    aria-labelledby="import-template-title"
  >
    <div class="flex items-center justify-between gap-4">
      <h2
        id="import-template-title"
        class="font-header text-lg font-bold text-theme-text"
      >
        Import template
      </h2>
      <button
        type="button"
        class="text-theme-muted"
        aria-label="Close import dialog"
        onclick={onClose}><span class="icon-[lucide--x] h-4 w-4"></span></button
      >
    </div>
    <p class="mt-3 text-sm text-theme-muted">
      This creates an independent local copy. The publisher will not receive
      your campaign data.
    </p>
    <label
      class="mt-4 block text-xs font-bold uppercase tracking-wide text-theme-muted"
      for="import-template-name">Local template name</label
    >
    <input
      id="import-template-name"
      bind:value={name}
      class="mt-1 w-full rounded-lg border border-theme-border bg-theme-bg px-3 py-2 text-sm text-theme-text"
    />
    {#if error}<p class="mt-3 text-sm text-red-400" role="alert">
        {error}
      </p>{/if}
    <div class="mt-5 flex justify-end gap-2">
      <button
        type="button"
        class="rounded-lg border border-theme-border px-3 py-2 text-sm text-theme-text"
        onclick={onClose}>Cancel</button
      >
      <button
        type="button"
        class="rounded-lg bg-theme-primary px-3 py-2 text-sm font-bold text-theme-bg"
        onclick={importTemplate}
        disabled={isSaving || !name.trim()}
        >{isSaving ? "Importing…" : "Import"}</button
      >
    </div>
  </div>
</div>
