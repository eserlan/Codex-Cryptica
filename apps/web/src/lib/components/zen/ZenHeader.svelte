<script lang="ts">
  import { getIconClass } from "#lib/utils/icon.js";
  import { categories } from "#lib/stores/categories.svelte.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import type { Entity } from "schema";
  import ReportZenButtons from "#lib/components/reports/ReportZenButtons.svelte";
  import AliasInput from "#lib/components/labels/AliasInput.svelte";
  import CategoryRadioGroup from "#lib/components/labels/CategoryRadioGroup.svelte";
  import {
    dispatchSearchEntityFocus,
    DEFAULT_SEARCH_ENTITY_ZOOM,
  } from "#lib/components/search/search-focus.js";

  import { page } from "$app/state";
  import { layoutUIStore } from "#lib/stores/ui/layout-ui.svelte.js";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import { guestVault } from "#lib/stores/guest-vault.svelte.js";
  import { canvasRegistry } from "#lib/stores/canvas-registry.svelte.js";
  import EntityActionBar from "#lib/components/entity-detail/EntityActionBar.svelte";
  import {
    createEntityActions,
    type EntityAction,
  } from "#lib/components/entity-detail/entity-actions.svelte.js";
  import SaveStatusIndicator from "#lib/components/ui/SaveStatusIndicator.svelte";
  import { entityToHandoffSource } from "#lib/services/seo/monsterlabs-handoff.js";
  import { createMonsterLabsHandoffFlow } from "#lib/services/seo/monsterlabs-handoff-flow.svelte.js";
  import MonsterLabsSendingModal from "#lib/components/modals/MonsterLabsSendingModal.svelte";

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
  }: {
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
  } = $props();

  /**
   * Hands this entity's content off to MonsterLabs' D&D monster or magic
   * item generator in a new tab (#2871, #2872). Read-only against this
   * vault, like Send to Shelf. The user confirms in a modal first; only
   * after that confirm does the Oracle compression call run (shown as its
   * own "loading" state), and MonsterLabs opens once the URL is ready.
   */
  const monsterLabsFlow = createMonsterLabsHandoffFlow();

  const isGraphView = $derived(
    page.url.pathname === "/" || page.url.pathname === "",
  );

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

  // Guests read the hierarchy but never rearrange it.
  const canEditParent = $derived(!vault.isGuest);

  const existingCanvas = $derived.by(() => {
    if (!entity) return undefined;
    return canvasRegistry.findCanvasForEntity(entity.id, entity.title);
  });

  const entityActions = createEntityActions(
    () => ({
      entity,
      isGuest: vault.isGuest,
      isGraphView,
      canGuestEdit: false,
      publishId: guestVault.publishId,
      existingCanvas,
      onStartEdit,
      onDelete,
      onMonsterLabs: () => monsterLabsFlow.start(entityToHandoffSource(entity)),
      monsterLabsOpen: monsterLabsFlow.open,
      monsterLabsLoading: monsterLabsFlow.state === "loading",
    }),
    { findInGraph: () => handleFindInGraph() },
  );

  // Zen keeps its long-standing test ids; Expand makes no sense inside Zen.
  const zenTestIds: Record<string, string> = {
    edit: "edit-entity-button",
    "copy-link": "zen-copy-guest-link-button",
    "find-in-graph": "zen-find-in-graph-button",
    chat: "zen-guest-chat-button",
    "sound-bite": "zen-sound-bite-button",
    "delve-map": "zen-build-delve-canvas-button",
    shelf: "zen-send-to-shelf-button",
    monsterlabs: "zen-send-to-monsterlabs-button",
  };

  const zenOnlyActions = $derived.by((): EntityAction[] => {
    const extra: EntityAction[] = [
      {
        id: "copy-content",
        label: "Copy content",
        icon: isCopied ? "icon-[lucide--check]" : "icon-[lucide--copy]",
        run: async () => onCopy(),
        placement: "menu",
        tone: "default",
        testId: "zen-copy-content-button",
        state: isCopied ? "done" : undefined,
      },
    ];
    if (onPopOut) {
      extra.push({
        id: "pop-out",
        label: "Open in new tab",
        icon: "icon-[lucide--square-arrow-out-up-right]",
        run: async () => onPopOut(),
        placement: "menu",
        tone: "default",
        testId: "zen-pop-out-button",
      });
    }
    return extra;
  });

  const zenActions = $derived.by(() => {
    const shared = entityActions.actions
      .filter((a) => a.id !== "expand")
      .map((a) => ({ ...a, testId: zenTestIds[a.id] ?? a.testId }));
    // Delete stays last, set apart from the rest.
    const last = shared.at(-1);
    return last?.tone === "danger"
      ? [...shared.slice(0, -1), ...zenOnlyActions, last]
      : [...shared, ...zenOnlyActions];
  });
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
      {#if editState.isEditing}
        <div class="mb-1.5">
          <CategoryRadioGroup
            bind:value={editState.type}
            ariaLabel="Entity Type"
            showLabel={false}
            compact
            idPrefix="zen-entity-type"
          />
        </div>
      {:else}
        <div class="flex items-center gap-2 mb-0.5 md:mb-1">
          <span
            class="{getIconClass(
              categories.getCategory(entity?.type || '')?.icon,
            )} text-theme-primary w-4 h-4 md:w-5 md:h-5"
          ></span>
          <span
            class="text-micro md:text-xs font-bold tracking-widest text-theme-primary uppercase font-header"
            >{entity?.type || ""}</span
          >
        </div>
      {/if}
      {#if editState.isEditing}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <input
              type="text"
              bind:value={editState.title}
              aria-label="Entity Title"
              class="bg-theme-bg border border-theme-primary text-theme-text px-3 py-1 focus:outline-none focus:border-theme-primary font-body font-bold text-xl md:text-3xl w-full placeholder-theme-muted rounded"
              placeholder="Entity Title"
            />
            <SaveStatusIndicator />
          </div>
          <AliasInput bind:aliases={editState.aliases} />
        </div>
      {:else}
        <div class="flex flex-col gap-0.5">
          <div class="flex items-center gap-2 flex-wrap">
            <h1
              id="entity-modal-title"
              data-testid="entity-title"
              class="text-xl md:text-4xl font-body font-bold text-theme-text tracking-wide whitespace-normal break-words overflow-visible md:truncate"
            >
              {entity?.title || ""}
            </h1>
            <SaveStatusIndicator />
          </div>
          {#if entity?.aliases && entity.aliases.length > 0}
            <div class="flex flex-wrap gap-1 md:gap-1.5">
              <span
                class="text-nano md:text-micro font-bold text-theme-muted uppercase tracking-widest self-center mr-0.5 md:mr-1"
                >aka:</span
              >
              {#each entity.aliases as alias, index (`${entity.id}-alias-${index}`)}
                <div
                  class="px-1.5 md:px-2 py-0.5 rounded bg-theme-primary/5 border border-theme-primary/10 text-nano md:text-micro font-bold text-theme-secondary uppercase tracking-wider"
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
              {#if canEditParent}
                <button
                  type="button"
                  onclick={() => modalUIStore.openParentPicker(entity.id)}
                  class="p-0.5 text-theme-muted hover:text-theme-primary transition-colors"
                  aria-label="Change parent"
                  title="Change parent"
                  data-testid="zen-change-parent-button"
                >
                  <span aria-hidden="true" class="icon-[lucide--pencil] h-3 w-3"
                  ></span>
                </button>
              {/if}
            </div>
          {:else if canEditParent}
            <div class="mt-1.5">
              <button
                type="button"
                onclick={() => modalUIStore.openParentPicker(entity.id)}
                class="touch-target flex items-center gap-1.5 text-xs text-theme-muted hover:text-theme-primary transition-colors focus:outline-none"
                title="Nest this under another entity"
                data-testid="zen-set-parent-button"
              >
                <span
                  aria-hidden="true"
                  class="icon-[lucide--folder-plus] h-3.5 w-3.5"
                ></span>
                <span>Set parent</span>
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
      class="touch-target flex items-center justify-center md:hidden text-theme-muted hover:text-theme-primary transition p-1 -ml-2 rounded-full shrink-0"
      aria-label="Back"
    >
      <span aria-hidden="true" class="icon-[lucide--chevron-left] w-7 h-7"
      ></span>
    </button>

    <div class="flex items-center gap-1.5 md:gap-3 shrink-0 ml-auto">
      {#if !editState.isEditing}
        <EntityActionBar actions={zenActions} />
      {/if}

      {#if !editState.isEditing && entity?.kind === "report" && !vault.isGuest}
        <ReportZenButtons {entity} />
      {/if}

      {#if !editState.isEditing && entity?.status === "draft" && !vault.isGuest && onApproveDraft && onRejectDraft}
        <button
          type="button"
          onclick={onApproveDraft}
          disabled={isDraftActioning}
          title="Approve draft"
          aria-label="Approve draft"
          class="touch-target flex items-center gap-2 rounded border border-theme-primary/40 px-2 py-1.5 text-micro font-bold tracking-widest text-theme-primary transition hover:bg-theme-primary/10 disabled:opacity-50 md:px-4 md:text-xs"
          data-testid="approve-draft-button"
        >
          <span aria-hidden="true" class="icon-[lucide--check] h-3 w-3"></span>
          <span class="hidden sm:inline">APPROVE</span>
        </button>
        <button
          type="button"
          onclick={onRejectDraft}
          disabled={isDraftActioning}
          title="Reject draft"
          aria-label="Reject draft"
          class="touch-target flex items-center gap-2 rounded border border-theme-danger/40 px-2 py-1.5 text-micro font-bold tracking-widest text-theme-danger transition hover:bg-theme-danger/10 disabled:opacity-50 md:px-4 md:text-xs"
          data-testid="reject-draft-button"
        >
          <span aria-hidden="true" class="icon-[lucide--trash-2] h-3 w-3"
          ></span>
          <span class="hidden sm:inline">REJECT</span>
        </button>
      {/if}
      {#if editState.isEditing}
        <button
          onclick={onCancelEdit}
          class="touch-target px-2 md:px-4 py-1.5 text-theme-muted hover:text-theme-text text-micro md:text-xs font-bold rounded tracking-widest transition"
        >
          CANCEL
        </button>
        <button
          onclick={onSave}
          disabled={isSaving}
          class="touch-target px-2 md:px-4 py-1.5 bg-theme-primary hover:bg-theme-secondary disabled:opacity-50 text-theme-bg text-micro md:text-xs font-bold rounded tracking-widest transition flex items-center gap-2"
        >
          {#if isSaving}
            <span
              aria-hidden="true"
              class="icon-[lucide--loader-2] w-3 h-3 animate-spin"
            ></span>
            <span class="hidden sm:inline">SAVING...</span>
          {:else}
            <span aria-hidden="true" class="icon-[lucide--save] w-3 h-3"></span>
            <span class="hidden sm:inline">SAVE</span>
          {/if}
        </button>
      {/if}

      <div
        class="hidden md:block w-px h-6 bg-theme-border mx-0.5 md:mx-1"
      ></div>

      <button
        type="button"
        onclick={onClose}
        class="hidden md:flex text-theme-muted hover:text-theme-primary transition p-2 hover:bg-theme-primary/10 rounded"
        aria-label="Close"
      >
        <span aria-hidden="true" class="icon-[lucide--x] w-6 h-6"></span>
      </button>
    </div>
  </div>
</header>

<MonsterLabsSendingModal
  open={monsterLabsFlow.open}
  state={monsterLabsFlow.state}
  entityLabel={monsterLabsFlow.entityLabel}
  url={monsterLabsFlow.url}
  onConfirm={monsterLabsFlow.confirm}
  onOpen={monsterLabsFlow.close}
  onClose={monsterLabsFlow.close}
/>
