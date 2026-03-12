<script lang="ts">
  import { getIconClass } from "$lib/utils/icon";
  import { categories } from "$lib/stores/categories.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import type { Entity } from "schema";

  let {
    entity,
    editState,
    isSaving,
    isCopied,
    onCopy,
    onStartEdit,
    onCancelEdit,
    onSave,
    onClose,
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
  }>();
</script>

<header
  style="background-image: var(--bg-texture-overlay)"
  class="px-4 md:px-6 py-4 border-b border-theme-border bg-theme-surface flex justify-between items-start shrink-0"
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
          class="bg-theme-bg border border-theme-primary text-theme-primary px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase font-header focus:outline-none rounded ml-2"
        >
          {#each categories.list as cat}
            <option value={cat.id}>{cat.label || cat.id.toUpperCase()}</option>
          {/each}
        </select>
      {:else}
        <span
          class="text-[10px] font-bold tracking-widest text-theme-primary uppercase font-header"
          >{entity?.type || ""}</span
        >
      {/if}
    </div>
    {#if editState.isEditing}
      <input
        type="text"
        bind:value={editState.title}
        aria-label="Entity Title"
        class="bg-theme-bg border border-theme-primary text-theme-text px-3 py-1 focus:outline-none focus:border-theme-primary font-body font-bold text-2xl md:text-3xl w-full placeholder-theme-muted rounded"
        placeholder="Entity Title"
      />
    {:else}
      <h1
        id="entity-modal-title"
        data-testid="entity-title"
        class="text-2xl md:text-4xl font-body font-bold text-theme-text tracking-wide"
      >
        {entity?.title || ""}
      </h1>
    {/if}
  </div>

  <div class="flex items-center gap-2 md:gap-3">
    {#if !editState.isEditing}
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
