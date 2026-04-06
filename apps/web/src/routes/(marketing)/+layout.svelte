<script lang="ts">
  import "../../app.css";
  import { SCHEMA_ORG } from "$lib/config";
  let { children } = $props();

  const jsonLdScript = $derived(
    `<script type="application/ld+json">${JSON.stringify(SCHEMA_ORG)}</scr` +
      `ipt>`,
  );
</script>

<svelte:head>
  {@html jsonLdScript}
</svelte:head>

{@render children()}
