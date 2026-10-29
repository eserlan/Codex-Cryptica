<script lang="ts">
  import GeneratorSwitcherMenu from "./GeneratorSwitcherMenu.svelte";
  import PublicLabelChip from "#lib/components/labels/PublicLabelChip.svelte";

  let {
    canonicalPath,
    eyebrow,
    showGeneratorSwitcher,
    introTitle,
    introText,
    labels,
    inputHint,
    backHref,
    backLabel,
  }: {
    canonicalPath?: string;
    eyebrow: string;
    showGeneratorSwitcher: boolean;
    introTitle: string;
    introText: string;
    labels: string[];
    inputHint: string;
    backHref?: string;
    backLabel?: string;
  } = $props();

  import { basePath } from "#lib/utils/base-path.js";

  const cleanBase = basePath();
</script>

<a
  href="{cleanBase}{backHref ?? '/generators'}"
  class="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-widest font-header text-theme-muted hover:text-theme-primary transition-colors mb-3"
>
  <span class="icon-[lucide--arrow-left] w-3 h-3" aria-hidden="true"></span>
  {backLabel ?? "All generators"}
</a>
{#if showGeneratorSwitcher}
  <GeneratorSwitcherMenu {canonicalPath} {eyebrow} />
{/if}
<h1
  class="font-header font-bold text-lg uppercase tracking-wider text-theme-primary mb-4"
  id="generator-title"
>
  {introTitle}
</h1>
<p class="text-base text-theme-text leading-relaxed mb-4">{introText}</p>
{#if labels.length}
  <div class="mb-4 flex flex-wrap gap-2">
    {#each labels as label (label)}
      <PublicLabelChip {label} size="lg" />
    {/each}
  </div>
{/if}
{#if inputHint}
  <p
    class="text-sm text-theme-text font-header mb-5 flex items-center gap-2 leading-relaxed"
  >
    {#if inputHint.includes("below")}
      <span
        class="icon-[lucide--arrow-down] w-4 h-4 shrink-0"
        aria-hidden="true"
      ></span>
    {:else if inputHint.includes("right")}
      <span
        class="icon-[lucide--arrow-right] w-4 h-4 shrink-0"
        aria-hidden="true"
      ></span>
    {/if}
    {inputHint}
  </p>
{/if}
