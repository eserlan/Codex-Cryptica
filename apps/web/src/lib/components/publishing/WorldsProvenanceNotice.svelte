<script lang="ts">
  import { PUBLIC_WORLDS_NOTICE } from "$lib/config/public-worlds-notice";

  interface Props {
    onReport?: () => void;
  }

  let { onReport }: Props = $props();
</script>

<footer
  class="mt-12 rounded-lg border border-theme-border/60 bg-theme-surface/40 p-6 text-xs text-theme-text/70 transition-colors"
>
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
  >
    <div class="max-w-3xl space-y-2">
      <div
        class="flex items-center gap-2 font-header font-bold text-theme-text"
      >
        <span class="icon-[lucide--shield-check] h-4 w-4 text-theme-primary"
        ></span>
        <span>{PUBLIC_WORLDS_NOTICE.PROVENANCE_HEADER}</span>
      </div>
      <p class="leading-relaxed">
        {PUBLIC_WORLDS_NOTICE.PROVENANCE_TEXT}
      </p>
      <p class="leading-relaxed text-theme-text/60">
        {PUBLIC_WORLDS_NOTICE.AUTHOR_RESPONSIBILITY_TEXT}
      </p>
      <div class="pt-1">
        <a
          href={PUBLIC_WORLDS_NOTICE.TERMS_OF_USE_URL}
          class="inline-flex items-center gap-1 font-bold text-theme-primary hover:underline"
        >
          <span>{PUBLIC_WORLDS_NOTICE.TERMS_OF_USE_LABEL}</span>
          <span class="icon-[lucide--external-link] h-3 w-3"></span>
        </a>
      </div>
    </div>

    <div class="flex flex-col items-start gap-2 sm:items-end">
      <p
        class="max-w-xs text-left sm:text-right text-[11px] text-theme-text/50"
      >
        {PUBLIC_WORLDS_NOTICE.REPORT_PROMPT}
      </p>
      {#if onReport}
        <button
          type="button"
          onclick={onReport}
          class="inline-flex items-center gap-1.5 rounded border border-theme-border bg-theme-surface px-3 py-1.5 font-bold text-theme-text hover:border-theme-primary/50 hover:text-theme-primary transition-colors"
        >
          <span class="icon-[lucide--flag] h-3.5 w-3.5"></span>
          <span>{PUBLIC_WORLDS_NOTICE.REPORT_ACTION_LABEL}</span>
        </button>
      {/if}
    </div>
  </div>
</footer>
