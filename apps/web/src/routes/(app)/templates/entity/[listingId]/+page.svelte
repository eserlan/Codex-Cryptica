<script lang="ts">
  import { page } from "$app/state";
  import EntityListingPage from "$lib/components/community-templates/EntityListingPage.svelte";
</script>

<EntityListingPage listingId={page.params.listingId ?? ""} />
