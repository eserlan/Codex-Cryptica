<script lang="ts">
  import type { CanvasFile } from "@codex/canvas-engine";
  import type { NodeProps } from "@xyflow/svelte";
  import { vault } from "$lib/stores/vault.svelte";

  let { data, selected }: NodeProps = $props();

  const file = $derived(data?.file as CanvasFile | undefined);
  const isImage = $derived(file?.mimeType.startsWith("image/") ?? false);
  const showFullImage = $derived(Boolean(data?.showFullImage));
  let imageUrl = $state("");
  const sizeLabel = $derived.by(() => {
    if (!file) return "Unknown size";
    if (file.size < 1024) return `${file.size} B`;
    if (file.size < 1024 * 1024) return `${Math.round(file.size / 1024)} KB`;
    return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  });
  const iconClass = $derived(
    isImage
      ? "icon-[lucide--image]"
      : file?.mimeType === "application/pdf"
        ? "icon-[lucide--file-text]"
        : "icon-[lucide--file]",
  );

  async function openFile() {
    if (!file) return;
    const url = await vault.resolveImageUrl(file.path);
    if (url) window.open(url, "_blank", "noopener");
  }

  function hideImagePreview() {
    imageUrl = "";
  }

  function toggleShowFullImage(next: boolean) {
    (
      data as { onUpdateFile?: (updates: Record<string, unknown>) => void }
    )?.onUpdateFile?.({ showFullImage: next });
  }

  $effect(() => {
    const path = file?.path;
    if (!isImage || !path) {
      imageUrl = "";
      return;
    }

    let isCurrent = true;
    const resolution = vault.resolveImageUrl(path);
    resolution
      .then((url) => {
        if (isCurrent) imageUrl = url;
      })
      .catch(() => {
        if (isCurrent) imageUrl = "";
      });

    return () => {
      isCurrent = false;
      resolution.then(() => vault.releaseImageUrl(path)).catch(() => undefined);
    };
  });
</script>

<article
  class="min-w-52 max-w-72 rounded-lg border bg-theme-surface p-3 shadow-lg {selected
    ? 'border-theme-primary ring-2 ring-theme-primary/40'
    : 'border-theme-border'}"
  aria-label={file ? `File: ${file.name}` : "Stored file"}
>
  {#if imageUrl}
    <div
      class="overflow-hidden rounded-md border border-theme-border bg-theme-bg/50 {showFullImage
        ? ''
        : 'h-36'}"
    >
      <img
        src={imageUrl}
        alt={file?.name || "Uploaded image"}
        loading="lazy"
        decoding="async"
        class={showFullImage
          ? "max-h-96 w-full object-contain"
          : "h-full w-full object-cover"}
        onerror={hideImagePreview}
      />
    </div>
  {/if}
  <div class="flex items-start gap-2">
    <span
      class="{iconClass} mt-0.5 h-5 w-5 shrink-0 text-theme-primary"
      aria-hidden="true"
    ></span>
    <div class="min-w-0 flex-1">
      {#if !showFullImage}
        <p
          class="truncate text-sm font-semibold text-theme-text"
          title={file?.name}
        >
          {file?.name || "Stored file"}
        </p>
      {/if}
      <p class="mt-0.5 text-xs text-theme-muted">{sizeLabel}</p>
    </div>
  </div>
  {#if isImage}
    <label
      class="nodrag mt-2 flex cursor-pointer items-center gap-1.5 text-xs text-theme-muted select-none"
    >
      <input
        type="checkbox"
        checked={showFullImage}
        onchange={(e) => toggleShowFullImage(e.currentTarget.checked)}
        class="accent-theme-primary rounded"
      />
      Show full image
    </label>
  {/if}
  {#if file}
    <button
      type="button"
      class="nodrag mt-3 inline-flex items-center gap-1 text-xs font-semibold text-theme-primary hover:text-theme-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      onclick={openFile}
    >
      <span class="icon-[lucide--external-link] h-3.5 w-3.5" aria-hidden="true"
      ></span>
      Open file
    </button>
  {/if}
</article>
