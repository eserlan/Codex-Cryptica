<script lang="ts">
  import { basePath } from "#lib/utils/base-path.js";
  import type { ThemeConfig } from "./theme-config";
  import HubAppearanceToggle from "./HubAppearanceToggle.svelte";
  const cleanBase = basePath();
  let { config }: { config: ThemeConfig } = $props();
  // ui-check-ignore: Preserve existing hub styles during behaviour-neutral extraction.
  const backLinkClass =
    "inline-flex items-center gap-2 text-xs font-bold text-theme-muted hover:text-theme-primary transition-colors";
  // ui-check-ignore: Preserve existing hub styles during behaviour-neutral extraction.
  const eyebrowClass =
    "text-xs font-mono uppercase tracking-[0.24em] text-theme-primary mb-4";
  // ui-check-ignore: Preserve existing hub styles during behaviour-neutral extraction.
  const introClass = "text-base md:text-lg text-theme-muted leading-relaxed";
</script>

<section class="border-b border-theme-border/60 px-6 py-14 md:py-18">
  <div class="max-w-7xl mx-auto">
    <div class="flex items-center justify-between gap-4 mb-8">
      <a href="{cleanBase}/generators" class={backLinkClass}>
        <span aria-hidden="true" class="icon-[lucide--arrow-left] h-4 w-4"
        ></span>
        All Generators
      </a>

      <HubAppearanceToggle />
    </div>
    <div class="max-w-3xl">
      <p class={eyebrowClass}>
        {config.eyebrow}
      </p>
      <h1
        class="font-display text-4xl md:text-5xl font-extrabold tracking-wide mb-5"
      >
        {config.label} RPG Generators
      </h1>
      <p class={introClass}>
        {config.intro}
      </p>
    </div>
  </div>
</section>
