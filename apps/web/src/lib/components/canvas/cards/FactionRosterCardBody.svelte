<script lang="ts">
  import { getFactionRelations } from "./entity-card-variant";
  import FactionRosterMemberCard from "./FactionRosterMemberCard.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  let {
    entity,
  }: {
    entity: any;
  } = $props();

  const factionData = $derived(getFactionRelations(entity, vault.entities));
  const rosterMembers = $derived(factionData.allRosterMembers || []);
  const memberCount = $derived(factionData.memberCount || 0);

  // Extract a clean excerpt for the header description
  const excerpt = $derived.by(() => {
    if (!entity?.content) {
      return "The characters who form the core of this faction. Click any character for detailed chronicle and relations.";
    }
    const lines = entity.content
      .split("\n")
      .map((l: string) => l.trim())
      .filter(
        (l: string) =>
          l &&
          !l.startsWith("#") &&
          !l.startsWith("---") &&
          !l.startsWith(">") &&
          !l.startsWith("-") &&
          !l.startsWith("*"),
      );
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/[*_`]/g, "");
      return firstLine.length > 160 ? `${firstLine.slice(0, 159)}…` : firstLine;
    }
    return "The characters who form the core of this faction. Click any character for detailed chronicle and relations.";
  });
</script>

<div
  class="faction-roster-body flex flex-col w-full text-theme-text select-none"
>
  <!-- Header Area -->
  <div class="px-5 pt-4 pb-2 border-b border-theme-border/30">
    <div class="flex items-center justify-between gap-3">
      <h2
        class="font-serif font-black text-xl sm:text-2xl uppercase tracking-wider text-theme-text font-header truncate"
      >
        {entity?.title || "Faction Roster"}
      </h2>
    </div>
    <p class="text-xs text-theme-muted leading-relaxed mt-1 font-body">
      {excerpt}
    </p>
  </div>

  <!-- Members Grid -->
  <div class="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
    {#each rosterMembers as member (member.target)}
      <FactionRosterMemberCard {member} isLeader={member.isLeader} />
    {:else}
      <div
        class="col-span-full py-8 text-center text-xs text-theme-muted italic border border-dashed border-theme-border/40 rounded-lg"
      >
        No leaders or members connected yet.
      </div>
    {/each}
  </div>

  <!-- Card Footer Line -->
  <div
    class="px-5 py-3 border-t border-theme-border/30 flex items-center justify-between text-micro font-mono tracking-widest text-theme-muted uppercase"
  >
    <span class="truncate mr-2">
      ROSTER — {entity?.title || "FACTION"}
    </span>
    <span class="shrink-0">
      {memberCount}
      {memberCount === 1 ? "MEMBER" : "MEMBERS"}
    </span>
  </div>
</div>
