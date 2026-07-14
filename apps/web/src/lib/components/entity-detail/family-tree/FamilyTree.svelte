<script lang="ts">
  import type { FamilyTree } from "@codex/family-engine";
  import FamilyMemberCard from "./FamilyMemberCard.svelte";

  let { tree, onSelect, onOpen } = $props<{
    tree: FamilyTree;
    onSelect?: (id: string) => void;
    onOpen?: (id: string) => void;
  }>();

  // Focus row shows siblings, the focus, then partners left-to-right.
  const focusRow = $derived([...tree.siblings, tree.focus, ...tree.partners]);

  let parentsCollapsed = $state(false);
  let childrenCollapsed = $state(false);
</script>

<div
  data-testid="family-tree"
  class="flex max-w-full flex-col items-center gap-3 overflow-x-auto py-2"
>
  {#if tree.parents.length > 0}
    <button
      type="button"
      data-testid="toggle-parents"
      class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:text-theme-primary"
      aria-expanded={!parentsCollapsed}
      onclick={() => (parentsCollapsed = !parentsCollapsed)}
    >
      <span
        class="{parentsCollapsed
          ? 'icon-[lucide--chevron-right]'
          : 'icon-[lucide--chevron-down]'} h-3 w-3"
        aria-hidden="true"
      ></span>
      {parentsCollapsed ? `Parents (${tree.parents.length}) hidden` : "Parents"}
    </button>
    {#if !parentsCollapsed}
      <div
        data-testid="family-generation-parents"
        class="flex flex-wrap justify-center gap-3"
      >
        {#each tree.parents as parent (parent.entityId)}
          <FamilyMemberCard member={parent} {onSelect} {onOpen} />
        {/each}
      </div>
    {/if}
    <div class="h-3 w-px bg-theme-border" aria-hidden="true"></div>
  {/if}

  <div
    data-testid="family-generation-focus"
    class="flex flex-wrap items-center justify-center gap-3"
  >
    {#each focusRow as member (member.entityId)}
      <FamilyMemberCard
        {member}
        isFocus={member.relation === "focus"}
        {onSelect}
        {onOpen}
      />
    {/each}
  </div>

  {#if tree.children.length > 0}
    <div class="h-3 w-px bg-theme-border" aria-hidden="true"></div>
    <button
      type="button"
      data-testid="toggle-children"
      class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:text-theme-primary"
      aria-expanded={!childrenCollapsed}
      onclick={() => (childrenCollapsed = !childrenCollapsed)}
    >
      <span
        class="{childrenCollapsed
          ? 'icon-[lucide--chevron-right]'
          : 'icon-[lucide--chevron-down]'} h-3 w-3"
        aria-hidden="true"
      ></span>
      {childrenCollapsed
        ? `Children (${tree.children.length}) hidden`
        : "Children"}
    </button>
    {#if !childrenCollapsed}
      <div
        data-testid="family-generation-children"
        class="flex flex-wrap justify-center gap-3"
      >
        {#each tree.children as child (child.entityId)}
          <FamilyMemberCard member={child} {onSelect} {onOpen} />
        {/each}
      </div>
    {/if}
  {/if}
</div>
