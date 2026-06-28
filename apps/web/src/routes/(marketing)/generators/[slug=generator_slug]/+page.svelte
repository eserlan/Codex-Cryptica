<!--
  Thin wrapper — all logic lives in GeneratorPageContent so the themed nested
  route (/generators/[theme]/[slug]) can reuse it without duplication.
-->
<script lang="ts">
  import GeneratorPageContent from "$lib/components/seo/GeneratorPageContent.svelte";
  import type { ValidSlug } from "$lib/components/seo/GeneratorPageContent.svelte";

  let { data } = $props();
</script>

<GeneratorPageContent slug={data.slug as ValidSlug} />
