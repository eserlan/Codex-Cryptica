<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  let { data } = $props();
</script>

<SEOGeneratorLayout slug={data.slug} />
