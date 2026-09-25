<script lang="ts">
  import type { ExploreLink } from "./explore-sections";

  let {
    link,
    cleanBase,
  }: {
    link: ExploreLink;
    cleanBase: string;
  } = $props();
</script>

<a
  href={link.external ? link.href : `${cleanBase}${link.href}`}
  target={link.external ? "_blank" : undefined}
  rel={link.external ? "noopener noreferrer" : undefined}
  class="group flex items-start gap-3 rounded-xl border border-theme-border bg-theme-surface p-4 shadow-sm transition-all hover:border-theme-primary/50 hover:shadow-md"
>
  <span class="{link.icon} mt-0.5 h-5 w-5 shrink-0 text-theme-primary"></span>
  <span class="flex flex-col">
    <span
      class="font-header text-base font-bold text-theme-text group-hover:text-theme-primary"
    >
      {link.label}
    </span>
    {#if link.summary}
      <span class="mt-1 text-sm leading-relaxed text-theme-muted">
        {link.summary}
      </span>
    {/if}
  </span>
</a>
