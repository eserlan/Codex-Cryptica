<script lang="ts">
  import SEOPageLayout from "$lib/components/seo/SEOPageLayout.svelte";
  let { data } = $props();
</script>

<SEOPageLayout data={data.solution} type="solution" />
