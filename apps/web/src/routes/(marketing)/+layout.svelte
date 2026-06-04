<script lang="ts">
  import "../../app.css";
  import { base } from "$app/paths";
  import { SCHEMA_ORG } from "$lib/config";
  let { children } = $props();

  const schemaOrgString = $derived(JSON.stringify(SCHEMA_ORG));

  // Mark reactive variable as used to satisfy eslint no-unused-vars
  void schemaOrgString;
</script>

<svelte:head>
  <link rel="help" href="{base}/llms.txt" />
  <script type="application/ld+json">
{schemaOrgString}
  </script>
</svelte:head>

{@render children()}
