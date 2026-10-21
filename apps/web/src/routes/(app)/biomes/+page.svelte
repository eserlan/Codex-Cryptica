<script lang="ts">
  import { untrack } from "svelte";
  import { beforeNavigate, goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { getBiome, type FilterFacet } from "biome-engine";
  import { biomeExplorer as store } from "$lib/stores/biome-explorer-instance";
  import BiomeLibrary from "$lib/components/biomes/BiomeLibrary.svelte";
  import BiomeDetail from "$lib/components/biomes/BiomeDetail.svelte";
  import BiomeEditorView from "$lib/components/biomes/BiomeEditorView.svelte";
  import BiomeCompare from "$lib/components/biomes/BiomeCompare.svelte";
  import BiomeMineView from "$lib/components/biomes/BiomeMineView.svelte";
  import BiomeCopyFallback from "$lib/components/biomes/BiomeCopyFallback.svelte";
  import BiomeNav from "$lib/components/biomes/BiomeNav.svelte";
  import BiomeNotice from "$lib/components/biomes/BiomeNotice.svelte";

  let query = $state("");
  let filters = $state<FilterFacet[]>([]);

  const biomeParam = $derived(page.url.searchParams.get("biome"));
  const profileParam = $derived(page.url.searchParams.get("profile"));
  const selected = $derived(biomeParam ? getBiome(biomeParam) : undefined);

  let profileMissing = $state(false);

  // Open a profile named in the address, once per change of the address.
  $effect(() => {
    const id = profileParam;
    if (!id) {
      profileMissing = false;
      return;
    }
    untrack(() => {
      void store.openProfile(id).then((ok) => {
        profileMissing = !ok;
      });
    });
  });

  // A biome named in the address belongs to the Library.
  $effect(() => {
    if (biomeParam && store.view !== "library" && store.view !== "editor")
      store.setView("library");
  });

  // The list is read when the view is shown.
  $effect(() => {
    if (store.view === "mine") void store.refreshProfiles();
  });

  const openBiome = (id: string) =>
    goto(`${base}/biomes?biome=${encodeURIComponent(id)}`, {
      keepFocus: false,
    });
  const backToLibrary = () => goto(`${base}/biomes`);

  function makeMine(id: string) {
    if (store.startFromReference(id)) void goto(`${base}/biomes`);
  }

  function showTab(view: "library" | "compare" | "mine") {
    if (store.draft && !store.discardDraft()) return;
    store.setView(view);
    if (biomeParam || profileParam) void goto(`${base}/biomes`);
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
</script>

<svelte:head>
  <title>Codex Cryptica | Biome Explorer</title>
</svelte:head>

<svelte:window
  onbeforeunload={(event) => {
    if (store.draft?.dirty) event.preventDefault();
  }}
/>

<main class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
  <header class="flex flex-col gap-1">
    <h1 class="font-header text-3xl text-theme-text">Biome Explorer</h1>
    <p class="text-sm text-theme-muted">
      Browse real-world environments, see why they look the way they do, and
      build your own.
    </p>
  </header>

  <BiomeNav {store} onSelect={showTab} />

  <p class="sr-only" aria-live="polite" data-testid="biome-status">
    {#if store.saveState === "idle" && store.draft && !store.draft.dirty && store.draft.entityId}
      Biome saved.
    {/if}
  </p>

  {#if profileParam && profileMissing}
    <BiomeNotice
      message={store.openError ?? "We couldn't open that biome."}
      onAction={backToLibrary}
    />
  {:else if store.view === "editor"}
    <BiomeEditorView {store} />
  {:else if store.view === "compare"}
    <BiomeCompare {store} onBrowse={() => showTab("library")} />
  {:else if store.view === "mine"}
    <BiomeMineView {store} />
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
