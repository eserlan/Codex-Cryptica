<script lang="ts">
  import "../../app.css";
  import { base } from "$app/paths";
  import { SCHEMA_ORG } from "$lib/config";
  let { children } = $props();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const schemaOrgString = $derived(JSON.stringify(SCHEMA_ORG));
</script>

<svelte:head>
  <link rel="help" href="{base}/llms.txt" />
  <script type="application/ld+json">
{schemaOrgString}
  </script>
</svelte:head>

{@render children()}
