<script lang="ts">
  import "../../app.css";
  import { SCHEMA_ORG } from "$lib/config";
  let { children } = $props();

  // Stringify schema for head
  const _ldJson = JSON.stringify(SCHEMA_ORG);
</script>

<svelte:head>
  <script type="application/ld+json">
    {@html _ldJson}
  </script>
</svelte:head>

{@render children()}
