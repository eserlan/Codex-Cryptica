<script lang="ts">
  import type { DroppedItem } from "@codex/importer";
  import {
    collectDroppedItems,
    collectUploadedItems,
  } from "./vault-file-collector";

  interface Props {
    onSelect: (items: DroppedItem[]) => void | Promise<void>;
    isStandalone?: boolean;
  }

  let { onSelect, isStandalone = false }: Props = $props();

  let dragging = $state(false);
  let fileInputRef: HTMLInputElement;

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    dragging = false;
    if (!e.dataTransfer) return;

    const items = await collectDroppedItems(e.dataTransfer);
    if (items.length > 0) await onSelect(items);
  };

  const handleFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const items = collectUploadedItems(input.files);
    await onSelect(items);
    input.value = "";
  };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="vault-files-dropzone {dragging ? 'dragging' : ''} {isStandalone
    ? 'standalone'
    : ''}"
  data-testid="vault-files-dropzone"
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={handleDrop}
>
  <span class="icon-[lucide--folder-input] w-6 h-6 text-theme-muted"></span>
  <p class="drop-label">Drag files (or a folder) here</p>
  <button
    type="button"
    class="choose-btn"
    onclick={() => fileInputRef?.click()}
  >
    Choose Files
  </button>

  <input
    bind:this={fileInputRef}
    type="file"
    multiple
    accept=".md,.markdown"
    onchange={handleFileSelect}
    class="hidden-input"
    aria-label="Choose files to import"
  />
</div>

<style>
  .vault-files-dropzone {
    border: 2px dashed var(--color-theme-border, #ccc);
    border-radius: 8px;
    background: var(--color-theme-bg, #fafafa);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.5rem;
    transition: all 0.2s;
  }

  .vault-files-dropzone.standalone {
    min-height: 160px;
  }

  .vault-files-dropzone.dragging {
    border-color: var(--color-theme-primary, #3b82f6);
    background: color-mix(in srgb, var(--color-theme-primary), transparent 90%);
  }

  .drop-label {
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-theme-text);
  }

  .choose-btn {
    background: transparent;
    border: 1px solid var(--color-theme-border);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.7rem;
    text-transform: uppercase;
    cursor: pointer;
    color: var(--color-theme-text);
  }

  .hidden-input {
    display: none;
  }
</style>
