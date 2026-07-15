<script lang="ts">
  import GeneratorPageContent from "$lib/components/seo/GeneratorPageContent.svelte";
  import type { ValidSlug } from "$lib/components/seo/generator-page-meta";

  let { data } = $props();
</script>

<!--
  urlHubTheme seeds hubContext and activeTheme from the URL param so the
  generator opens pre-themed without touching localStorage.
-->
<GeneratorPageContent slug={data.slug as ValidSlug} urlHubTheme={data.theme} />
