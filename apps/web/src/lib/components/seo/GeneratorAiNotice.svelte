<script lang="ts" module>
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

  /** Whether a result needs telling the user AI didn't fully deliver it. */
  export function hasAiNotice(data: GeneratorOutput | null): boolean {
    return Boolean(
      data?.aiFallback ||
      data?.aiReviewSkipped ||
      data?.aiPartialFallback?.length,
    );
  }
</script>

<script lang="ts">
  let {
    data,
    isBusy,
    onDismiss,
    onRetry,
  }: {
    data: GeneratorOutput;
    isBusy: boolean;
    onDismiss: () => void;
    onRetry?: () => void;
  } = $props();

  const isOneShot = $derived(data.kind === "one-shot");
  const partial = $derived(data.aiPartialFallback ?? []);
</script>

<div
  class="mb-4 p-3 border border-theme-warning/40 bg-theme-warning/10 rounded-xl flex items-start gap-2.5"
  role="status"
  aria-live="polite"
  data-testid="ai-fallback-notice"
>
  <span
    class="icon-[lucide--info] w-4 h-4 text-theme-warning shrink-0 mt-0.5"
    aria-hidden="true"
  ></span>
  <div class="text-xs text-theme-text/80 leading-snug flex-grow">
    {#if data.aiFallback && isOneShot}
      <p class="font-bold text-theme-text">AI generation didn't finish</p>
      <p class="mt-0.5">
        It may have timed out or been unavailable. Codex built a basic adventure
        outline instead. This is not the full AI-generated adventure.
      </p>
    {:else if data.aiFallback}
      <p>
        AI generation was unavailable, so Codex created a local draft instead.
      </p>
    {:else}
      {#if partial.length}
        <p class="font-bold text-theme-text">
          Some parts were written from templates
        </p>
        <p class="mt-0.5">
          The AI didn't finish {partial.join(", ")}. Use Regenerate on those
          parts under Refine one part.
        </p>
      {/if}
      {#if data.aiReviewSkipped}
        <p class="font-bold text-theme-text" class:mt-2={partial.length}>
          Generated, but the AI review didn't finish
        </p>
        <p class="mt-0.5">
          This adventure may still have gaps. Anything left open is listed under
          Before You Run It.
        </p>
      {/if}
    {/if}
    {#if onRetry && !isBusy}
      <button
        type="button"
        onclick={onRetry}
        class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-micro font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
      >
        <span class="icon-[lucide--refresh-cw] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Retry with AI
      </button>
    {/if}
  </div>
  <button
    type="button"
    onclick={onDismiss}
    class="text-theme-muted hover:text-theme-text transition-colors shrink-0"
    aria-label="Dismiss notice"
  >
    <span aria-hidden="true" class="icon-[lucide--x] w-3.5 h-3.5"></span>
  </button>
</div>
