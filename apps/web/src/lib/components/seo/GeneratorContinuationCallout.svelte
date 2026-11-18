<script lang="ts">
  import type { GeneratorContinuationConfig } from "./generator-continuation";

  let {
    config,
    disabled = false,
    saveError = null,
    onSaveToCodex,
  }: {
    config: GeneratorContinuationConfig;
    disabled?: boolean;
    saveError?: string | null;
    onSaveToCodex: () => void;
  } = $props();
</script>

<aside
  aria-labelledby="generator-continuation-heading"
  data-testid="generator-continuation-callout"
  class="mt-8 rounded-2xl border border-theme-primary/30 bg-theme-surface/50 p-5 md:p-6 shadow-sm"
>
  <div class="flex flex-col gap-4">
    <div class="space-y-1.5">
      <div class="flex items-center gap-2 text-theme-text">
        <span
          class="icon-[lucide--book-plus] h-4 w-4 shrink-0"
          aria-hidden="true"
        ></span>
        <h3
          id="generator-continuation-heading"
          class="font-header text-base md:text-lg font-bold text-theme-text"
        >
          {config.headline}
        </h3>
      </div>
      <p class="text-sm text-theme-text/85 leading-relaxed">
        {config.summary}
      </p>
    </div>

    <ul class="space-y-2 text-sm text-theme-text/85">
      {#each config.capabilities as capability (capability)}
        <li class="flex items-start gap-2.5">
          <span
            class="icon-[lucide--check] mt-0.5 h-4 w-4 shrink-0 text-theme-primary"
            aria-hidden="true"
          ></span>
          <span>{capability}</span>
        </li>
      {/each}
    </ul>

    {#if saveError}
      <div
        role="alert"
        class="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400"
      >
        <span
          class="icon-[lucide--alert-circle] mt-0.5 h-4 w-4 shrink-0"
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
        {disabled}
        class="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-theme-primary px-5 py-2.5 font-header text-xs font-bold uppercase tracking-wider text-theme-on-primary shadow-sm transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg disabled:opacity-50"
      >
        <span
          class="icon-[lucide--arrow-right] h-4 w-4 shrink-0"
          aria-hidden="true"
        ></span>
        {config.ctaLabel}
      </button>

      <p
        class="flex items-center gap-1.5 text-xs text-theme-text leading-snug"
      >
        <span
          class="icon-[lucide--hard-drive] h-3.5 w-3.5 shrink-0 text-theme-text"
          aria-hidden="true"
        ></span>
        <span>{config.localFirstNotice}</span>
      </p>
    </div>
  </div>
</aside>
