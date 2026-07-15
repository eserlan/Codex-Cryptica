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

  // --- Zoom (CSS `zoom` so scaled content reflows and scrolls correctly) ---
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;
  let zoom = $state(1);
  const zoomPct = $derived(Math.round(zoom * 100));
  const clampZoom = (z: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 10) / 10));
  const zoomIn = () => (zoom = clampZoom(zoom + ZOOM_STEP));
  const zoomOut = () => (zoom = clampZoom(zoom - ZOOM_STEP));
  const resetZoom = () => (zoom = 1);

  // --- Full-screen (native <dialog> modal: focus-trap + Esc-to-close free) ---
  let dialogEl = $state<HTMLDialogElement>();
  let isFullscreen = $state(false);
  function openFullscreen() {
    isFullscreen = true;
    dialogEl?.showModal?.();
  }
  function closeFullscreen() {
    dialogEl?.close?.();
  }
</script>

{#snippet toolbar(inFullscreen: boolean)}
  <div class="flex items-center gap-1" data-testid="family-toolbar">
    <button
      type="button"
      data-testid="family-zoom-out"
      class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
      onclick={zoomOut}
      disabled={zoom <= MIN_ZOOM}
      aria-label="Zoom out"
    >
      <span class="icon-[lucide--minus] h-3.5 w-3.5" aria-hidden="true"></span>
    </button>
    <button
      type="button"
      data-testid="family-zoom-reset"
      class="min-w-[3rem] rounded border border-theme-border px-1 py-0.5 text-center text-[10px] font-bold text-theme-muted hover:border-theme-primary hover:text-theme-primary"
      onclick={resetZoom}
      aria-label="Reset zoom to 100%"
      title="Reset zoom"
    >
      {zoomPct}%
    </button>
    <button
      type="button"
      data-testid="family-zoom-in"
      class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
      onclick={zoomIn}
      disabled={zoom >= MAX_ZOOM}
      aria-label="Zoom in"
    >
      <span class="icon-[lucide--plus] h-3.5 w-3.5" aria-hidden="true"></span>
    </button>
    {#if inFullscreen}
      <button
        type="button"
        data-testid="family-exit-fullscreen"
        class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={closeFullscreen}
        aria-label="Exit full screen"
      >
        <span class="icon-[lucide--minimize-2] h-3.5 w-3.5" aria-hidden="true"
        ></span>
      </button>
    {:else}
      <button
        type="button"
        data-testid="family-fullscreen"
        class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={openFullscreen}
        aria-label="View family tree full screen"
      >
        <span class="icon-[lucide--maximize-2] h-3.5 w-3.5" aria-hidden="true"
        ></span>
      </button>
    {/if}
  </div>
{/snippet}

{#snippet treeBody()}
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

  <div class="w-full flex-1 overflow-auto">
    <div style:zoom>
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
            No family recorded yet. Add parents, a partner, siblings, or
            children to build {tree.focus.name}'s family tree.
          </p>
        </div>
      {/if}
    </div>
  </div>

  <div
    class="flex flex-wrap items-start justify-center gap-2 border-t border-theme-border pt-3"
  >
    <EmptyFamilySlot {focusId} relation="parent" />
    <EmptyFamilySlot {focusId} relation="partner" />
    <EmptyFamilySlot {focusId} relation="sibling" />
    <EmptyFamilySlot {focusId} relation="child" />
  </div>
{/snippet}

<div class="flex flex-col gap-3">
  <div class="flex justify-end">
    {@render toolbar(false)}
  </div>

  {#if isFullscreen}
    <p class="py-6 text-center text-xs text-theme-muted">
      Family tree is open in full screen.
    </p>
  {:else}
    {@render treeBody()}
  {/if}
</div>

<dialog
  bind:this={dialogEl}
  onclose={() => (isFullscreen = false)}
  closedby="any"
  class="family-fullscreen-dialog m-0 h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] bg-theme-bg text-theme-text"
  aria-label="Family tree, full screen"
>
  {#if isFullscreen}
    <div class="flex h-full flex-col gap-3 p-4 md:p-6">
      <div class="flex items-center justify-between">
        <span
          class="text-[10px] font-bold uppercase tracking-widest text-theme-muted"
        >
          Family — {tree.focus.name}
        </span>
        {@render toolbar(true)}
      </div>
      {@render treeBody()}
    </div>
  {/if}
</dialog>

<style>
  .family-fullscreen-dialog::backdrop {
    background: rgba(0, 0, 0, 0.6);
  }
</style>
