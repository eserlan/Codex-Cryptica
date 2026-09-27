<script lang="ts">
  import {
    getFactionTags,
    type FactionMember,
    type ConnectionStance,
    type LinkGroup,
  } from "./entity-card-variant";
  import GroupedRelationLinks from "./GroupedRelationLinks.svelte";

  const STANCE_RING: Record<ConnectionStance, string> = {
    ally: "border-emerald-400/80",
    friend: "border-sky-400/80",
    enemy: "border-rose-400/80",
    neutral: "border-theme-border",
  };

  let {
    renderedContent,
    members,
    memberCount,
    groups = [],
    large = false,
    entity,
    imageUrl,
  }: {
    renderedContent: string;
    members: FactionMember[];
    memberCount: number;
    groups?: LinkGroup[];
    large?: boolean;
    entity?: any;
    imageUrl?: string | null;
  } = $props();

  const factionTags = $derived(getFactionTags(entity?.labels, entity?.content));
</script>

{#if large}
  <div
    class="faction-dossier grid grid-cols-1 md:grid-cols-12 gap-3.5 text-[11px] font-body"
  >
    <!-- Left Column: Crest, Tags, Members, Excerpt -->
    <div
      class="{groups.length > 0
        ? 'md:col-span-6'
        : 'col-span-12'} flex flex-col gap-2.5 min-w-0"
    >
      {#if imageUrl}
        <div
          class="flex items-center gap-2.5 p-2 rounded-lg bg-theme-bg/60 border border-theme-border/50"
        >
          <div
            class="w-14 h-14 shrink-0 rounded-md overflow-hidden border border-amber-500/40 bg-theme-bg shadow-sm"
          >
            <img
              src={imageUrl}
              alt={entity?.title || "Faction"}
              class="w-full h-full object-cover"
            />
          </div>
          <div class="min-w-0 flex-1">
            <div
              class="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold mb-0.5"
            >
              Faction Crest
            </div>
            <div class="text-xs text-theme-text font-bold truncate font-header">
              {entity?.title || "Faction"}
            </div>
          </div>
        </div>
      {/if}

      {#if factionTags.length > 0}
        <div class="flex flex-wrap gap-1">
          {#each factionTags.slice(0, 6) as tag}
            <span
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium {tag.variant ===
              'ally'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : tag.variant === 'enemy'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : tag.variant === 'neutral'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                    : 'bg-theme-bg border border-theme-border/60 text-theme-muted'}"
            >
              <span class="{tag.icon} w-2.5 h-2.5" aria-hidden="true"></span>
              {tag.label}
            </span>
          {/each}
        </div>
      {/if}

      <div
        class="flex items-center gap-2 p-1.5 rounded-md bg-theme-bg/40 border border-theme-border/40"
        data-testid="faction-card-membership"
        aria-label="{memberCount} {memberCount === 1 ? 'member' : 'members'}"
      >
        <div class="flex -space-x-1.5">
          {#each members as member, memberIndex (`${member.id}-${memberIndex}`)}
            <span
              title={member.title}
              class="flex h-5 w-5 items-center justify-center rounded-full border bg-theme-primary/15 text-[9px] font-bold text-theme-primary {STANCE_RING[
                member.stance
              ]}"
            >
              {(member.title || "?").trim().charAt(0).toUpperCase() || "?"}
            </span>
          {/each}
        </div>
        <span class="text-[10px] text-theme-text font-semibold">
          {memberCount}
          {memberCount === 1 ? "member" : "members"}
        </span>
      </div>

      {#if renderedContent}
        <div class="mt-1">
          <div
            class="text-[9px] font-mono uppercase tracking-widest text-theme-muted font-bold mb-1 border-b border-theme-border/20 pb-0.5"
          >
            Overview
          </div>
          <div
            class="text-[11px] text-theme-muted leading-relaxed line-clamp-6 markdown-content prose prose-invert prose-xs"
            data-testid="faction-card-excerpt"
          >
            {@html renderedContent}
          </div>
        </div>
      {/if}
    </div>

    <!-- Right Column: Sidebar (Leaders & Members) -->
    {#if groups.length > 0}
      <div
        class="md:col-span-6 border-t md:border-t-0 md:border-l border-theme-border/40 md:pl-3 flex flex-col gap-2 min-w-0"
      >
        <GroupedRelationLinks {groups} />
      </div>
    {/if}
  </div>
{:else}
  <div
    class="text-[11px] text-theme-muted leading-relaxed markdown-content prose prose-invert prose-xs font-body"
  >
    {#if imageUrl}
      <div
        class="flex items-center gap-2.5 mb-2.5 p-1.5 rounded-lg bg-theme-bg/60 border border-theme-border/50"
      >
        <div
          class="w-12 h-12 shrink-0 rounded-md overflow-hidden border border-amber-500/40 bg-theme-bg shadow-sm"
        >
          <img
            src={imageUrl}
            alt={entity?.title || "Faction"}
            class="w-full h-full object-cover"
          />
        </div>
        <div class="min-w-0 flex-1">
          <div
            class="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold mb-0.5"
          >
            Faction Crest
          </div>
          <div class="text-[10px] text-theme-text font-semibold truncate">
            {entity?.title || "Faction"}
          </div>
        </div>
      </div>
    {/if}
    {#if factionTags.length > 0}
      <div class="flex flex-wrap gap-1 mb-2">
        {#each factionTags.slice(0, 4) as tag}
          <span
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium {tag.variant ===
            'ally'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : tag.variant === 'enemy'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : tag.variant === 'neutral'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                  : 'bg-theme-bg border border-theme-border/60 text-theme-muted'}"
          >
            <span class="{tag.icon} w-2.5 h-2.5" aria-hidden="true"></span>
            {tag.label}
          </span>
        {/each}
      </div>
    {/if}

    <div
      class="flex items-center gap-2 p-1.5 rounded-md bg-theme-bg/40 border border-theme-border/40"
      data-testid="faction-card-membership"
      aria-label="{memberCount} {memberCount === 1 ? 'member' : 'members'}"
    >
      <div class="flex -space-x-1.5">
        {#each members as member, memberIndex (`${member.id}-${memberIndex}`)}
          <span
            title={member.title}
            class="flex h-5 w-5 items-center justify-center rounded-full border bg-theme-primary/15 text-[9px] font-bold text-theme-primary {STANCE_RING[
              member.stance
            ]}"
          >
            {(member.title || "?").trim().charAt(0).toUpperCase() || "?"}
          </span>
        {/each}
      </div>
      <span class="text-[10px] text-theme-text font-semibold">
        {memberCount}
        {memberCount === 1 ? "member" : "members"}
      </span>
    </div>

    {#if renderedContent}
      <div class="line-clamp-3 mt-2" data-testid="faction-card-excerpt">
        {@html renderedContent}
      </div>
    {/if}
  </div>
{/if}
