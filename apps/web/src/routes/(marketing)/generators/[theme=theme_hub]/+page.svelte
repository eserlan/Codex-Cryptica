<script lang="ts">
  import { onMount } from "svelte";
  import { themeStore } from "#lib/stores/theme.svelte.js";
  import { hubContext } from "#lib/stores/hub-context.svelte.js";
  import { getLandingPagesForHub } from "#lib/content/for/registry.js";
  import type { PageData } from "./$types";
  import { themeConfig } from "./theme-config";
  import ThemeHubHead from "./ThemeHubHead.svelte";
  import ThemeHubHeader from "./ThemeHubHeader.svelte";
  import GeneratorCardGrid from "./GeneratorCardGrid.svelte";
  import CampaignGuides from "./CampaignGuides.svelte";

  let { data }: { data: PageData } = $props();
  const config = $derived(themeConfig[data.theme]);
  const landingPages = $derived(getLandingPagesForHub(data.theme));

  function applyTheme() {
    themeStore.setTheme(config.localStorageId);
  }

  function selectGenerator() {
    applyTheme();
    hubContext.set(data.theme);
  }

  onMount(applyTheme);
</script>

<ThemeHubHead theme={data.theme} {config} />

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg"
  style:background-image="var(--bg-texture-overlay)"
>
  <ThemeHubHeader {config} />
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
    <GeneratorCardGrid
      cards={config.cards}
      theme={data.theme}
      onselect={selectGenerator}
    />
    <CampaignGuides pages={landingPages} />
  </div>
</div>
