<script lang="ts">
  import type { Entity, GuestChatConfig } from "schema";
  import { fade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { vault } from "$lib/stores/vault.svelte";
  import ResizerHandle from "./layout/ResizerHandle.svelte";

  // Sub-components
  import DetailHeader from "./entity-detail/DetailHeader.svelte";
  import DetailImage from "./entity-detail/DetailImage.svelte";
  import DetailTabs from "./entity-detail/DetailTabs.svelte";
  import DetailStatusTab from "./entity-detail/DetailStatusTab.svelte";
  import DetailLoreTab from "./entity-detail/DetailLoreTab.svelte";
  import DetailMapTab from "./entity-detail/DetailMapTab.svelte";
  import DetailChatsTab from "./entity-detail/DetailChatsTab.svelte";
  import DetailFooter from "./entity-detail/DetailFooter.svelte";
  import InlinePreviewOverlay from "./ui/InlinePreviewOverlay.svelte";
  import {
    createEntityDetailTabIds,
    type EntityDetailTab,
  } from "./entity-detail/detail-tabs";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import {
    layoutUIStore,
    MAX_SIDEBAR_VW,
    MIN_RIGHT_SIDEBAR_WIDTH,
  } from "$lib/stores/ui/layout-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

  let {
    entity: _entity,
    onClose,
    onDateClick,
  } = $props<{
    entity: Entity | null;
    onClose: () => void;
    onDateClick?: (year: number, month: number) => void;
  }>();

  const tabInstanceId = $props.id();

  // We re-derive the entity from the vault store directly to ensure
  // we pick up reactive updates to its content/lore fields after
  // lazy loading from Dexie.
  let entity = $derived(_entity?.id ? vault.entities[_entity.id] : null);

  // Keep a reference to the last non-null entity for the exit transition
  let lastNonNullEntity = $state<Entity | null>(null);
  $effect(() => {
    if (entity) {
      lastNonNullEntity = entity;
    }
  });

  let activeEntity = $derived(entity || lastNonNullEntity);

  // Lazy-load content when sidebar opens or navigates
  $effect(() => {
    if (entity?.id) {
      vault.loadEntityContent(entity.id);
    }
  });

  let isEditing = $state(false);
  let previousEntityId = $state<string | undefined>(undefined);

  // Edit State
  let editTitle = $state("");
  let editAliases = $state<string[]>([]);
  let editContent = $state("");
  let editLore = $state("");
  let editType = $state("");
  let editImage = $state("");
  let editDate = $state<Entity["date"]>();
  let editStartDate = $state<Entity["start_date"]>();
  let editEndDate = $state<Entity["end_date"]>();
  let editGuestChatConfig = $state<GuestChatConfig | undefined>(undefined);
  let isValid = $derived(true);

  const canGuestEdit = $derived.by(() => {
    if (!vault.isGuest || !entity) return false;
    const name = sessionModeStore.guestUsername?.trim().toLowerCase();
    if (!name) return false;
    return (
      entity.title?.toLowerCase() === name ||
      entity.aliases?.some((a: string) => a.toLowerCase() === name) ||
      entity.labels?.some((l: string) => l.toLowerCase() === name)
    );
  });

  let isDirty = $derived(
    isEditing &&
      entity != null &&
      (editTitle !== entity.title ||
        editContent !== (entity.content ?? "") ||
        editLore !== (entity.lore ?? "") ||
        editType !== entity.type ||
        editImage !== (entity.image ?? "") ||
        JSON.stringify(editAliases) !== JSON.stringify(entity.aliases ?? []) ||
        JSON.stringify(editDate) !== JSON.stringify(entity.date ?? null) ||
        JSON.stringify(editStartDate) !==
          JSON.stringify(entity.start_date ?? null) ||
        JSON.stringify(editEndDate) !==
          JSON.stringify(entity.end_date ?? null) ||
        JSON.stringify(editGuestChatConfig) !==
          JSON.stringify(
            entity.guestChatConfig ?? {
              isEnabled: false,
              contextScope: "public",
              isHostReviewable: true,
              keepMemory: true,
            },
          )),
  );

  $effect(() => {
    if (entity?.id !== previousEntityId) {
      if (isEditing && isDirty) {
        notificationStore.notify("Unsaved changes were discarded.", "info");
      }
      isEditing = false;
      previousEntityId = entity?.id;
    }
  });

  let activeTab = $state<EntityDetailTab>("status");
  let isSaving = $state(false);
  const { tabIds, panelIds } = createEntityDetailTabIds(tabInstanceId);

  $effect(() => {
    if (vault.isGuest && !canGuestEdit && activeTab === "lore") {
      activeTab = "status";
    }
  });

  // Clear lastSelectedNodePosition whenever entity changes (or component is destroyed).
  // This prevents the next intro animation from inheriting a stale graph-node position
  // from a previous entity when the user switches entities rapidly before the outro
  // transition finishes (the cleanup effect only runs on destroy otherwise).
  $effect(() => {
    // Track entity id so this effect re-runs (and its cleanup fires) on every
    // entity change — not just on component destroy. This ensures
    // lastSelectedNodePosition is cleared before the next intro animation,
    // preventing rapid entity switching from animating from a stale node position.
    void entity?.id;
    return () => {
      layoutUIStore.setLastSelectedNodePosition(null);
    };
  });

  // ─── Action handlers ─────────────────────────────────────────────────────────
  // All mutating actions guard on the live `entity` (not the stale `activeEntity`)
  // so they cannot fire against the wrong entity during the exit animation.

  const startEditing = () => {
    if (!entity) return;
    editTitle = entity.title;
    editAliases = [...(entity.aliases || [])];
    editContent = entity.content || "";
    editLore = entity.lore || "";
    editType = entity.type;
    editImage = entity.image || "";
    editDate = entity.date;
    editStartDate = entity.start_date;
    editEndDate = entity.end_date;
    editGuestChatConfig = entity.guestChatConfig
      ? { ...entity.guestChatConfig }
      : {
          isEnabled: false,
          contextScope: "public",
          isHostReviewable: true,
          keepMemory: true,
        };
    isEditing = true;
  };

  const cancelEditing = async () => {
    if (isDirty) {
      const confirmed = await notificationStore.confirm({
        title: "Discard changes?",
        message:
          "You have unsaved edits. Discard them and revert to the saved version?",
        confirmLabel: "Discard changes",
        cancelLabel: "Keep editing",
        isDangerous: false,
      });
      if (!confirmed) return;
    }
    isEditing = false;
  };

  const guardedClose = async () => {
    if (isDirty) {
      const confirmed = await notificationStore.confirm({
        title: "Discard changes?",
        message: "You have unsaved edits. Close the panel and discard them?",
        confirmLabel: "Discard and close",
        cancelLabel: "Keep editing",
        isDangerous: false,
      });
      if (!confirmed) return;
    }
    onClose();
  };

  const saveChanges = async () => {
    if (!entity) return;
    isSaving = true;
    try {
      // Sync "chatty" label: present when guest chat is enabled, absent otherwise
      const chatEnabled = !!editGuestChatConfig?.isEnabled;
      const currentLabels = $state.snapshot(entity.labels ?? []) as string[];
      const labelsWithoutChatty = currentLabels.filter(
        (l: string) => l.toLowerCase() !== "chatty",
      );
      const syncedLabels = chatEnabled
        ? [...labelsWithoutChatty, "chatty"]
        : labelsWithoutChatty;

      await vault.updateEntity(entity.id, {
        title: editTitle,
        aliases: $state.snapshot(editAliases),
        labels: syncedLabels,
        content: editContent,
        lore: editLore,
        image: editImage,
        date: $state.snapshot(editDate),
        start_date: $state.snapshot(editStartDate),
        end_date: $state.snapshot(editEndDate),
        type: editType,
        guestChatConfig: editGuestChatConfig
          ? (() => {
              const snap = $state.snapshot(editGuestChatConfig);
              // Auto-sync ## Personality & Voice from lore into extraInstructions
              // so guests receive it via P2P without needing access to private lore.
              const personalityMatch = editLore?.match(
                /(?:^|\n)##\s+Personality\s*&\s*Voice\s*\n([\s\S]*?)(?=\n##\s+|$)/i,
              );
              const syncedPersonality =
                personalityMatch?.[1]?.trim() || undefined;
              return { ...snap, extraInstructions: syncedPersonality };
            })()
          : undefined,
      });
      isEditing = false;
    } catch (err) {
      console.error("Failed to save changes", err);
      notificationStore.notify(
        "Failed to save changes. Your latest edits were not saved.",
        "info",
      );
    } finally {
      isSaving = false;
    }
  };

  const handleDelete = async () => {
    if (!entity) return;
    const confirmed = await notificationStore.confirm({
      title: "Delete Entity",
      message: `Are you sure you want to permanently delete "${entity.title}"? This action cannot be undone.`,
      confirmLabel: "Delete permanently",
      cancelLabel: "Keep entity",
      isDangerous: true,
    });

    if (confirmed) {
      try {
        await vault.deleteEntity(entity.id);
        onClose();
      } catch (err: any) {
        console.error("Failed to delete entity", err);
        notificationStore.notify(`Error: ${err.message}`, "error");
      }
    }
  };

  let isDraftActioning = $state(false);

  const handleApproveDraft = async () => {
    if (!entity || isDraftActioning || vault.isGuest) return;
    isDraftActioning = true;
    try {
      await vault.updateEntity(entity.id, { status: "active" });
    } catch (err: any) {
      notificationStore.notify(`Error: ${err.message}`, "error");
    } finally {
      isDraftActioning = false;
    }
  };

  const handleRejectDraft = async () => {
    if (!entity || isDraftActioning || vault.isGuest) return;
    isDraftActioning = true;
    try {
      await vault.deleteEntity(entity.id);
      onClose();
    } catch (err: any) {
      notificationStore.notify(`Error: ${err.message}`, "error");
    } finally {
      isDraftActioning = false;
    }
  };

  function expandFrom(node: HTMLElement) {
    const isMobile = layoutUIStore.isMobile;
    const pos = layoutUIStore.lastSelectedNodePosition;

    if (isMobile) {
      node.style.transformOrigin = "bottom center";
      return {
        duration: 550,
        easing: quintOut,
        css: (t: number) => {
          const y = (1 - t) * 100;
          return `transform: translateY(${y}%); opacity: ${t};`;
        },
      };
    }

    if (pos) {
      // Compute transform-origin relative to the panel's own bounding box
      const rect = node.getBoundingClientRect();
      const originX = pos.x - rect.left;
      const originY = pos.y - rect.top;
      node.style.transformOrigin = `${originX}px ${originY}px`;

      return {
        duration: 600,
        easing: quintOut,
        css: (t: number) => {
          const scale = 0.7 + 0.3 * t;
          return `transform: scale(${scale}); opacity: ${t};`;
        },
      };
    }

    // Fallback: slide from right
    node.style.transformOrigin = "right center";
    return {
      duration: 550,
      easing: quintOut,
      css: (t: number) => {
        return `transform: translateX(${(1 - t) * 100}%); opacity: ${Math.min(t * 1.5, 1)};`;
      },
    };
  }
</script>

{#if entity && activeEntity}
  <aside
    transition:expandFrom
    class="pointer-events-auto flex flex-col border-l border-theme-border bg-theme-surface shadow-2xl font-mono absolute right-0 top-0 bottom-0 max-md:top-auto max-md:h-[calc(100%-60px)] z-50 overflow-hidden"
    style:width={layoutUIStore.isMobile
      ? "100%"
      : `${layoutUIStore.rightSidebarWidth}px`}
    style:background-color="var(--theme-panel-fill)"
    style:background-image="var(--bg-theme-surface)"
    style:background-size="cover"
    data-testid="entity-detail-panel"
  >
    {#if !layoutUIStore.isMobile}
      <ResizerHandle
        side="right"
        minWidth={MIN_RIGHT_SIDEBAR_WIDTH}
        maxWidthVW={MAX_SIDEBAR_VW}
        currentWidth={layoutUIStore.rightSidebarWidth}
        onResize={(w) => layoutUIStore.setRightSidebarWidth(w)}
      />
    {/if}

    <div class="absolute inset-0 flex flex-col min-h-0">
      <DetailHeader
        entity={activeEntity}
        {isEditing}
        bind:editTitle
        bind:editAliases
        onClose={guardedClose}
      />

      <div
        class="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-theme-bg overscroll-contain"
        style:background-color="var(--theme-panel-muted)"
        style="background-image: var(--bg-texture-overlay); touch-action: pan-y; display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr;"
      >
        {#key activeEntity.id}
          <div
            in:fade={{ duration: 150, delay: 150 }}
            out:fade={{ duration: 150 }}
            class="col-start-1 row-start-1 flex flex-col w-full h-full min-h-0"
          >
            {#if sessionModeStore.isDemoMode}
              <div
                class="bg-theme-primary/10 border-b border-theme-primary/30 px-4 py-1.5 text-[9px] font-bold text-theme-primary tracking-widest text-center animate-pulse"
              >
                TRANSIENT MODE: CHANGES WILL NOT BE SAVED
              </div>
            {/if}
            {#if activeEntity.status === "draft" && !vault.isGuest}
              <div
                class="flex items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2"
              >
                <span
                  class="text-[9px] font-bold tracking-widest text-amber-500 uppercase"
                >
                  Draft Pending Review
                </span>
                <div class="flex items-center gap-1">
                  <button
                    onclick={handleApproveDraft}
                    disabled={isDraftActioning}
                    title="Approve draft"
                    aria-label="Approve draft"
                    class="flex items-center gap-1 rounded px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-500 transition hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    <span class="icon-[lucide--check] h-3 w-3"></span>
                    Approve
                  </button>
                  <button
                    onclick={handleRejectDraft}
                    disabled={isDraftActioning}
                    title="Reject draft"
                    aria-label="Reject draft"
                    class="flex items-center gap-1 rounded px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <span class="icon-[lucide--trash-2] h-3 w-3"></span>
                    Reject
                  </button>
                </div>
              </div>
            {/if}
            <div
              style:background-image="var(--bg-texture-overlay)"
              class="bg-theme-surface shrink-0"
              style:background-color="var(--theme-panel-fill)"
            >
              <DetailImage entity={activeEntity} {isEditing} bind:editImage />

              <DetailTabs
                entity={activeEntity}
                bind:activeTab
                {isEditing}
                bind:editType
                idPrefix={tabInstanceId}
                {canGuestEdit}
                {onDateClick}
              />
            </div>

            <div class="px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-2">
              <div
                role="tabpanel"
                id={panelIds.status}
                aria-labelledby={tabIds.status}
                hidden={activeTab !== "status"}
              >
                {#if activeTab === "status"}
                  <DetailStatusTab
                    entity={activeEntity}
                    {isEditing}
                    {editType}
                    bind:editContent
                    bind:editLore
                    bind:editStartDate
                    bind:editEndDate
                    bind:editGuestChatConfig
                  />
                {/if}
              </div>
              <div
                role="tabpanel"
                id={panelIds.lore}
                aria-labelledby={tabIds.lore}
                hidden={activeTab !== "lore" ||
                  (vault.isGuest && !canGuestEdit)}
              >
                {#if activeTab === "lore" && (!vault.isGuest || canGuestEdit)}
                  <DetailLoreTab
                    entity={activeEntity}
                    {isEditing}
                    bind:editLore
                  />
                {/if}
              </div>

              <div
                role="tabpanel"
                id={panelIds.map}
                aria-labelledby={tabIds.map}
                hidden={activeTab !== "map"}
              >
                {#if activeTab === "map"}
                  <DetailMapTab entity={activeEntity} />
                {/if}
              </div>

              <div
                role="tabpanel"
                id={panelIds.chats}
                aria-labelledby={tabIds.chats}
                hidden={activeTab !== "chats" ||
                  activeEntity.type !== "character"}
              >
                {#if activeTab === "chats" && activeEntity.type === "character"}
                  <DetailChatsTab entity={activeEntity} />
                {/if}
              </div>
            </div>
          </div>
        {/key}
      </div>

      <DetailFooter
        {isEditing}
        {isSaving}
        {isDirty}
        {isValid}
        {canGuestEdit}
        onCancel={cancelEditing}
        onSave={saveChanges}
        onDelete={handleDelete}
        onStartEdit={startEditing}
      />

      <InlinePreviewOverlay />
    </div>
  </aside>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: var(--theme-panel-muted);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--theme-selected-border);
    border-radius: 2px;
  }
</style>
