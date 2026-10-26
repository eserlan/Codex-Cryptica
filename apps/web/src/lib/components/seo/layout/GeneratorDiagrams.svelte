<script lang="ts">
  import {
    pointCrawlToOutput,
    type PointCrawlNode,
    type PointCrawlRegenTarget,
  } from "generator-engine";
  import {
    generatorEngine,
    type GeneratorOutput,
  } from "#lib/services/seo/generator-engine.js";
  import StarSystemDiagram from "../StarSystemDiagram.svelte";
  import ConstellationChart from "../ConstellationChart.svelte";
  import PointCrawlGraph from "../PointCrawlGraph.svelte";
  import MysteryClueGraph from "../MysteryClueGraph.svelte";
  import { blobToDataUrl } from "#lib/utils/svg-export.js";

  let {
    generatedData,
    useAI = false,
    onReplaceOutput = undefined,
    onCopy,
  }: {
    generatedData: GeneratorOutput | null;
    useAI?: boolean;
    onReplaceOutput?: (output: GeneratorOutput) => void;
    onCopy: () => void;
  } = $props();

  let starSystemDiagramRef = $state<ReturnType<
    typeof StarSystemDiagram
  > | null>(null);
  let constellationChartRef = $state<ReturnType<
    typeof ConstellationChart
  > | null>(null);
  let pointCrawlGraphRef = $state<ReturnType<typeof PointCrawlGraph> | null>(
    null,
  );
  let selectedPointCrawlNodeIds = $state<string[]>([]);
  let pointCrawlBusyId = $state<string | null>(null);

  /** PNG data URL of whichever diagram is on screen, if any. */
  export async function exportDataUrl(): Promise<string | undefined> {
    let blob: Blob | undefined;
    if (starSystemDiagramRef) {
      blob = (await starSystemDiagramRef.exportPng()) ?? undefined;
    } else if (constellationChartRef) {
      blob = (await constellationChartRef.exportPng()) ?? undefined;
    } else if (pointCrawlGraphRef) {
      blob = (await pointCrawlGraphRef.exportPng()) ?? undefined;
    }
    return blob ? blobToDataUrl(blob) : undefined;
  }

  export function getSelectedPointCrawlNodeIds(): string[] | undefined {
    if (!generatedData?.pointCrawl) return undefined;
    return selectedPointCrawlNodeIds.length > 0
      ? selectedPointCrawlNodeIds
      : generatedData.pointCrawl.nodes.map((n: PointCrawlNode) => n.id);
  }

  async function handlePointCrawlRegen(
    target: PointCrawlRegenTarget,
    instruction?: string,
  ) {
    const crawl = generatedData?.pointCrawl;
    if (!crawl || !onReplaceOutput || pointCrawlBusyId) return;
    pointCrawlBusyId = target.id;
    try {
      const res = await generatorEngine.regeneratePointCrawlPart(
        crawl,
        target,
        {
          useAI,
          instruction,
        },
      );
      if (res.crawl !== crawl) {
        onReplaceOutput(pointCrawlToOutput(res.crawl) as GeneratorOutput);
      }
    } finally {
      pointCrawlBusyId = null;
    }
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
{#if generatedData?.pointCrawl?.nodes?.length}
  <div class="mb-6">
    <PointCrawlGraph
      bind:this={pointCrawlGraphRef}
      crawl={generatedData.pointCrawl}
      bind:selectedNodeIds={selectedPointCrawlNodeIds}
      {useAI}
      busyId={pointCrawlBusyId}
      onRegeneratePart={onReplaceOutput ? handlePointCrawlRegen : undefined}
      {onCopy}
    />
  </div>
{/if}
<MysteryClueGraph graph={generatedData?.mysteryGraph} />
