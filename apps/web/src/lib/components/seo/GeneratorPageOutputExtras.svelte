<script lang="ts">
  import { businessGeneratorOutput } from "generator-engine";
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import OneShotRefinePanel from "./OneShotRefinePanel.svelte";
  import PointCrawlRefinePanel from "./PointCrawlRefinePanel.svelte";
  import BusinessRefinePanel from "./BusinessRefinePanel.svelte";
  import BusinessFallbackNote from "./BusinessFallbackNote.svelte";

  let {
    slug,
    output,
    useAI,
    onReplace,
  }: {
    slug: string;
    output: GeneratorOutput;
    useAI: boolean;
    onReplace: (output: GeneratorOutput) => void;
  } = $props();
</script>

{#if slug === "one-shot-adventure-generator"}
  <OneShotRefinePanel {output} {useAI} {onReplace} />
{:else if slug === "point-crawl"}
  <PointCrawlRefinePanel {output} {useAI} {onReplace} />
{:else if slug === "business" && output.business}
  <BusinessFallbackNote
    fallbackSections={output.business.fallbackSections}
    warnings={output.business.warnings}
  />
  <BusinessRefinePanel
    business={output.business}
    {useAI}
    onReplace={(doc) => onReplace(businessGeneratorOutput(doc) as never)}
  />
{/if}
