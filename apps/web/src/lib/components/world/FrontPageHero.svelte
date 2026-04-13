<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import CoverImage from "./CoverImage.svelte";

  let {
    coverImageUrl,
    coverImage,
    showCoverEditor,
    showPanel = true,
    showActions = true,
    isSaving = false,
    onClose,
    onOpenCoverEditor,
    onCloseCoverEditor,
    onOpenLightbox,
    onUploadCover,
    onGenerateCover,
    class: className = "",
    ...restProps
  }: {
    coverImageUrl: string;
    coverImage: string;
    showCoverEditor: boolean;
    showPanel?: boolean;
    showActions?: boolean;
    isSaving?: boolean;
    onClose?: () => void;
    onOpenCoverEditor: () => void;
    onCloseCoverEditor?: () => void;
    onOpenLightbox: () => void;
    onUploadCover: (file: File) => Promise<void>;
    onGenerateCover: () => Promise<void>;
    class?: string;
  } & HTMLAttributes<HTMLElement> = $props();
</script>

<section
  class={["flex flex-col", className].filter(Boolean).join(" ")}
  {...restProps}
>
  {#if coverImageUrl && !showCoverEditor}
    <div
      data-testid="front-page-hero-background"
      class="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-screen"
      style={`background-image: url("${coverImageUrl}")`}
    ></div>
  {/if}

  {#if showPanel && (showCoverEditor || !coverImage)}
    <CoverImage
      hasImage={!!coverImage}
      {isSaving}
      onDrop={onUploadCover}
      onGenerate={onGenerateCover}
      onCancel={coverImage ? onCloseCoverEditor : undefined}
    />
  {/if}

  {#if showActions}
    <div
      class="flex flex-wrap justify-end gap-2 xl:absolute xl:right-0 xl:top-0 xl:gap-3"
    >
      {#if coverImage}
        <button
          class="rounded-full border border-theme-primary/45 bg-theme-surface/80 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-theme-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-theme-primary)_12%,transparent)] transition-colors hover:bg-theme-primary/12 hover:border-theme-primary/60"
          onclick={onOpenCoverEditor}
          disabled={isSaving}
        >
          Change Image
        </button>
      {/if}
      {#if coverImageUrl}
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-theme-border bg-theme-bg/70 text-theme-muted backdrop-blur-sm transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
          onclick={onOpenLightbox}
          aria-label="Open cover image lightbox"
          title="Open cover image"
          disabled={!coverImageUrl}
        >
          <span class="icon-[lucide--maximize-2] h-4 w-4"></span>
        </button>
      {/if}
      {#if onClose}
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-theme-border bg-theme-bg/70 text-theme-muted backdrop-blur-sm transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
          onclick={onClose}
          aria-label="Close front page"
          title="Close front page"
        >
          <span class="icon-[lucide--x] h-4 w-4"></span>
        </button>
      {/if}
    </div>
  {/if}
</section>
