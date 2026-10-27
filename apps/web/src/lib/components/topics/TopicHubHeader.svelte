<script lang="ts">
  import PublicLabelChip from "#lib/components/labels/PublicLabelChip.svelte";
  import type { TopicImage } from "#lib/content/topics/types.js";
  import { TOPIC_LAYOUT } from "./topic-layout.js";

  let {
    title,
    label,
    leadParagraph,
    heroImage,
  }: {
    title: string;
    label: string;
    leadParagraph: string;
    heroImage?: TopicImage;
  } = $props();
</script>

<!-- With a hero the copy and image sit side by side from lg; without one the
     copy stays at lead width (a one-child grid would squeeze it to a column). -->
<header class={heroImage ? TOPIC_LAYOUT.header : "mb-12"}>
  <div class={heroImage ? TOPIC_LAYOUT.headerText : TOPIC_LAYOUT.lead}>
    <p
      class="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-theme-text"
    >
      Topic Hub
    </p>
    <h1
      class="font-header text-3xl font-bold tracking-tight text-theme-text sm:text-5xl"
    >
      {title}
    </h1>
    <div class="mt-4 flex flex-wrap gap-2">
      <PublicLabelChip {label} />
    </div>
    <p class="mt-6 leading-relaxed text-theme-text">{leadParagraph}</p>
  </div>

  {#if heroImage}
    <figure class={TOPIC_LAYOUT.headerHero}>
      <img
        src={heroImage.src}
        alt={heroImage.alt}
        width={heroImage.width}
        height={heroImage.height}
        loading="eager"
        decoding="async"
        class="h-auto w-full border border-theme-border shadow-sm"
      />
      {#if heroImage.caption}
        <figcaption class="mt-2 font-mono text-xs text-theme-text">
          {heroImage.caption}
        </figcaption>
      {/if}
    </figure>
  {/if}
</header>
