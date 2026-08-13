<script lang="ts">
  import type { FamilyTree } from "@codex/family-engine";
  import FamilyMemberCard from "./FamilyMemberCard.svelte";

  let { tree, onSelect, onOpen } = $props<{
    tree: FamilyTree;
    onSelect?: (id: string) => void;
    onOpen?: (id: string) => void;
  }>();

  let parentsCollapsed = $state(false);
  let childrenCollapsed = $state(false);

  // Cards are w-40 (10rem); half a card = 5rem. A horizontal connector bar
  // spanning left:5rem→right:5rem joins the centres of the first and last
  // cards in a single non-wrapping row of fixed-width cards.
  const BAR_INSET = "5rem";
</script>

<div
  data-testid="family-tree"
  class="flex max-w-full flex-col items-center gap-1 overflow-x-auto py-2"
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
        class="relative flex flex-nowrap justify-center gap-3 pt-1"
      >
        {#if tree.parents.length > 1}
          <!-- bar joining the parents, sitting just below their cards -->
          <div
            data-testid="parents-bar"
            class="pointer-events-none absolute bottom-0 h-px bg-theme-border"
            style="left:{BAR_INSET};right:{BAR_INSET};"
            aria-hidden="true"
          ></div>
        {/if}
        {#each tree.parents as parent (parent.entityId)}
          <div class="flex flex-col items-center">
            <FamilyMemberCard member={parent} {onSelect} {onOpen} />
            <span class="h-2 w-px bg-theme-border" aria-hidden="true"></span>
          </div>
        {/each}
      </div>
      <!-- stem from the parents down to the focus/couple -->
      <span class="h-4 w-px bg-theme-border" aria-hidden="true"></span>
    {/if}
  {/if}

  <div
    data-testid="family-generation-focus"
    class="flex flex-nowrap items-center justify-center gap-3"
  >
    {#each tree.siblings as sibling (sibling.entityId)}
      <FamilyMemberCard member={sibling} {onSelect} {onOpen} />
    {/each}
    {#if tree.siblings.length > 0}
      <span
        data-testid="sibling-link"
        class="h-px w-6 shrink-0 bg-theme-border"
        aria-hidden="true"
      ></span>
    {/if}

    <FamilyMemberCard member={tree.focus} isFocus {onSelect} {onOpen} />

    {#each tree.partners as partner (partner.entityId)}
      <span
        data-testid="spouse-link"
        class="h-px w-6 shrink-0 bg-theme-border"
        aria-hidden="true"
      ></span>
      <FamilyMemberCard member={partner} {onSelect} {onOpen} />
    {/each}
  </div>

  {#if tree.children.length > 0}
    <!-- stem from the focus/couple down to the children -->
    <span class="h-4 w-px bg-theme-border" aria-hidden="true"></span>
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
        class="relative flex flex-nowrap justify-center gap-3"
      >
        {#if tree.children.length > 1}
          <!-- bar joining the children, sitting just above their cards -->
          <div
            data-testid="children-bar"
            class="pointer-events-none absolute top-0 h-px bg-theme-border"
            style="left:{BAR_INSET};right:{BAR_INSET};"
            aria-hidden="true"
          ></div>
        {/if}
        {#each tree.children as child (child.entityId)}
          <div class="flex flex-col items-center">
            <span class="h-2 w-px bg-theme-border" aria-hidden="true"></span>
            <FamilyMemberCard member={child} {onSelect} {onOpen} />
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
