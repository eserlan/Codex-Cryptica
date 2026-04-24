<script lang="ts">
  import { getIconClass } from "$lib/utils/icon";
  import { categories } from "$lib/stores/categories.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import type { Entity } from "schema";
  import AliasInput from "$lib/components/labels/AliasInput.svelte";
  import {
    dispatchSearchEntityFocus,
    DEFAULT_SEARCH_ENTITY_ZOOM,
  } from "$lib/components/search/search-focus";

  import { page } from "$app/state";
  import { base } from "$app/paths";

  let {
    entity,
    editState = $bindable(),
    isSaving,
    isCopied,
    onCopy,
    onStartEdit,
    onCancelEdit,
    onSave,
    onClose,
    onPopOut,
    onApproveDraft,
    onRejectDraft,
    isDraftActioning = false,
  } = $props<{
    entity: Entity;
    editState: any;
    isSaving: boolean;
    isCopied: boolean;
    onCopy: () => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSave: () => Promise<void>;
    onClose: () => void;
    onPopOut?: () => void;
    onApproveDraft?: () => void;
    onRejectDraft?: () => void;
    isDraftActioning?: boolean;
  }>();

  const isGraphView = $derived.by(() => {
    const path = page.url.pathname;
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    return path === base || path === normalizedBase || path === "/";
  });

  const handleFindInGraph = () => {
    const entityId = entity?.id;
    onClose();
    // Short delay to let the modal close transition finish
    setTimeout(() => {
      if (!entityId) return;

      // This will trigger GraphView to center and zoom
      dispatchSearchEntityFocus(entityId, DEFAULT_SEARCH_ENTITY_ZOOM);

      // This ensures the entity sidebar is open to this entity
      vault.selectedEntityId = entityId;

      // Signal finding
      ui.findInGraph();
    }, 300);
  };
</script>

<header
  style="background-image: var(--bg-texture-overlay)"
  class="px-4 md:px-6 py-2 md:py-3 border-b border-theme-border bg-theme-surface flex justify-between items-start shrink-0"
  data-testid="zen-header"
>
  <div class="flex-1 mr-4 md:mr-8">
    <div class="flex items-center gap-3 mb-1">
      <span
        class="{getIconClass(
          categories.getCategory(
            editState.isEditing ? editState.type : entity?.type || '',
          )?.icon,
        )} text-theme-primary w-5 h-5"
      ></span>
      {#if editState.isEditing}
        <select
          bind:value={editState.type}
          aria-label="Entity Type"
          class="bg-theme-bg border border-theme-primary text-theme-primary px-2 py-0.5 text-xs font-bold tracking-widest uppercase font-header focus:outline-none rounded ml-2"
        >
          {#each categories.list as cat}
            <option value={cat.id}>{cat.label || cat.id.toUpperCase()}</option>
          {/each}
        </select>
      {:else}
        <span
          class="text-xs font-bold tracking-widest text-theme-primary uppercase font-header"
          >{entity?.type || ""}</span
        >
      {/if}
    </div>
    {#if editState.isEditing}
      <div class="space-y-2">
        <input
          type="text"
          bind:value={editState.title}
          aria-label="Entity Title"
          class="bg-theme-bg border border-theme-primary text-theme-text px-3 py-1 focus:outline-none focus:border-theme-primary font-body font-bold text-2xl md:text-3xl w-full placeholder-theme-muted rounded"
          placeholder="Entity Title"
        />
        <AliasInput bind:aliases={editState.aliases} />
      </div>
    {:else}
      <div class="flex flex-col gap-1">
        <h1
          id="entity-modal-title"
          data-testid="entity-title"
          class="text-2xl md:text-4xl font-body font-bold text-theme-text tracking-wide"
        >
          {entity?.title || ""}
        </h1>
        {#if entity?.aliases && entity.aliases.length > 0}
          <div class="flex flex-wrap gap-1.5 mt-1">
            <span
              class="text-[10px] font-bold text-theme-muted uppercase tracking-widest self-center mr-1"
              >aka:</span
            >
            {#each entity.aliases as alias}
              <div
                class="px-2 py-0.5 rounded bg-theme-primary/5 border border-theme-primary/10 text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
              >
                {alias}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flex items-center gap-2 md:gap-3">
    {#if !editState.isEditing}
      {#if isGraphView}
        <button
          onclick={handleFindInGraph}
          class="px-2 md:px-3 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary transition flex items-center gap-2 rounded text-xs font-bold tracking-widest"
          title="Find in Graph"
          aria-label="Find in Graph"
          data-testid="zen-find-in-graph-button"
        >
          <span class="icon-[lucide--target] w-4 h-4"></span>
        </button>
      {/if}
      <button
        onclick={onCopy}
        class="px-2 md:px-3 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary transition flex items-center gap-2 rounded text-xs font-bold tracking-widest"
        title="Copy Content"
        aria-label="Copy Content"
      >
        {#if isCopied}
          <span class="icon-[lucide--check] w-4 h-4 text-theme-primary"></span>
        {:else}
          <span class="icon-[lucide--copy] w-4 h-4"></span>
        {/if}
      </button>
    {/if}

    {#if !editState.isEditing && entity?.status === "draft" && onApproveDraft && onRejectDraft}
      <button
        onclick={onApproveDraft}
        disabled={isDraftActioning}
        title="Approve draft"
        aria-label="Approve draft"
        class="px-3 md:px-4 py-1.5 border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 text-xs font-bold rounded tracking-widest transition flex items-center gap-2 disabled:opacity-50"
        data-testid="approve-draft-button"
      >
        <span class="icon-[lucide--check] w-3 h-3"></span>
        <span class="hidden sm:inline">APPROVE</span>
      </button>
      <button
        onclick={onRejectDraft}
        disabled={isDraftActioning}
        title="Reject draft"
        aria-label="Reject draft"
        class="px-3 md:px-4 py-1.5 border border-red-500/40 text-red-500 hover:bg-red-500/10 text-xs font-bold rounded tracking-widest transition flex items-center gap-2 disabled:opacity-50"
        data-testid="reject-draft-button"
      >
        <span class="icon-[lucide--trash-2] w-3 h-3"></span>
        <span class="hidden sm:inline">REJECT</span>
      </button>
    {/if}
    {#if !editState.isEditing && !vault.isGuest && entity}
      <button
        onclick={onStartEdit}
        class="px-3 md:px-4 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary text-xs font-bold rounded tracking-widest transition flex items-center gap-2"
        data-testid="edit-entity-button"
      >
        <span class="icon-[lucide--edit-2] w-3 h-3"></span>
        <span class="hidden sm:inline">EDIT</span>
      </button>
    {:else if editState.isEditing}
      <button
        onclick={onCancelEdit}
        class="px-3 md:px-4 py-1.5 text-theme-muted hover:text-theme-text text-xs font-bold rounded tracking-widest transition"
      >
        CANCEL
      </button>
      <button
        onclick={onSave}
        disabled={isSaving}
        class="px-3 md:px-4 py-1.5 bg-theme-primary hover:bg-theme-secondary disabled:opacity-50 text-theme-bg text-xs font-bold rounded tracking-widest transition flex items-center gap-2"
      >
        {#if isSaving}
          <span class="icon-[lucide--loader-2] w-3 h-3 animate-spin"></span>
          <span class="hidden sm:inline">SAVING...</span>
        {:else}
          <span class="icon-[lucide--save] w-3 h-3"></span>
          <span class="hidden sm:inline">SAVE</span>
        {/if}
      </button>
    {/if}

    {#if onPopOut && !editState.isEditing}
      <button
        onclick={onPopOut}
        class="px-2 md:px-3 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary transition flex items-center gap-2 rounded text-xs font-bold tracking-widest"
        title="Open in new tab"
        aria-label="Open in new tab"
      >
        <span class="icon-[heroicons--arrow-top-right-on-square] w-4 h-4"
        ></span>
      </button>
    {/if}

    <div class="w-px h-6 bg-theme-border mx-0.5 md:mx-1"></div>

    <button
      onclick={onClose}
      class="text-theme-muted hover:text-theme-primary transition p-2 hover:bg-theme-primary/10 rounded"
      aria-label="Close"
    >
      <span class="icon-[lucide--x] w-6 h-6"></span>
    </button>
  </div>
</header>
