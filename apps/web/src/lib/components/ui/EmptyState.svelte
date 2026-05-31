<script lang="ts">
  let {
    icon = "icon-[lucide--inbox]",
    headline,
    body,
    cta,
    onCta,
  }: {
    icon?: string;
    headline: string;
    body?: string;
    cta?: string;
    onCta?: () => void;
  } = $props();
</script>

<div
  class="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center"
>
  <span class="{icon} h-8 w-8 text-theme-muted/40"></span>
  <p
    class="text-[10px] font-bold font-header uppercase tracking-[0.2em] text-theme-muted"
  >
    {headline}
  </p>
  {#if body}
    <p
      class="text-xs text-theme-muted/70 font-body leading-relaxed max-w-[22ch]"
    >
      {body}
    </p>
  {/if}
  {#if cta && onCta}
    <button
      type="button"
      onclick={onCta}
      class="mt-1 px-3 py-1 text-[10px] font-bold font-header uppercase tracking-wider rounded border border-theme-primary/40 text-theme-primary hover:bg-theme-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
    >
      {cta}
    </button>
  {/if}
</div>
