<script lang="ts">
  import type { ComponentProps } from "svelte";
  import GeneratorDraftReview from "./GeneratorDraftReview.svelte";
  import StarSystemDiagram from "#lib/components/seo/StarSystemDiagram.svelte";
  import ConstellationChart from "#lib/components/seo/ConstellationChart.svelte";
  import type { CampaignSaveContext } from "./campaign-generator-save.js";

  type ReviewProps = ComponentProps<typeof GeneratorDraftReview>;
  type DiagramExports = Pick<
    CampaignSaveContext,
    "exportStarSystem" | "exportConstellation" | "exportPointCrawl"
  >;
  let {
    draft = $bindable(),
    onsave,
    ...reviewProps
  }: Omit<ReviewProps, "onsave"> & {
    onsave: (
      ...args: [...Parameters<ReviewProps["onsave"]>, DiagramExports]
    ) => void;
  } = $props();
  let starSystemDiagramRef = $state<ReturnType<
    typeof StarSystemDiagram
  > | null>(null);
  let constellationChartRef = $state<ReturnType<
    typeof ConstellationChart
  > | null>(null);
  let draftReviewRef = $state<ReturnType<typeof GeneratorDraftReview> | null>(
    null,
  );

  const exports: DiagramExports = {
    get exportStarSystem() {
      return starSystemDiagramRef
        ? () => starSystemDiagramRef!.exportPng()
        : undefined;
    },
    get exportConstellation() {
      return constellationChartRef
        ? () => constellationChartRef!.exportPng()
        : undefined;
    },
    get exportPointCrawl() {
      return draftReviewRef
        ? () => draftReviewRef!.exportPointCrawlPng()
        : undefined;
    },
  };
</script>

{#if draft.bodies?.length}
  <!-- Rendered off-screen and not otherwise shown in this review UI —
             its only purpose here is to give exportPng() a live <svg> to
             rasterize into the entity's linked map when the draft is saved
             (#1935 follow-up). -->
  <div class="absolute h-px w-px overflow-hidden opacity-0" aria-hidden="true">
    <StarSystemDiagram
      bind:this={starSystemDiagramRef}
      bodies={draft.bodies}
      starType={draft.starType}
      title={draft.title}
    />
  </div>
{/if}
{#if draft.pattern?.stars?.length}
  <!-- Rendered off-screen and not otherwise shown in this review UI —
             its only purpose here is to give exportPng() a live <svg> to
             rasterize into the entity's linked map when the draft is saved. -->
  <div class="absolute h-px w-px overflow-hidden opacity-0" aria-hidden="true">
    <ConstellationChart
      bind:this={constellationChartRef}
      pattern={draft.pattern}
      title={draft.title}
    />
  </div>
{/if}

<GeneratorDraftReview
  {...reviewProps}
  bind:this={draftReviewRef}
  bind:draft
  onsave={(reviewed, createRelationship, options) =>
    onsave(reviewed, createRelationship, options, exports)}
/>
