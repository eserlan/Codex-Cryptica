<script lang="ts">
  import { getIconClass } from "$lib/utils/icon";
  import { categories } from "$lib/stores/categories.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { guestChatStore } from "$lib/stores/guest-chat.svelte";
  import type { Entity } from "schema";
  import AliasInput from "$lib/components/labels/AliasInput.svelte";
  import {
    dispatchSearchEntityFocus,
    DEFAULT_SEARCH_ENTITY_ZOOM,
  } from "$lib/components/search/search-focus";

  import { page } from "$app/state";
  import { base } from "$app/paths";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { soundBiteService } from "$lib/services/SoundBiteService.svelte";

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
    onDelete,
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
    onDelete?: () => Promise<void>;
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
      layoutUIStore.findInGraph();
    }, 300);
  };
  const parentEntity = $derived(
    entity?.parent ? vault.entities[entity.parent] : null,
  );
</script>

<header
  style="background-image: var(--bg-texture-overlay)"
  class="px-4 md:px-6 py-2 md:py-3 border-b border-theme-border bg-theme-surface flex flex-col md:flex-row gap-2 md:gap-4 md:justify-between md:items-center shrink-0"
  data-testid="zen-header"
>
  <div
    class="flex items-center gap-3 md:gap-4 flex-1 min-w-0 w-full md:w-auto order-2 md:order-1"
  >
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-3 mb-0.5 md:mb-1">
        <span
          class="{getIconClass(
            categories.getCategory(
              editState.isEditing ? editState.type : entity?.type || '',
            )?.icon,
          )} text-theme-primary w-4 h-4 md:w-5 md:h-5"
        ></span>
        {#if editState.isEditing}
          <select
            bind:value={editState.type}
            aria-label="Entity Type"
            class="bg-theme-bg border border-theme-primary text-theme-primary px-2 py-0.5 text-[10px] md:text-xs font-bold tracking-widest uppercase font-header focus:outline-none rounded ml-1 md:ml-2"
          >
            {#each categories.list as cat (cat.id)}
              <option value={cat.id}>{cat.label || cat.id.toUpperCase()}</option
              >
            {/each}
          </select>
        {:else}
          <span
            class="text-[10px] md:text-xs font-bold tracking-widest text-theme-primary uppercase font-header"
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
            class="bg-theme-bg border border-theme-primary text-theme-text px-3 py-1 focus:outline-none focus:border-theme-primary font-body font-bold text-xl md:text-3xl w-full placeholder-theme-muted rounded"
            placeholder="Entity Title"
          />
          <AliasInput bind:aliases={editState.aliases} />
        </div>
      {:else}
        <div class="flex flex-col gap-0.5">
          <h1
            id="entity-modal-title"
            data-testid="entity-title"
            class="text-xl md:text-4xl font-body font-bold text-theme-text tracking-wide whitespace-normal break-words overflow-visible md:truncate"
          >
            {entity?.title || ""}
          </h1>
          {#if entity?.aliases && entity.aliases.length > 0}
            <div class="flex flex-wrap gap-1 md:gap-1.5">
              <span
                class="text-[8px] md:text-[10px] font-bold text-theme-muted uppercase tracking-widest self-center mr-0.5 md:mr-1"
                >aka:</span
              >
              {#each entity.aliases as alias, index (`${entity.id}-alias-${index}`)}
                <div
                  class="px-1.5 md:px-2 py-0.5 rounded bg-theme-primary/5 border border-theme-primary/10 text-[8px] md:text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
                >
                  {alias}
                </div>
              {/each}
            </div>
          {/if}
          {#if parentEntity}
            <div
              class="flex items-center gap-1.5 text-xs text-theme-muted mt-1.5"
              data-testid="zen-parent-indicator"
            >
              <span
                class="icon-[lucide--folder-up] h-3.5 w-3.5 text-theme-muted"
              ></span>
              <span>Parent:</span>
              <button
                type="button"
                onclick={() => modalUIStore.openZenMode(parentEntity.id)}
                class="text-theme-primary hover:text-theme-primary/80 hover:underline font-semibold focus:outline-none transition-all"
              >
                {parentEntity.title}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <div
    class="flex items-center justify-between gap-2 w-full md:w-auto shrink-0 md:ml-4 order-1 md:order-2"
  >
    <button
      type="button"
      onclick={onClose}
      class="md:hidden text-theme-muted hover:text-theme-primary transition p-1 -ml-2 rounded-full shrink-0"
      aria-label="Back"
    >
      <span class="icon-[lucide--chevron-left] w-7 h-7"></span>
    </button>

    <div class="flex items-center gap-1.5 md:gap-3 shrink-0 ml-auto">
      {#if !editState.isEditing}
        {#if isGraphView}
          <button
            onclick={handleFindInGraph}
            class="px-2 md:px-3 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary transition flex items-center gap-2 rounded text-[10px] md:text-xs font-bold tracking-widest"
            title="Find in Graph"
            aria-label="Find in Graph"
            data-testid="zen-find-in-graph-button"
          >
            <span class="icon-[lucide--target] w-4 h-4"></span>
          </button>
        {/if}
        {#if entity && !vault.isGuest}
          <button
            onclick={() => modalUIStore.openPlotDialog(entity.id)}
            class="px-2 md:px-3 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary transition flex items-center gap-2 rounded text-[10px] md:text-xs font-bold tracking-widest"
            title="Generate plot ideas for this entity"
            aria-label="Plot"
            data-testid="zen-plot-button"
          >
            <span class="icon-[lucide--scroll] w-4 h-4"></span>
          </button>
        {/if}
        {#if entity && (!vault.isGuest || entity.soundBite)}
          <button
            onclick={() => {
              if (!entity) return;
              // Skip loadFromEntity if the modal is already showing this entity —
              // calling it again would reset result/error and interrupt active playback.
              const alreadyOpen =
                modalUIStore.soundBite?.show &&
                modalUIStore.soundBite.entityId === entity.id;
              if (!alreadyOpen) soundBiteService.loadFromEntity(entity);
              modalUIStore.openSoundBite(entity.id);
            }}
            class="px-2 md:px-3 py-1.5 border transition flex items-center gap-2 rounded text-[10px] md:text-xs font-bold tracking-widest {entity.soundBite
              ? 'border-theme-accent/30 text-theme-accent hover:border-theme-accent/50 hover:text-theme-accent/80'
              : 'border-theme-border text-theme-secondary hover:text-theme-primary'}"
            title={entity.soundBite ? "Play sound bite" : "Generate sound bite"}
            aria-label="Sound bite"
            data-testid="zen-sound-bite-button"
          >
            <span
              class="{entity.soundBite
                ? 'icon-[lucide--volume-2]'
                : 'icon-[lucide--mic]'} w-4 h-4"
            ></span>
          </button>
        {/if}
        {#if vault.isGuest && entity.type === "character" && entity.guestChatConfig?.isEnabled && entity.guestChatConfig.extraInstructions?.trim()}
          <button
            onclick={() => guestChatStore.openChat(entity.id, entity.title)}
            class="px-2 md:px-3 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary transition flex items-center gap-2 rounded text-[10px] md:text-xs font-bold tracking-widest"
            title="Chat with character"
            aria-label="Chat with character"
            data-testid="zen-guest-chat-button"
          >
            <span class="icon-[lucide--messages-square] w-4 h-4"></span>
          </button>
        {/if}
        <button
          onclick={onCopy}
          class="px-2 md:px-3 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary transition flex items-center gap-2 rounded text-[10px] md:text-xs font-bold tracking-widest"
          title="Copy Content"
          aria-label="Copy Content"
        >
          {#if isCopied}
            <span class="icon-[lucide--check] w-4 h-4 text-theme-primary"
            ></span>
          {:else}
            <span class="icon-[lucide--copy] w-4 h-4"></span>
          {/if}
        </button>
      {/if}

      {#if !editState.isEditing && entity?.status === "draft" && !vault.isGuest && onApproveDraft && onRejectDraft}
        <button
          onclick={onApproveDraft}
          disabled={isDraftActioning}
          title="Approve draft"
          aria-label="Approve draft"
          class="flex items-center gap-2 rounded border border-theme-primary/40 px-2 py-1.5 text-[10px] font-bold tracking-widest text-theme-primary transition hover:bg-theme-primary/10 disabled:opacity-50 md:px-4 md:text-xs"
          data-testid="approve-draft-button"
        >
          <span class="icon-[lucide--check] h-3 w-3"></span>
          <span class="hidden sm:inline">APPROVE</span>
        </button>
        <button
          onclick={onRejectDraft}
          disabled={isDraftActioning}
          title="Reject draft"
          aria-label="Reject draft"
          class="flex items-center gap-2 rounded border border-theme-danger/40 px-2 py-1.5 text-[10px] font-bold tracking-widest text-theme-danger transition hover:bg-theme-danger/10 disabled:opacity-50 md:px-4 md:text-xs"
          data-testid="reject-draft-button"
        >
          <span class="icon-[lucide--trash-2] h-3 w-3"></span>
          <span class="hidden sm:inline">REJECT</span>
        </button>
      {/if}
      {#if !editState.isEditing && !vault.isGuest && entity}
        {#if onDelete}
          <button
            onclick={onDelete}
            class="px-2 md:px-3 py-1.5 border border-theme-danger/40 text-theme-danger hover:bg-theme-danger/10 text-[10px] md:text-xs font-bold rounded tracking-widest transition flex items-center gap-2"
            title="Delete entity"
            aria-label="Delete entity"
            data-testid="delete-entity-button"
          >
            <span class="icon-[lucide--trash-2] w-3 h-3"></span>
          </button>
        {/if}
        <button
          onclick={onStartEdit}
          class="px-2 md:px-4 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary text-[10px] md:text-xs font-bold rounded tracking-widest transition flex items-center gap-2"
          data-testid="edit-entity-button"
        >
          <span class="icon-[lucide--edit-2] w-3 h-3"></span>
          <span class="hidden sm:inline">EDIT</span>
        </button>
      {:else if editState.isEditing}
        <button
          onclick={onCancelEdit}
          class="px-2 md:px-4 py-1.5 text-theme-muted hover:text-theme-text text-[10px] md:text-xs font-bold rounded tracking-widest transition"
        >
          CANCEL
        </button>
        <button
          onclick={onSave}
          disabled={isSaving}
          class="px-2 md:px-4 py-1.5 bg-theme-primary hover:bg-theme-secondary disabled:opacity-50 text-theme-bg text-[10px] md:text-xs font-bold rounded tracking-widest transition flex items-center gap-2"
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
          class="px-2 md:px-3 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary transition flex items-center gap-2 rounded text-[10px] md:text-xs font-bold tracking-widest"
          title="Open in new tab"
          aria-label="Open in new tab"
        >
          <span class="icon-[heroicons--arrow-top-right-on-square] w-4 h-4"
          ></span>
        </button>
      {/if}

      <div
        class="hidden md:block w-px h-6 bg-theme-border mx-0.5 md:mx-1"
      ></div>

      <button
        onclick={onClose}
        class="hidden md:flex text-theme-muted hover:text-theme-primary transition p-2 hover:bg-theme-primary/10 rounded"
        aria-label="Close"
      >
        <span class="icon-[lucide--x] w-6 h-6"></span>
      </button>
    </div>
  </div>
</header>
