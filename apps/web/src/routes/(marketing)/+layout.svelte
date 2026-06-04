<script lang="ts">
  import "../../app.css";
  import { base } from "$app/paths";
  import { SCHEMA_ORG } from "$lib/config";
  import { safeJsonLd } from "$lib/utils/json-ld";
  let { children } = $props();

  const schemaOrgString = $derived(safeJsonLd(SCHEMA_ORG));
</script>

<svelte:head>
  <link rel="help" href="{base}/llms.txt" />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<scr` +
    `ipt type="application/ld+json">${schemaOrgString}</scr` +
    `ipt>`}
</svelte:head>

{@render children()}
