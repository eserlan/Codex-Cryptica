<script lang="ts">
  import type { Entity } from "schema";
  import { untrack } from "svelte";
  import { buildFamilyTree } from "@codex/family-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import FamilyTree from "./family-tree/FamilyTree.svelte";
  import FamilyMemberCard from "./family-tree/FamilyMemberCard.svelte";
  import EmptyFamilySlot from "./family-tree/EmptyFamilySlot.svelte";

  let { entity } = $props<{ entity: Entity }>();

  // Focus can be re-centred on any relative (US3); defaults to this entity and
  // resets whenever the panel switches to a different entity.
  let focusId = $state(untrack(() => entity.id));
  $effect(() => {
    focusId = entity.id;
  });

  const tree = $derived(buildFamilyTree(focusId, vault.entities));
  const hasFamily = $derived(
    tree.parents.length > 0 ||
      tree.children.length > 0 ||
      tree.partners.length > 0 ||
      tree.siblings.length > 0,
  );
  const isRecentred = $derived(focusId !== entity.id);
</script>

<div class="flex flex-col gap-3">
  {#if isRecentred}
    <button
      type="button"
      data-testid="family-recenter-reset"
      class="self-start text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:text-theme-primary"
      onclick={() => (focusId = entity.id)}
    >
      ← Back to {entity.title}
    </button>
  {/if}

  {#if hasFamily}
    <FamilyTree
      {tree}
      onSelect={(id) => (focusId = id)}
      onOpen={(id) => (vault.selectedEntityId = id)}
    />
  {:else}
    <div
      data-testid="family-empty"
      class="flex flex-col items-center gap-3 py-4 text-center"
    >
      <FamilyMemberCard member={tree.focus} isFocus />
      <p class="max-w-xs text-xs text-theme-muted">
        No family recorded yet. Add parents, a partner, or children to build
        {tree.focus.name}'s family tree.
      </p>
    </div>
  {/if}

  <div
    class="flex flex-wrap items-start justify-center gap-2 border-t border-theme-border pt-3"
  >
    <EmptyFamilySlot {focusId} relation="parent" />
    <EmptyFamilySlot {focusId} relation="partner" />
    <EmptyFamilySlot {focusId} relation="child" />
  </div>
</div>
