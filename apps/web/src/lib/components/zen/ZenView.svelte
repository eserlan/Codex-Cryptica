<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { clipboardService } from "$lib/services/ClipboardService";
  import { createEditState } from "$lib/hooks/useEditState.svelte";
  import { createZenModeActions } from "$lib/hooks/useZenModeActions.svelte";
  import ZenHeader from "./ZenHeader.svelte";
  import ZenSidebar from "./ZenSidebar.svelte";
  import ZenContent from "./ZenContent.svelte";
  import DetailMapTab from "$lib/components/entity-detail/DetailMapTab.svelte";
  import DetailChatsTab from "$lib/components/entity-detail/DetailChatsTab.svelte";
  import DetailTimelineTab from "$lib/components/entity-detail/DetailTimelineTab.svelte";
  import InlinePreviewOverlay from "$lib/components/ui/InlinePreviewOverlay.svelte";
  import { persistZenPopoutPayload } from "$lib/utils/zen-popout";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { focusEntity } from "$lib/stores/ui/navigation";

  let {
    entityId,
    onClose,
    onPopOut,
    isPopout = false,
    class: className = "",
  } = $props<{
    entityId: string;
    onClose: () => void;
    onPopOut?: () => void;
    isPopout?: boolean;
    class?: string;
  }>();

  let entity = $derived(vault.entities[entityId] || null);

  // Lazy-load content when Zen Mode is opened or navigated
  $effect(() => {
    if (entityId) {
      vault.loadEntityContent(entityId);
    }
  });

  // Logic & State Hooks
  let editState = $state(createEditState(null));
  const actions = createZenModeActions(() => editState);

  let isEditing = $derived(editState.isEditing);
  let isSaving = $derived(actions.isSaving);

  // Keep the guest popout payload fresh
  $effect(() => {
    if (!entity || !vault.isGuest) return;
    persistZenPopoutPayload(vault.activeVaultId ?? "guest", entity, true);
  });

  let activeTab = $derived(modalUIStore.zenModeActiveTab);
  let scrollContainer = $state<HTMLDivElement>();
  let mobileScroller = $state<HTMLDivElement>();
  let tabOverview = $state<HTMLButtonElement>();
  let tabMap = $state<HTMLButtonElement>();
  let tabChats = $state<HTMLButtonElement>();
  let tabTimeline = $state<HTMLButtonElement>();

  let resolvedImageUrl = $state("");
  let isCopied = $state(false);

  $effect(() => {
    let isStale = false;
    const imagePath = entity?.image;
    const thumbnailPath = entity?.thumbnail;

    const resolveImage = async () => {
      let url = "";
      if (imagePath) {
        url = await vault.resolveImageUrl(imagePath);
      }
      if (!url && thumbnailPath) {
        url = await vault.resolveImageUrl(thumbnailPath);
      }
      if (!isStale) {
        resolvedImageUrl = url;
      }
    };

    resolveImage();

    return () => {
      isStale = true;
    };
  });

  const handleCopy = async () => {
    if (!entity) return;
    const success = await clipboardService.copyEntity(entity, resolvedImageUrl);
    if (success) {
      isCopied = true;
      setTimeout(() => (isCopied = false), 2000);
    }
  };

  const startEditing = () => {
    if (entity) editState.start(entity);
  };

  const cancelEditing = () => {
    editState.cancel();
  };

  const saveChanges = async () => {
    if (entity) await actions.saveChanges(entity.id);
  };

  const handlePopOutClick = async () => {
    await actions.handlePopOut(entityId);
  };

  const handleDelete = async () => {
    if (entity) {
      await actions.handleDelete(entity, () => {
        onClose();
      });
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

  const navigateTo = async (id: string) => {
    if (editState.isEditing) {
      if (
        !(await notificationStore.confirm({
          title: "Unsaved Changes",
          message: "Discard unsaved changes to navigate?",
          confirmLabel: "Discard",
          isDangerous: true,
        }))
      )
        return;
      editState.cancel();
    }

    // Check if we are in modal mode or embedded mode
    if (modalUIStore.showZenMode) {
      modalUIStore.zenModeEntityId = id;
    } else {
      focusEntity(id);
    }
  };

  const visibleZenTabs = $derived.by(() => {
    const list: ("overview" | "map" | "chats" | "timeline")[] = ["overview"];
    if (!vault.isGuest) {
      list.push("map");
    }
    if (entity?.type === "character") {
      list.push("chats");
    }
    list.push("timeline");
    return list;
  });

  const handleTabKeydown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const tabs = visibleZenTabs;
      const currentIndex = tabs.indexOf(activeTab as any);
      const nextIndex =
        e.key === "ArrowRight"
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;

      const nextTab = tabs[nextIndex];
      modalUIStore.zenModeActiveTab = nextTab;
      if (nextTab === "overview") tabOverview?.focus();
      else if (nextTab === "map") tabMap?.focus();
      else if (nextTab === "chats") tabChats?.focus();
      else if (nextTab === "timeline") tabTimeline?.focus();
    }
  };

  // Handle keyboard shortcuts
  const handleKeydown = async (e: KeyboardEvent) => {
    if (modalUIStore.lightbox.show) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        modalUIStore.closeLightbox();
      }
      return;
    }

    if (isEditing) {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === "INPUT" || activeEl?.tagName === "SELECT";
      const isTextarea = activeEl?.tagName === "TEXTAREA";

      if (e.key === "Enter" && isInput) {
        if (
          activeEl.closest('[data-shortcuts="ignore"]') ||
          activeEl.closest('[role="combobox"]')
        ) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        await saveChanges();
        return;
      }

      if (e.key === "Escape" && (isInput || isTextarea)) {
        if (activeEl?.getAttribute("aria-expanded") === "true") {
          return;
        }
        if (activeEl.closest('[data-shortcuts="ignore"]')) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        cancelEditing();
        return;
      }
    }

    if (
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA" ||
      document.activeElement?.closest('[role="combobox"]')
    )
      return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      await actions.handleClose(onClose);
      return;
    }

    if (!isEditing) {
      const scroller =
        window.innerWidth < 768 ? mobileScroller : scrollContainer;
      if (!scroller) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        scroller.scrollBy({ top: 150, behavior: "auto" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scroller.scrollBy({ top: -150, behavior: "auto" });
      }
    }
  };

  const ariaRole = $derived(modalUIStore.showZenMode ? "dialog" : "region");
  const ariaModal = $derived(modalUIStore.showZenMode ? "true" : undefined);

  export function requestClose() {
    actions.handleClose(onClose);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  role={ariaRole}
  aria-modal={ariaModal}
  aria-labelledby="entity-modal-title"
  tabindex="-1"
  class="zen-view w-full h-full bg-theme-bg flex flex-col overflow-hidden relative border-theme-border border-solid {className}"
  style:border-radius="var(--local-radius)"
  style:border-width="var(--local-width)"
  style:--local-radius="var(--theme-border-radius)"
  style:--local-width="var(--theme-border-width)"
  style="background-image: var(--bg-texture-overlay)"
>
  {#if entity}
    <!-- Decorative Corners (Visible in desktop/modal mode via CSS) -->
    <div
      class="decorative-corner absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-theme-primary/30 rounded-tl-lg pointer-events-none hidden md:block"
    ></div>
    <div
      class="decorative-corner absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-theme-primary/30 rounded-tr-lg pointer-events-none hidden md:block"
    ></div>
    <div
      class="decorative-corner absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-theme-primary/30 rounded-bl-lg pointer-events-none hidden md:block"
    ></div>
    <div
      class="decorative-corner absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-theme-primary/30 rounded-br-lg pointer-events-none hidden md:block"
    ></div>

    <!-- Header -->
    <ZenHeader
      {entity}
      bind:editState
      {isSaving}
      {isCopied}
      onCopy={handleCopy}
      onStartEdit={startEditing}
      onCancelEdit={cancelEditing}
      onSave={saveChanges}
      onClose={() => actions.handleClose(onClose)}
      onDelete={handleDelete}
      onPopOut={typeof onPopOut === "function"
        ? () => {
            onPopOut();
            handlePopOutClick();
          }
        : onPopOut
          ? handlePopOutClick
          : undefined}
      onApproveDraft={handleApproveDraft}
      onRejectDraft={handleRejectDraft}
      {isDraftActioning}
    />

    <!-- Navigation Tabs -->
    <div
      role="tablist"
      aria-label="Entity Sections"
      style="background-image: var(--bg-texture-overlay)"
      class="flex gap-4 md:gap-6 px-4 md:px-6 border-b border-theme-border bg-theme-surface shrink-0 overflow-x-auto no-scrollbar"
    >
      <button
        bind:this={tabOverview}
        role="tab"
        id="tab-overview"
        aria-selected={activeTab === "overview"}
        aria-controls="panel-overview"
        tabindex={activeTab === "overview" ? 0 : -1}
        class="py-2 text-xs font-bold tracking-widest transition-colors border-b-2 font-header {activeTab ===
        'overview'
          ? 'text-theme-primary border-theme-primary'
          : 'text-theme-muted border-transparent hover:text-theme-text'}"
        onclick={() => (modalUIStore.zenModeActiveTab = "overview")}
        onkeydown={handleTabKeydown}
      >
        OVERVIEW
      </button>
      {#if !vault.isGuest}
        <button
          bind:this={tabMap}
          role="tab"
          id="tab-map"
          aria-selected={activeTab === "map"}
          aria-controls="panel-map"
          tabindex={activeTab === "map" ? 0 : -1}
          class="py-2 text-xs font-bold tracking-widest transition-colors border-b-2 font-header {activeTab ===
          'map'
            ? 'text-theme-primary border-theme-primary'
            : 'text-theme-muted border-transparent hover:text-theme-text'}"
          onclick={() => (modalUIStore.zenModeActiveTab = "map")}
          onkeydown={handleTabKeydown}
        >
          MAP
        </button>
      {/if}
      {#if visibleZenTabs.includes("chats")}
        <button
          bind:this={tabChats}
          role="tab"
          id="tab-chats"
          aria-selected={activeTab === "chats"}
          aria-controls="panel-chats"
          tabindex={activeTab === "chats" ? 0 : -1}
          class="py-2 text-xs font-bold tracking-widest transition-colors border-b-2 font-header {activeTab ===
          'chats'
            ? 'text-theme-primary border-theme-primary'
            : 'text-theme-muted border-transparent hover:text-theme-text'}"
          onclick={() => (modalUIStore.zenModeActiveTab = "chats")}
          onkeydown={handleTabKeydown}
        >
          CHATS
        </button>
      {/if}

      <button
        bind:this={tabTimeline}
        role="tab"
        id="tab-timeline"
        aria-selected={activeTab === "timeline"}
        aria-controls="panel-timeline"
        tabindex={activeTab === "timeline" ? 0 : -1}
        class="py-2 text-xs font-bold tracking-widest transition-colors border-b-2 font-header {activeTab ===
        'timeline'
          ? 'text-theme-primary border-theme-primary'
          : 'text-theme-muted border-transparent hover:text-theme-text'}"
        onclick={() => (modalUIStore.zenModeActiveTab = "timeline")}
        onkeydown={handleTabKeydown}
      >
        TIMELINE
      </button>
    </div>

    <!-- Main Body -->
    <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
      {#if activeTab === "overview"}
        <div
          role="tabpanel"
          id="panel-overview"
          aria-labelledby="tab-overview"
          bind:this={mobileScroller}
          class="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden w-full h-full custom-scrollbar"
          data-testid="zen-mobile-scroll-container"
          style="touch-action: pan-y;"
        >
          <ZenSidebar
            {entity}
            bind:editState
            {resolvedImageUrl}
            {isPopout}
            onShowLightbox={(rect) =>
              modalUIStore.openLightbox(
                resolvedImageUrl,
                entity.title,
                rect,
                entity.image,
              )}
            onNavigate={navigateTo}
            onDelete={handleDelete}
          />

          <ZenContent
            {entity}
            bind:editState
            bind:scrollContainer
            onNavigate={navigateTo}
            {isPopout}
          />
        </div>
      {:else if activeTab === "map"}
        <div
          role="tabpanel"
          id="panel-map"
          aria-labelledby="tab-map"
          class="flex-1 w-full h-full p-8 overflow-y-auto custom-scrollbar bg-theme-bg"
          style="background-image: var(--bg-texture-overlay)"
        >
          <div
            class="max-w-4xl mx-auto h-full min-h-[500px] border border-theme-border rounded bg-theme-surface/50"
          >
            <DetailMapTab {entity} />
          </div>
        </div>
      {:else if activeTab === "chats" && entity?.type === "character"}
        <div
          role="tabpanel"
          id="panel-chats"
          aria-labelledby="tab-chats"
          class="flex-1 w-full h-full p-8 overflow-y-auto custom-scrollbar bg-theme-bg"
          style="background-image: var(--bg-texture-overlay)"
        >
          <div
            class="max-w-4xl mx-auto h-full p-6 border border-theme-border rounded bg-theme-surface/50"
          >
            <DetailChatsTab {entity} />
          </div>
        </div>
      {:else if activeTab === "timeline"}
        <div
          role="tabpanel"
          id="panel-timeline"
          aria-labelledby="tab-timeline"
          class="flex-1 w-full h-full overflow-y-auto custom-scrollbar bg-theme-bg"
          style="background-image: var(--bg-texture-overlay)"
        >
          <DetailTimelineTab {entity} onNavigate={navigateTo} />
        </div>
      {/if}
    </div>

    <!-- Inline Preview Overlay for AI Drafts -->
    <InlinePreviewOverlay />
  {:else}
    <div class="flex-1 flex items-center justify-center p-12 text-center">
      <div class="max-w-md space-y-4">
        <span
          class="icon-[lucide--alert-circle] w-12 h-12 text-theme-muted opacity-20"
        ></span>
        <h3
          class="text-xl font-header font-bold text-theme-text uppercase tracking-widest"
        >
          Entry Not Found
        </h3>
        <p class="text-theme-muted font-body text-sm">
          The requested record could not be localized within the current
          archive.
        </p>
        <button onclick={onClose} class="btnSecondary px-6 py-2">
          Return to Workspace
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #000;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #15803d33;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #15803d66;
  }

  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Add affordance for horizontal scrolling */
  div[role="tablist"].overflow-x-auto {
    mask-image: linear-gradient(to right, black 90%, transparent);
  }

  @media (max-width: 767px) {
    .zen-view {
      --local-radius: 0;
      --local-width: 0;
    }
  }
</style>
