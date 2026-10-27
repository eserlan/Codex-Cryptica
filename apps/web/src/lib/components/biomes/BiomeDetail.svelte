<script lang="ts">
  import {
    listBiomeSources,
    type ReferenceBiome,
    type Statement,
  } from "biome-engine";
  import BiomeImage from "./BiomeImage.svelte";
  import BiomeDisclosure from "./BiomeDisclosure.svelte";
  import BiomeConditions from "./BiomeConditions.svelte";
  import BiomeStatementList from "./BiomeStatementList.svelte";
  import BiomeSourceList from "./BiomeSourceList.svelte";
  import BiomeDetailActions from "./BiomeDetailActions.svelte";

  let {
    biome,
    expandAll = false,
    onBack,
    onMakeMine,
    onCopyMarkdown,
    onToggleCompare,
    comparing = false,
  }: {
    biome: ReferenceBiome;
    expandAll?: boolean;
    onBack?: () => void;
    onMakeMine?: (id: string) => void;
    onCopyMarkdown?: (id: string) => void;
    onToggleCompare?: (id: string) => void;
    comparing?: boolean;
  } = $props();

  type Section = { id: string; title: string; statements: Statement[] };

  const sources = $derived(listBiomeSources(biome));
  const sourceNumbers = $derived(
    Object.fromEntries(sources.map((source, index) => [source.id, index + 1])),
  );

  const sections: Section[] = $derived([
    {
      id: "climate",
      title: "Climate",
      statements: [
        ...biome.conditions.seasonality,
        ...biome.conditions.waterAvailability,
        ...biome.conditions.notes,
      ],
    },
    { id: "landscape", title: "Landscape", statements: biome.landscape },
    { id: "plants", title: "Plants", statements: biome.vegetation },
    { id: "wildlife", title: "Wildlife", statements: biome.wildlife },
    { id: "resources", title: "Resources", statements: biome.resources },
    { id: "hazards", title: "Hazards", statements: biome.hazards },
    { id: "variations", title: "Variations", statements: biome.variations },
  ]);

  // Climate always shows, because its ranges are not statements.
  const visible = $derived(
    sections.filter((s) => s.id === "climate" || s.statements.length > 0),
  );

  const hasImages = $derived(biome.images.length > 0);

  let openIds = $state<string[]>([]);
  const isOpen = (id: string) => expandAll || openIds.includes(id);
  const toggle = (id: string) =>
    (openIds = openIds.includes(id)
      ? openIds.filter((x) => x !== id)
      : [...openIds, id]);
</script>

<!-- DOM order is the phone reading order (header, images, sections). From lg
     up the images float in a right column beside the text. -->
<article
  class="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-x-12"
  aria-labelledby="biome-{biome.id}-heading"
  data-testid="biome-detail"
>
  <div
    class="flex min-w-0 flex-col gap-4 {hasImages
      ? 'lg:col-span-7'
      : 'lg:col-span-12 lg:max-w-4xl'} lg:row-start-1"
  >
    {#if onBack}
      <button
        type="button"
        class="inline-flex items-center gap-1 self-start rounded text-sm text-theme-text hover:underline"
        onclick={onBack}
      >
        <span class="icon-[lucide--arrow-left] h-4 w-4" aria-hidden="true"
        ></span>
        Back to all biomes
      </button>
    {/if}

    <header class="flex flex-col gap-2">
      <h2
        id="biome-{biome.id}-heading"
        class="font-header text-2xl text-theme-text"
      >
        {biome.name}
      </h2>
      <p class="text-theme-text">{biome.summary}</p>
      <p class="text-xs text-theme-text">
        This is a simplified reference, not a scientific classification. Real
        places mix and overlap, so use the ranges as a guide.
      </p>
    </header>

    <BiomeDetailActions
      biomeId={biome.id}
      {comparing}
      {onMakeMine}
      {onCopyMarkdown}
      {onToggleCompare}
    />
  </div>

  {#if hasImages}
    <div
      class="grid gap-4 sm:grid-cols-2 lg:sticky lg:top-24 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:grid-cols-1 lg:self-start"
      data-testid="biome-detail-images"
    >
      {#each biome.images as image (image.url)}
        <BiomeImage {image} biomeName={biome.name} />
      {/each}
    </div>
  {/if}

  <div
    class="flex min-w-0 flex-col gap-4 {hasImages
      ? 'lg:col-span-7'
      : 'lg:col-span-12 lg:max-w-4xl'} lg:row-start-2"
  >
    <div class="flex flex-col gap-2">
      {#each visible as section (section.id)}
        <BiomeDisclosure
          id="biome-{biome.id}-{section.id}"
          title={section.title}
          open={isOpen(section.id)}
          onToggle={() => toggle(section.id)}
        >
          {#if section.id === "climate"}
            <BiomeConditions conditions={biome.conditions} />
          {/if}
          <BiomeStatementList
            statements={section.statements}
            {sourceNumbers}
            anchorPrefix={biome.id}
          />
        </BiomeDisclosure>
      {/each}
    </div>

    <BiomeSourceList biomeId={biome.id} {sources} />
  </div>
</article>
