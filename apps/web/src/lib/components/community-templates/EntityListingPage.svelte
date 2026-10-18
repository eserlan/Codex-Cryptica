<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { EntityTemplateDetail } from "schema";
  import { publicEntityTemplateDirectoryService } from "$lib/services/publishing/PublicEntityTemplateDirectoryService";
  import EntityTemplateListingDetail from "./EntityTemplateListingDetail.svelte";

  type Probe = Awaited<
    ReturnType<typeof publicEntityTemplateDirectoryService.probeListing>
  >;

  let {
    listingId,
    probe = (id: string): Promise<Probe> =>
      publicEntityTemplateDirectoryService.probeListing(id),
    openStatSheet = (id: string) =>
      goto(resolve(`/templates/${id}` as any), { replaceState: true }),
  }: {
    listingId: string;
    probe?: (listingId: string) => Promise<Probe>;
    openStatSheet?: (listingId: string) => unknown;
  } = $props();

  let checked = $state(false);
  let detail = $state<EntityTemplateDetail | null>(null);
  let loadError = $state("");

  onMount(async () => {
    try {
      const result = await probe(listingId);
      if (result.kind === "stat-sheet") {
        // A Stat Sheet listing opened through an entity link: show it properly.
        await openStatSheet(listingId);
        return;
      }
      if (result.kind === "entity") detail = result.detail;
    } catch (cause) {
      loadError =
        cause instanceof Error
          ? cause.message
          : "Could not load this template.";
    }
    checked = true;
  });
</script>

<svelte:head>
  {#if !checked}<title>Community template</title>{/if}
</svelte:head>

{#if !checked}
  <p class="py-12 text-center text-sm text-theme-muted" role="status">
    Loading template…
  </p>
{:else if loadError}
  <p
    class="mx-auto my-12 max-w-3xl rounded-lg border border-theme-border bg-theme-surface p-6 text-sm text-theme-text"
    role="alert"
  >
    {loadError}
  </p>
{:else}
  <EntityTemplateListingDetail {detail} {listingId} />
{/if}
