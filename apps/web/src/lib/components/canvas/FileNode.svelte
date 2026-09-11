<script lang="ts">
  import type { CanvasFile } from "@codex/canvas-engine";
  import { NodeResizer, type NodeProps } from "@xyflow/svelte";
  import type { ResizeParams } from "@xyflow/system";
  import { vault } from "$lib/stores/vault.svelte";

  let { data, selected, width, height }: NodeProps = $props();

  const file = $derived(data?.file as CanvasFile | undefined);
  const isImage = $derived(file?.mimeType.startsWith("image/") ?? false);
  const showFullImage = $derived(Boolean(data?.showFullImage));
  const locked = $derived(Boolean(data?.locked));
  const canResize = $derived(isImage && showFullImage && !locked);
  const hasCustomSize = $derived(Boolean(width && height));
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

  function handleResizeEnd(_event: unknown, params: ResizeParams) {
    (
      data as { onUpdateFile?: (updates: Record<string, unknown>) => void }
    )?.onUpdateFile?.({ width: params.width, height: params.height });
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

{#if showFullImage}
  <article
    class="relative overflow-hidden rounded-lg border bg-theme-surface shadow-lg {selected
      ? 'border-theme-primary ring-2 ring-theme-primary/40'
      : 'border-theme-border'} {hasCustomSize ? 'h-full w-full' : 'w-fit'}"
    aria-label={file ? `File: ${file.name}` : "Stored file"}
  >
    {#if canResize && selected}
      <NodeResizer
        minWidth={120}
        minHeight={90}
        keepAspectRatio
        lineClass="canvas-resize-line"
        handleClass="canvas-resize-handle"
        onResizeEnd={handleResizeEnd}
      />
    {/if}
    {#if imageUrl}
      <img
        src={imageUrl}
        alt={file?.name || "Uploaded image"}
        loading="lazy"
        decoding="async"
        class={hasCustomSize
          ? "h-full w-full object-contain"
          : "max-h-96 w-auto object-contain"}
        onerror={hideImagePreview}
      />
    {:else}
      <div class="flex min-w-52 items-center gap-2 p-3">
        <span
          class="{iconClass} h-5 w-5 shrink-0 text-theme-primary"
          aria-hidden="true"
        ></span>
        <p
          class="min-w-0 flex-1 truncate text-sm font-semibold text-theme-text"
          title={file?.name}
        >
          {file?.name || "Stored file"}
        </p>
      </div>
    {/if}
    <label
      class="nodrag absolute top-1.5 right-1.5 flex cursor-pointer items-center rounded-md bg-theme-bg/80 p-1 backdrop-blur-sm"
      title="Show full image"
    >
      <input
        type="checkbox"
        checked={showFullImage}
        onchange={(e) => toggleShowFullImage(e.currentTarget.checked)}
        aria-label="Show full image"
        class="accent-theme-primary rounded"
      />
    </label>
  </article>
{:else}
  <article
    class="min-w-52 max-w-72 rounded-lg border bg-theme-surface p-3 shadow-lg {selected
      ? 'border-theme-primary ring-2 ring-theme-primary/40'
      : 'border-theme-border'}"
    aria-label={file ? `File: ${file.name}` : "Stored file"}
  >
    {#if imageUrl}
      <div
        class="h-36 overflow-hidden rounded-md border border-theme-border bg-theme-bg/50"
      >
        <img
          src={imageUrl}
          alt={file?.name || "Uploaded image"}
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover"
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
        <p
          class="truncate text-sm font-semibold text-theme-text"
          title={file?.name}
        >
          {file?.name || "Stored file"}
        </p>
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
        <span
          class="icon-[lucide--external-link] h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
        Open file
      </button>
    {/if}
  </article>
{/if}

<style>
  /*
   * The library's default resize line is a 1px hitbox, too thin to reliably
   * grab. Widen it into an invisible strip centered on the true edge, and
   * draw a thin accent line at its center (which lands back on the edge)
   * that only appears on hover so the resting UI stays clean.
   */
  :global(.svelte-flow__resize-control.line.canvas-resize-line) {
    background: transparent;
    border-width: 0 !important;
  }
  :global(.svelte-flow__resize-control.line.left.canvas-resize-line),
  :global(.svelte-flow__resize-control.line.right.canvas-resize-line) {
    width: 12px;
  }
  :global(.svelte-flow__resize-control.line.top.canvas-resize-line),
  :global(.svelte-flow__resize-control.line.bottom.canvas-resize-line) {
    height: 12px;
  }
  :global(.svelte-flow__resize-control.line.canvas-resize-line::after) {
    content: "";
    position: absolute;
    background: var(--color-theme-primary);
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  :global(.svelte-flow__resize-control.line.left.canvas-resize-line::after),
  :global(.svelte-flow__resize-control.line.right.canvas-resize-line::after) {
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-50%);
  }
  :global(.svelte-flow__resize-control.line.top.canvas-resize-line::after),
  :global(.svelte-flow__resize-control.line.bottom.canvas-resize-line::after) {
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    transform: translateY(-50%);
  }
  :global(.svelte-flow__resize-control.line.canvas-resize-line:hover::after) {
    opacity: 1;
  }

  /* Slightly larger corner handles for an easier grab target. */
  :global(.svelte-flow__resize-control.handle.canvas-resize-handle) {
    width: 9px;
    height: 9px;
  }
</style>
