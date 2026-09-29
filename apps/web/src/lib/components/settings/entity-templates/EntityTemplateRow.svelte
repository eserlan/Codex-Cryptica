<script lang="ts">
  import type { EntityTemplate } from "entity-template-engine";
  import EntityTemplatePreview from "./EntityTemplatePreview.svelte";

  let {
    template,
    isDefault,
    canEdit,
    previewMarkdown,
    previewOpen,
    onTogglePreview,
    onSetDefault,
    onDuplicate,
    onEdit,
    onExport,
    onDelete,
  }: {
    template: EntityTemplate;
    isDefault: boolean;
    canEdit: boolean;
    previewMarkdown: string;
    previewOpen: boolean;
    onTogglePreview: () => void;
    onSetDefault: () => void;
    onDuplicate: () => void;
    onEdit: () => void;
    onExport: () => void;
    onDelete: () => void;
  } = $props();

  const sourceLabel = $derived(
    template.source === "builtin"
      ? "Built-in"
      : template.source === "legacy"
        ? "Yours (file)"
        : "Yours",
  );
  const isOwn = $derived(template.source === "user");

  const smallButton =
    "inline-flex items-center gap-1 rounded border border-theme-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted transition-colors hover:border-theme-primary/40 hover:text-theme-text";
</script>

<div
  class="rounded border border-theme-border bg-theme-surface p-3"
  data-testid="entity-template-row"
>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex min-w-0 items-center gap-2">
      <span class="truncate text-xs font-bold text-theme-text"
        >{template.name}</span
      >
      <span
        class="rounded bg-theme-bg px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-theme-muted"
        data-testid="entity-template-source">{sourceLabel}</span
      >
      {#if isDefault}
        <span
          class="rounded bg-theme-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-primary"
          data-testid="entity-template-default">Default</span
        >
      {/if}
    </div>
    <div class="flex flex-wrap gap-1.5">
      <button
        type="button"
        class={smallButton}
        onclick={onTogglePreview}
        aria-expanded={previewOpen}
        data-testid="entity-template-preview-toggle">Preview</button
      >
      {#if canEdit && !isDefault}
        <button
          type="button"
          class={smallButton}
          onclick={onSetDefault}
          data-testid="entity-template-set-default">Set as default</button
        >
      {/if}
      {#if canEdit}
        <button
          type="button"
          class={smallButton}
          onclick={onDuplicate}
          data-testid="entity-template-duplicate">Duplicate</button
        >
      {/if}
      {#if canEdit && isOwn}
        <button
          type="button"
          class={smallButton}
          onclick={onEdit}
          data-testid="entity-template-edit">Edit</button
        >
      {/if}
      <button
        type="button"
        class={smallButton}
        onclick={onExport}
        data-testid="entity-template-export">Export</button
      >
      {#if canEdit && isOwn}
        <button
          type="button"
          class={smallButton}
          onclick={onDelete}
          data-testid="entity-template-delete">Delete</button
        >
      {/if}
    </div>
  </div>
  {#if previewOpen}
    <div class="mt-3">
      <EntityTemplatePreview markdown={previewMarkdown} />
    </div>
  {/if}
</div>
