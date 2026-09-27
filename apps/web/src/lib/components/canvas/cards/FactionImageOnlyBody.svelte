<script lang="ts">
  import { getFactionRelations } from "./entity-card-variant";
  import FactionImageOnlyMember from "./FactionImageOnlyMember.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  let {
    entity,
    showImageLabels = false,
  }: {
    entity: any;
    showImageLabels?: boolean;
  } = $props();

  const factionData = $derived(getFactionRelations(entity, vault.entities));
  const members = $derived(factionData.allRosterMembers || []);
</script>

{#if members.length > 0}
  <div
    class="w-full p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5"
    data-testid="faction-image-only-grid"
  >
    {#each members as member (member.target)}
      <FactionImageOnlyMember {member} showLabel={showImageLabels} />
    {/each}
  </div>
{:else}
  <div
    class="w-full h-full min-h-[180px] flex flex-col items-center justify-center p-4 text-center text-theme-muted"
  >
    <span
      class="icon-[lucide--users] w-8 h-8 text-theme-primary mb-2 opacity-80"
      aria-hidden="true"
    ></span>
    <span
      class="text-xs font-bold text-theme-text font-header truncate max-w-full"
    >
      {entity?.title || "Faction"}
    </span>
    <span class="text-[10px] text-theme-muted mt-1 opacity-60">No members</span>
  </div>
{/if}
