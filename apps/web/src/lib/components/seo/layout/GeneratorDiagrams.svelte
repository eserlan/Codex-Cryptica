<script lang="ts">
  import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
  import StarSystemDiagram from "../StarSystemDiagram.svelte";
  import ConstellationChart from "../ConstellationChart.svelte";
  import { blobToDataUrl } from "$lib/utils/svg-export";

  let {
    generatedData,
    onCopy,
  }: {
    generatedData: GeneratorOutput | null;
    onCopy: () => void;
  } = $props();

  let starSystemDiagramRef = $state<ReturnType<
    typeof StarSystemDiagram
  > | null>(null);
  let constellationChartRef = $state<ReturnType<
    typeof ConstellationChart
  > | null>(null);

  /** PNG data URL of whichever diagram is on screen, if any. */
  export async function exportDataUrl(): Promise<string | undefined> {
    let blob: Blob | undefined;
    if (starSystemDiagramRef) {
      blob = (await starSystemDiagramRef.exportPng()) ?? undefined;
    } else if (constellationChartRef) {
      blob = (await constellationChartRef.exportPng()) ?? undefined;
    }
    return blob ? blobToDataUrl(blob) : undefined;
  }
</script>

{#if generatedData?.labels?.includes("star-system") && generatedData.bodies?.length}
  <div class="mb-6">
    <StarSystemDiagram
      bind:this={starSystemDiagramRef}
      bodies={generatedData.bodies}
      starType={generatedData.starType}
      title={generatedData.title}
      {onCopy}
    />
  </div>
{/if}
{#if generatedData?.labels?.includes("constellation") && generatedData.pattern?.stars?.length}
  <div class="mb-6">
    <ConstellationChart
      bind:this={constellationChartRef}
      pattern={generatedData.pattern}
      title={generatedData.title}
      {onCopy}
    />
  </div>
{/if}
