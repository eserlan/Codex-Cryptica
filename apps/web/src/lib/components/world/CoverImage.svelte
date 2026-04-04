<script lang="ts">
  let {
    hasImage = false,
    isSaving = false,
    onDrop,
    onGenerate,
    onCancel,
  } = $props<{
    hasImage?: boolean;
    isSaving?: boolean;
    onDrop: (file: File) => Promise<void> | void;
    onGenerate: () => Promise<void> | void;
    onCancel?: () => void;
  }>();

  let isDragging = $state(false);
  let isGenerating = $state(false);
  const isBusy = $derived(isSaving || isGenerating);

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    isDragging = true;
  };

  const handleDragLeave = () => {
    isDragging = false;
  };

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault();
    isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await onDrop(file);
  };

  const handleGenerate = async () => {
    if (isBusy) return;
    isGenerating = true;
    try {
      await onGenerate();
    } finally {
      isGenerating = false;
    }
  };
</script>

<section
  class="rounded-3xl border border-theme-border bg-gradient-to-br from-theme-surface via-theme-surface to-theme-bg p-4 md:p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
  data-testid="cover-image-panel"
>
  <div class="mb-4 flex items-start justify-between gap-3">
    <div>
      <h3
        class="font-header text-xs uppercase tracking-[0.25em] text-theme-muted"
      >
        World Image
      </h3>
      <p class="mt-1 text-sm text-theme-text/70">
        {#if hasImage}
          Drop a new image to replace the current cover.
        {:else}
          Drop an image to set the world cover.
        {/if}
      </p>
    </div>

    {#if onCancel && hasImage}
      <button
        class="rounded-lg px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-theme-muted hover:text-theme-text"
        onclick={onCancel}
        disabled={isBusy}
      >
        Cancel
      </button>
    {/if}
  </div>

  <div
    class={`flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition-colors border-theme-border bg-theme-bg/70 ${isDragging ? "border-theme-primary bg-theme-primary/5" : ""}`}
    role="region"
    aria-label="World image drop zone"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <div
      class="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-theme-border text-theme-muted"
    >
      <span class="icon-[lucide--image-plus] h-6 w-6"></span>
    </div>

    <p class="max-w-sm text-sm leading-relaxed text-theme-muted">
      {#if hasImage}
        Drag a fresh cover image onto this zone to replace the current one.
      {:else}
        Drag a cover image here to give your world a stronger identity.
      {/if}
    </p>

    <div class="mt-4 flex flex-wrap justify-center gap-2">
      <button
        class={`rounded-lg border border-theme-primary/40 bg-theme-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-primary hover:bg-theme-primary/20 disabled:opacity-50 ${isBusy ? "animate-pulse" : ""}`}
        onclick={handleGenerate}
        disabled={isBusy}
      >
        {isBusy ? "Working..." : "Generate Art"}
      </button>
    </div>

    {#if isBusy}
      <div
        class="mt-5 w-full max-w-sm overflow-hidden rounded-full border border-theme-primary/30 bg-theme-bg/60"
        aria-label="Image generation in progress"
        role="status"
      >
        <div class="h-2 w-full bg-theme-bg/80">
          <div
            class="h-full w-2/3 animate-[pulse_1.2s_ease-in-out_infinite] bg-gradient-to-r from-theme-primary via-theme-accent to-theme-primary"
          ></div>
        </div>
      </div>
      <p
        class="mt-2 text-[10px] uppercase tracking-[0.2em] text-theme-primary/80"
      >
        Generating cover art...
      </p>
    {/if}
  </div>
</section>
