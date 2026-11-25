<script lang="ts">
  import {
    type PointCrawlNode,
    type PointCrawlRegenTarget,
  } from "generator-engine/point-crawl-state";
  import { type GeneratorOutput } from "#lib/services/seo/generator-engine.js";
  import StarSystemDiagram from "../StarSystemDiagram.svelte";
  import ConstellationChart from "../ConstellationChart.svelte";
  import PointCrawlGraph from "../PointCrawlGraph.svelte";
  import MysteryClueGraph from "../MysteryClueGraph.svelte";
  import { onDestroy } from "svelte";
  import { blobToDataUrl } from "#lib/utils/svg-export.js";
  import { regeneratePointCrawlPartLocal } from "generator-engine/point-crawl-repair";
  import { saveGeneratorOutputForReload } from "../generator-output-reload.js";
  import { onlineStatus } from "#lib/stores/online.svelte.js";

  let {
    generatedData,
    recoveryKey = "",
    useAI = false,
    onReplaceOutput = undefined,
    onCopy,
  }: {
    generatedData: GeneratorOutput | null;
    recoveryKey?: string;
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
  let pointCrawlRequestToken = 0;
  let pointCrawlRetryAttempt = $state(0);
  let pointCrawlFailure = $state(false);
  let recoverySaveFailed = $state(false);
  let pendingPointCrawlRequest = $state<{
    target: PointCrawlRegenTarget;
    instruction?: string;
    sourceOutput: GeneratorOutput;
    sourceCrawl: NonNullable<GeneratorOutput["pointCrawl"]>;
  } | null>(null);
  $effect(() => {
    const currentOutput = generatedData;
    const pending = pendingPointCrawlRequest;
    if (
      pending &&
      (currentOutput !== pending.sourceOutput ||
        currentOutput?.pointCrawl !== pending.sourceCrawl)
    ) {
      pointCrawlRequestToken += 1;
      pointCrawlBusyId = null;
      pendingPointCrawlRequest = null;
      pointCrawlFailure = false;
      pointCrawlRetryAttempt = 0;
    }
  });
  onDestroy(() => {
    pointCrawlRequestToken += 1;
  });

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

  // Keep cancellation, retry source identity, and local/AI regeneration checks together; covered by point-crawl refinement regressions.
  // fallow-ignore-next-line complexity
  async function handlePointCrawlRegen(
    target: PointCrawlRegenTarget,
    instruction?: string,
  ) {
    const crawl = generatedData?.pointCrawl;
    if (!crawl || !onReplaceOutput || pointCrawlBusyId) return;
    const startedFrom = generatedData;
    const replaceOutput = onReplaceOutput;
    const request = ++pointCrawlRequestToken;
    pendingPointCrawlRequest = {
      target,
      instruction,
      sourceOutput: startedFrom,
      sourceCrawl: crawl,
    };
    pointCrawlFailure = false;
    pointCrawlBusyId = target.id;
    try {
      if (
        request !== pointCrawlRequestToken ||
        generatedData !== startedFrom ||
        onReplaceOutput !== replaceOutput
      )
        return;
      let res;
      if (
        useAI &&
        onlineStatus.current &&
        (typeof navigator === "undefined" || navigator.onLine)
      ) {
        const { generatorEngine } =
          await import("#lib/services/seo/generator-engine.js");
        if (
          request !== pointCrawlRequestToken ||
          generatedData !== startedFrom ||
          onReplaceOutput !== replaceOutput
        )
          return;
        res = await generatorEngine.regeneratePointCrawlPart(crawl, target, {
          useAI: true,
          instruction,
        });
      } else {
        res = regeneratePointCrawlPartLocal(crawl, target, instruction);
      }
      if (
        res.crawl !== crawl &&
        request === pointCrawlRequestToken &&
        generatedData === startedFrom &&
        onReplaceOutput === replaceOutput
      ) {
        const { pointCrawlToOutput } =
          await import("generator-engine/public-point-crawl");
        if (
          request === pointCrawlRequestToken &&
          generatedData === startedFrom &&
          onReplaceOutput === replaceOutput
        )
          replaceOutput(pointCrawlToOutput(res.crawl) as GeneratorOutput);
      }
      pointCrawlRetryAttempt = 0;
      pendingPointCrawlRequest = null;
    } catch {
      if (request === pointCrawlRequestToken) pointCrawlFailure = true;
    } finally {
      if (request === pointCrawlRequestToken) pointCrawlBusyId = null;
    }
  }

  function retryPointCrawlRefinement() {
    const pending = pendingPointCrawlRequest;
    if (
      !pending ||
      generatedData !== pending.sourceOutput ||
      generatedData?.pointCrawl !== pending.sourceCrawl
    ) {
      pendingPointCrawlRequest = null;
      pointCrawlFailure = false;
      return;
    }
    pointCrawlRetryAttempt += 1;
    void handlePointCrawlRegen(pending.target, pending.instruction);
  }

  function reloadWithPointCrawlDraft() {
    if (
      !generatedData ||
      !saveGeneratorOutputForReload(recoveryKey, generatedData)
    ) {
      recoverySaveFailed = true;
      return;
    }
    window.location.reload();
  }

  async function copyPointCrawlDraft() {
    if (!generatedData) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(generatedData, null, 2),
      );
      recoverySaveFailed = false;
    } catch {
      recoverySaveFailed = true;
    }
  }
</script>

<!-- Each diagram branch owns its output schema and recovery boundary; keep this presentation switch adjacent to the diagram actions. -->
<!-- fallow-ignore-next-line complexity -->
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
      useAI={useAI &&
        onlineStatus.current &&
        (typeof navigator === "undefined" || navigator.onLine)}
      busyId={pointCrawlBusyId}
      onRegeneratePart={onReplaceOutput ? handlePointCrawlRegen : undefined}
      {onCopy}
    />
    {#if pointCrawlFailure}
      <p class="mt-2 text-sm text-theme-text" role="alert">
        The point-crawl refinement could not load or finish.
        {#if pointCrawlRetryAttempt === 0}
          <button class="underline" onclick={retryPointCrawlRefinement}
            >Retry</button
          >
        {:else if recoverySaveFailed}
          <button class="underline" onclick={copyPointCrawlDraft}
            >Copy result</button
          >
        {:else}
          <button class="underline" onclick={reloadWithPointCrawlDraft}
            >Reload to recover</button
          >
        {/if}
      </p>
    {/if}
  </div>
{/if}
<MysteryClueGraph graph={generatedData?.mysteryGraph} />
