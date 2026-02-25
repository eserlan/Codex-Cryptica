<script lang="ts">
  import LegalDocument from "$lib/components/LegalDocument.svelte";
  let { data } = $props();
</script>

<LegalDocument
  fileName="TERMS.md"
  title="Terms of Service"
  initialContent={data.content}
/>
