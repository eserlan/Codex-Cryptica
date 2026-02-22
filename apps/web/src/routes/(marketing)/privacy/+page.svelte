<script lang="ts">
  import LegalDocument from "$lib/components/LegalDocument.svelte";
  let { data } = $props();
</script>

<LegalDocument
  fileName="PRIVACY.md"
  title="Privacy Policy"
  initialContent={data.content}
/>
