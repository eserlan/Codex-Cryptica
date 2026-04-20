<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { clipboardService } from "$lib/services/ClipboardService";
  import ZenImageLightbox from "./ZenImageLightbox.svelte";
  import { createEditState } from "$lib/hooks/useEditState.svelte";
  import { createZenModeActions } from "$lib/hooks/useZenModeActions.svelte";
  import ZenHeader from "./ZenHeader.svelte";
  import ZenSidebar from "./ZenSidebar.svelte";
  import ZenContent from "./ZenContent.svelte";
  import DetailMapTab from "$lib/components/entity-detail/DetailMapTab.svelte";
  import { persistZenPopoutPayload } from "$lib/utils/zen-popout";

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

  let activeTab = $derived(uiStore.zenModeActiveTab);
  let showLightbox = $state(false);
  let scrollContainer = $state<HTMLDivElement>();
  let mobileScroller = $state<HTMLDivElement>();
  let tabOverview = $state<HTMLButtonElement>();
  let tabInventory = $state<HTMLButtonElement>();
  let tabMap = $state<HTMLButtonElement>();

  let resolvedImageUrl = $state("");
  let isCopied = $state(false);

  $effect(() => {
    let isStale = false;
    if (entity?.image) {
      vault.resolveImageUrl(entity.image).then((url) => {
        if (!isStale) resolvedImageUrl = url;
      });
    } else {
      resolvedImageUrl = "";
    }
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

  const navigateTo = async (id: string) => {
    if (editState.isEditing) {
      if (
        !(await uiStore.confirm({
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
    if (uiStore.showZenMode) {
      uiStore.zenModeEntityId = id;
    } else {
      uiStore.focusEntity(id);
    }
  };

  const handleTabKeydown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const tabs: ("overview" | "inventory" | "map")[] = [
        "overview",
        "inventory",
        "map",
      ];
      const currentIndex = tabs.indexOf(activeTab);
      const nextIndex =
        e.key === "ArrowRight"
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;

      uiStore.zenModeActiveTab = tabs[nextIndex];
      const nextTab = uiStore.zenModeActiveTab;
      if (nextTab === "overview") tabOverview?.focus();
      else if (nextTab === "inventory") tabInventory?.focus();
      else if (nextTab === "map") tabMap?.focus();
    }
  };

  // Handle keyboard shortcuts
  const handleKeydown = async (e: KeyboardEvent) => {
    if (showLightbox) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        showLightbox = false;
      }
      return;
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

  const ariaRole = $derived(uiStore.showZenMode ? "dialog" : "region");
  const ariaModal = $derived(uiStore.showZenMode ? "true" : undefined);

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
      onPopOut={typeof onPopOut === "function"
        ? () => {
            onPopOut();
            handlePopOutClick();
          }
        : onPopOut
          ? handlePopOutClick
          : undefined}
    />

    <!-- Navigation Tabs -->
    <div
      role="tablist"
      aria-label="Entity Sections"
      style="background-image: var(--bg-texture-overlay)"
      class="flex gap-4 md:gap-8 px-4 md:px-8 border-b border-theme-border bg-theme-surface shrink-0 overflow-x-auto no-scrollbar"
    >
      <button
        bind:this={tabOverview}
        role="tab"
        id="tab-overview"
        aria-selected={activeTab === "overview"}
        aria-controls="panel-overview"
        tabindex={activeTab === "overview" ? 0 : -1}
        class="py-3 text-xs font-bold tracking-widest transition-colors border-b-2 font-header {activeTab ===
        'overview'
          ? 'text-theme-primary border-theme-primary'
          : 'text-theme-muted border-transparent hover:text-theme-text'}"
        onclick={() => (uiStore.zenModeActiveTab = "overview")}
        onkeydown={handleTabKeydown}
      >
        OVERVIEW
      </button>
      {#if !vault.isGuest}
        <button
          bind:this={tabInventory}
          role="tab"
          id="tab-inventory"
          aria-selected={activeTab === "inventory"}
          aria-controls="panel-inventory"
          tabindex={activeTab === "inventory" ? 0 : -1}
          class="py-3 text-xs font-bold tracking-widest transition-colors border-b-2 font-header {activeTab ===
          'inventory'
            ? 'text-theme-primary border-theme-primary'
            : 'text-theme-muted border-transparent hover:text-theme-text'}"
          onclick={() => (uiStore.zenModeActiveTab = "inventory")}
          onkeydown={handleTabKeydown}
        >
          INVENTORY
        </button>
        <button
          bind:this={tabMap}
          role="tab"
          id="tab-map"
          aria-selected={activeTab === "map"}
          aria-controls="panel-map"
          tabindex={activeTab === "map" ? 0 : -1}
          class="py-3 text-xs font-bold tracking-widest transition-colors border-b-2 font-header {activeTab ===
          'map'
            ? 'text-theme-primary border-theme-primary'
            : 'text-theme-muted border-transparent hover:text-theme-text'}"
          onclick={() => (uiStore.zenModeActiveTab = "map")}
          onkeydown={handleTabKeydown}
        >
          MAP
        </button>
      {/if}
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
        >
          <ZenSidebar
            {entity}
            bind:editState
            {resolvedImageUrl}
            {isPopout}
            onShowLightbox={() => (showLightbox = true)}
            onNavigate={navigateTo}
            onDelete={handleDelete}
          />

          <ZenContent
            {entity}
            bind:editState
            bind:scrollContainer
            onNavigate={navigateTo}
            showConnections={true}
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
      {:else if activeTab === "inventory"}
        <div
          role="tabpanel"
          id="panel-inventory"
          aria-labelledby="tab-inventory"
          class="flex-1 p-8 flex items-center justify-center text-theme-muted font-header text-sm italic"
        >
          Inventory system initialization pending...
        </div>
      {/if}
    </div>

    <ZenImageLightbox
      bind:show={showLightbox}
      imageUrl={resolvedImageUrl}
      title={entity.title}
    />
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
