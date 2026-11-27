<script lang="ts">
  import type { GeneratorContinuationConfig } from "./generator-continuation";

  let {
    config,
    disabled = false,
    isSaving = false,
    saveError = null,
    onSaveToCodex,
  }: {
    config: GeneratorContinuationConfig;
    disabled?: boolean;
    isSaving?: boolean;
    saveError?: string | null;
    onSaveToCodex: () => void;
  } = $props();
</script>

<aside
  aria-labelledby="generator-continuation-heading"
  data-testid="generator-continuation-callout"
  class="mt-8 rounded-2xl border border-theme-primary/30 bg-theme-surface/50 p-4 md:p-6 shadow-sm"
>
  <div class="flex flex-col gap-4">
    <div class="space-y-1.5">
      <div class="flex items-center gap-2 text-theme-text">
        <span
          class="icon-[lucide--book-plus] h-5 w-5 shrink-0"
          aria-hidden="true"
        ></span>
        <h3
          id="generator-continuation-heading"
          class="font-header text-lg md:text-xl font-bold text-theme-text"
        >
          {config.headline}
        </h3>
      </div>
      <p class="text-lg md:text-base text-theme-text leading-relaxed">
        {config.summary}
      </p>
    </div>

    <ul class="space-y-2 text-lg md:text-base text-theme-text">
      {#each config.capabilities as capability (capability)}
        <li class="flex items-start gap-2.5">
          <span
            class="icon-[lucide--check] mt-1 h-5 w-5 shrink-0 text-theme-primary"
            aria-hidden="true"
          ></span>
          <span>{capability}</span>
        </li>
      {/each}
    </ul>

    {#if saveError}
      <div
        role="alert"
        class="flex items-start gap-2 rounded-xl border border-theme-danger/40 bg-theme-danger/10 p-3 text-sm text-theme-text"
      >
        <span
          class="icon-[lucide--alert-circle] mt-0.5 h-4 w-4 shrink-0 text-theme-text"
          aria-hidden="true"
        ></span>
        <span>{saveError}</span>
      </div>
    {/if}

    <div
      class="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between"
    >
      <button
        type="button"
        id="save-to-codex-btn"
        onclick={onSaveToCodex}
        disabled={disabled || isSaving}
        aria-busy={isSaving}
        class="inline-flex min-h-[44px] min-w-0 max-w-full shrink-0 items-center justify-center gap-2 whitespace-normal rounded-xl bg-theme-primary px-5 py-2.5 font-header text-sm font-bold uppercase tracking-wider text-theme-on-primary shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg disabled:cursor-not-allowed disabled:opacity-100"
      >
        <span
          class="icon-[lucide--arrow-right] h-4 w-4 shrink-0"
          aria-hidden="true"
        ></span>
        {config.ctaLabel}
      </button>

      <p
        class="flex items-center gap-1.5 text-base md:text-sm text-theme-text leading-snug"
      >
        <span
          class="icon-[lucide--hard-drive] h-4 w-4 shrink-0 text-theme-text"
          aria-hidden="true"
        ></span>
        <span>{config.localFirstNotice}</span>
      </p>
    </div>
  </div>
</aside>
