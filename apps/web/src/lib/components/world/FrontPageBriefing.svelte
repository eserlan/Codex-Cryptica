<script lang="ts">
  import ArticleRenderer from "$lib/components/blog/ArticleRenderer.svelte";

  let {
    draftDescription,
    isEditingBriefing,
    isDraftDirty,
    hasBriefing,
    isSaving = false,
    isGenerating = false,
    onSave,
    onCancel,
    onGenerate,
    onEdit,
  }: {
    draftDescription: string;
    isEditingBriefing: boolean;
    isDraftDirty: boolean;
    hasBriefing: boolean;
    isSaving?: boolean;
    isGenerating?: boolean;
    onSave: () => Promise<void>;
    onCancel: () => void;
    onGenerate: () => Promise<void>;
    onEdit: () => void;
  } = $props();

  let briefingTextarea = $state<HTMLTextAreaElement | null>(null);
  let isBriefingExpanded = $state(false);
  let briefingHoverTimer: ReturnType<typeof setTimeout> | null = null;

  const clearBriefingHoverTimer = () => {
    if (briefingHoverTimer) {
      clearTimeout(briefingHoverTimer);
      briefingHoverTimer = null;
    }
  };

  const beginBriefingPreviewHover = () => {
    if (!hasBriefing || isEditingBriefing) return;
    clearBriefingHoverTimer();
    briefingHoverTimer = setTimeout(() => {
      isBriefingExpanded = true;
      briefingHoverTimer = null;
    }, 800);
  };

  const endBriefingPreviewHover = () => {
    clearBriefingHoverTimer();
    isBriefingExpanded = false;
  };

  $effect(() => {
    if (!hasBriefing || isEditingBriefing) {
      isBriefingExpanded = false;
    }
  });

  $effect(() => {
    if (!briefingTextarea || (!isEditingBriefing && hasBriefing)) return;

    briefingTextarea.style.height = "auto";
    briefingTextarea.style.height = `${briefingTextarea.scrollHeight}px`;
  });
</script>

<section
  data-testid="briefing-content-section"
  class="flex flex-col overflow-hidden rounded-3xl border border-theme-border bg-theme-surface/80"
>
  <div class="relative overflow-hidden bg-theme-bg/80">
    {#if isEditingBriefing}
      <textarea
        bind:this={briefingTextarea}
        bind:value={draftDescription}
        rows="1"
        class="min-h-[12rem] w-full resize-none border-0 bg-transparent px-5 py-5 pb-16 text-sm leading-relaxed text-theme-text placeholder:text-theme-muted/60 focus:outline-none sm:px-6 sm:py-6 sm:text-base overflow-hidden"
        placeholder="Write a short world briefing…"
      ></textarea>
    {:else}
      <div class="relative w-full px-5 py-5 sm:px-6 sm:py-6">
        <div
          data-testid="briefing-preview"
          role="region"
          aria-label="World briefing preview"
          class={`relative flex-1 overflow-hidden prose prose-invert max-w-none prose-p:my-0 prose-p:leading-relaxed prose-ul:my-4 prose-ul:list-disc prose-ul:pl-5 prose-li:my-1 prose-li:marker:text-theme-primary prose-strong:text-theme-primary prose-a:text-theme-primary transition-[max-height] duration-300 ease-out ${isBriefingExpanded ? "max-h-[48rem]" : "max-h-[14rem]"}`}
          onmouseenter={beginBriefingPreviewHover}
          onmouseleave={endBriefingPreviewHover}
          onfocusin={beginBriefingPreviewHover}
          onfocusout={endBriefingPreviewHover}
        >
          {#if hasBriefing}
            <ArticleRenderer content={draftDescription} />
            {#if !isBriefingExpanded}
              <div
                class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-theme-bg/95"
              ></div>
            {/if}
          {:else}
            <div
              class="flex min-h-[12rem] items-center justify-center px-4 py-8 text-center text-sm text-theme-muted/70"
            >
              No world briefing yet. Use the edit or generate button to add one.
            </div>
          {/if}
        </div>
        <div
          class="absolute right-3 top-3 z-20 flex flex-wrap justify-end gap-1"
        >
          <button
            class="group inline-flex h-8 w-8 items-center justify-center rounded-full border border-theme-border/80 bg-theme-bg/75 text-theme-muted backdrop-blur-sm transition-colors hover:border-theme-primary/50 hover:text-theme-primary"
            onclick={onEdit}
            disabled={isSaving}
            title="Edit briefing"
            aria-label="Edit briefing"
          >
            <span class="icon-[lucide--pencil] h-4 w-4"></span>
          </button>
          <button
            class="group inline-flex h-8 w-8 items-center justify-center rounded-full border border-theme-primary/30 bg-theme-bg/75 text-theme-primary backdrop-blur-sm transition-colors hover:bg-theme-primary/15 disabled:opacity-50"
            onclick={onGenerate}
            disabled={isSaving || isGenerating}
            title="Generate briefing"
            aria-label="Generate briefing"
          >
            <span class="icon-[lucide--sparkles] h-4 w-4"></span>
          </button>
        </div>
      </div>
    {/if}
  </div>

  {#if isEditingBriefing}
    <div
      class="flex flex-wrap gap-2 border-t border-theme-border/60 px-5 py-4 sm:px-6"
    >
      <button
        class="rounded-lg bg-theme-primary px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-bg disabled:opacity-50"
        onclick={onSave}
        disabled={isSaving || !isDraftDirty}
      >
        Save Briefing
      </button>
      <button
        class="rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted hover:text-theme-text disabled:opacity-50"
        onclick={onCancel}
        disabled={isSaving}
      >
        Cancel
      </button>
    </div>
  {/if}
</section>
