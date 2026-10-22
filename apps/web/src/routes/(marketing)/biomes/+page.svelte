<script lang="ts">
  import { browser, building } from "$app/environment";
  import { beforeNavigate, goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { getBiome, type FilterFacet } from "biome-engine";
  import { biomeExplorer as store } from "$lib/stores/biome-explorer-instance";
  import BiomeLibrary from "$lib/components/biomes/BiomeLibrary.svelte";
  import BiomeDetail from "$lib/components/biomes/BiomeDetail.svelte";
  import BiomeEditorView from "$lib/components/biomes/BiomeEditorView.svelte";
  import BiomeCompare from "$lib/components/biomes/BiomeCompare.svelte";
  import BiomeCopyFallback from "$lib/components/biomes/BiomeCopyFallback.svelte";
  import BiomeNav from "$lib/components/biomes/BiomeNav.svelte";
  import BiomeNotice from "$lib/components/biomes/BiomeNotice.svelte";
  import SeoHead from "$lib/components/seo/SeoHead.svelte";
  import { buildAbsoluteUrl } from "$lib/seo/site";

  const cleanBase = $derived(base === "/" ? "" : base);

  let query = $state("");
  let filters = $state<FilterFacet[]>([]);

  // Read query parameters in browser after prerender to avoid accessing searchParams
  // during static prerendering, while resolving synchronously on the client.
  const biomeParam = $derived(
    browser && !building ? page.url.searchParams.get("biome") : null,
  );
  const selected = $derived(biomeParam ? getBiome(biomeParam) : undefined);

  // A biome named in the address belongs to the Library.
  $effect(() => {
    if (biomeParam && store.view !== "library" && store.view !== "editor") {
      store.setView("library");
    }
  });

  const openBiome = (id: string) =>
    goto(`${cleanBase}/biomes?biome=${encodeURIComponent(id)}`, {
      keepFocus: false,
    });
  const backToLibrary = () => goto(`${cleanBase}/biomes`);

  function makeMine(id: string) {
    if (store.startFromReference(id)) void goto(`${cleanBase}/biomes`);
  }

  function showTab(view: "library" | "compare") {
    if (store.draft && !store.discardDraft()) return;
    store.setView(view);
    if (biomeParam) void goto(`${cleanBase}/biomes`);
  }

  // Leaving the page with unsaved changes asks first.
  let leaveTo = $state<URL | null>(null);
  beforeNavigate(({ cancel, to }) => {
    if (store.draft?.dirty && to) {
      cancel();
      leaveTo = to.url;
      store.discardPending = true;
    }
  });
  $effect(() => {
    if (leaveTo && !store.discardPending) {
      const target = leaveTo;
      const gone = store.draft === null;
      leaveTo = null;
      if (gone) void goto(target);
    }
  });

  const pageTitle = $derived(
    selected
      ? `${selected.name} Biome | Biome Explorer | Codex Cryptica`
      : "Biome Explorer | Environment Inspiration & Ecology Reference | Codex Cryptica",
  );
  const pageDescription = $derived(
    selected
      ? selected.summary
      : "Curated reference library of real-world environments with ecology, conditions, plausibility guidelines, side-by-side comparison, and customizable Markdown export.",
  );
</script>

<SeoHead
  title={pageTitle}
  description={pageDescription}
  canonicalUrl={buildAbsoluteUrl("/biomes")}
  image="https://assets.codexcryptica.com/screenshots/feature-connect.jpg"
  imageAlt="Codex Cryptica Biome Explorer — real-world environments, ecology, and climate references"
  imageWidth={1600}
  imageHeight={1000}
/>

<svelte:window
  onbeforeunload={(event) => {
    if (store.draft?.dirty) event.preventDefault();
  }}
/>

<main class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
  <header class="flex flex-col gap-1">
    <h1 class="font-header text-3xl text-theme-text sm:text-4xl">
      Biome Explorer
    </h1>
    <p class="text-base text-theme-muted">
      Browse real-world environments, understand why they look the way they do,
      compare climates side by side, and customize biomes with Markdown export.
    </p>
  </header>

  <BiomeNav {store} onSelect={showTab} />

  {#if store.view === "editor"}
    <BiomeEditorView {store} />
  {:else if store.view === "compare"}
    <BiomeCompare {store} onBrowse={() => showTab("library")} />
  {:else if biomeParam && !selected}
    <BiomeNotice
      message="We couldn't find that biome."
      onAction={backToLibrary}
    />
  {:else if selected}
    <BiomeDetail
      biome={selected}
      onBack={backToLibrary}
      onMakeMine={makeMine}
      onCopyMarkdown={(id) => store.copyReferenceMarkdown(id)}
      onToggleCompare={(id) => store.toggleCompare(id)}
      comparing={store.compareIds.includes(selected.id)}
    />
  {:else}
    <BiomeLibrary
      bind:query
      bind:filters
      onOpen={openBiome}
      compareIds={store.compareIds}
      onToggleCompare={(id) => store.toggleCompare(id)}
      onStartBlank={() => {
        store.startBlank();
      }}
    />
  {/if}

  {#if store.view !== "editor"}
    <BiomeCopyFallback {store} />
  {/if}
</main>
