<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fly, fade } from "svelte/transition";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import {
    openEntityPopout,
    persistZenPopoutPayload,
  } from "$lib/utils/zen-popout";

  import { clipboardService } from "$lib/services/ClipboardService";
  import ZenImageLightbox from "../zen/ZenImageLightbox.svelte";
  import { createEditState } from "$lib/hooks/useEditState.svelte";
  import { createZenModeActions } from "$lib/hooks/useZenModeActions.svelte";
  import ZenHeader from "../zen/ZenHeader.svelte";
  import ZenSidebar from "../zen/ZenSidebar.svelte";
  import ZenContent from "../zen/ZenContent.svelte";
  import DetailMapTab from "$lib/components/entity-detail/DetailMapTab.svelte";

  const isPopout = $derived(
    /\/vault\/[^/]+\/entity\/[^/]+$/.test(page.url.pathname),
  );

  let entityId = $derived(uiStore.zenModeEntityId);
  let entity = $derived(entityId ? vault.entities[entityId] : null);

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

  // Close Zen Mode if the entity being viewed is deleted
  $effect(() => {
    if (uiStore.showZenMode && entityId && !entity) {
      uiStore.closeZenMode();
    }
  });

  // Keep the guest popout payload fresh after Zen Mode renders and after
  // lazy-loaded entity content updates the active entity snapshot.
  $effect(() => {
    if (!uiStore.showZenMode || !entity || !vault.isGuest) return;
    persistZenPopoutPayload(entity, true);
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

  const handleDelete = async () => {
    if (entity) {
      await actions.handleDelete(entity, () => {
        handleClose();
      });
    }
  };

  const handleClose = async () => {
    if (isPopout) {
      const confirmed = await uiStore.confirm({
        title: "Close tab?",
        message: `Close the tab for "${entity?.title ?? "this entity"}"?`,
        confirmLabel: "Close tab",
      });
      if (confirmed) window.close();
      return;
    }
    actions.handleClose(() => {
      uiStore.closeZenMode();
    });
  };

  const handlePopOut = () => {
    if (!entity) return;
    const popOutEntity = async () => {
      let entityForPopout = entity;

      if (vault.isGuest && entityId && !entity.content) {
        await vault.loadEntityContent(entityId);
        entityForPopout = vault.entities[entityId] ?? entityForPopout;
      }

      // Convert blob URL → data URL so the image survives cross-tab (no P2P in popout)
      if (resolvedImageUrl) {
        try {
          const resp = await fetch(resolvedImageUrl);
          const blob = await resp.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          entityForPopout = { ...entityForPopout, image: dataUrl };
        } catch {
          // silently skip — image just won't appear in the popout
        }
      }

      // Collect stubs for linked entities — needed for connection rendering in popout
      const seen = new Set<string>();
      const extraEntities: (typeof entity)[] = [];
      const addStub = (id: string) => {
        if (seen.has(id)) return;
        seen.add(id);
        const e = vault.entities[id];
        if (e) extraEntities.push(e);
      };
      for (const conn of entityForPopout.connections ?? [])
        addStub(conn.target);
      for (const item of vault.inboundConnections[entityForPopout.id] ?? [])
        addStub(item.sourceId);

      openEntityPopout(
        vault.activeVaultId ?? "guest",
        entityForPopout,
        base,
        vault.isGuest,
        extraEntities.length > 0 ? extraEntities : undefined,
      );
      uiStore.closeZenMode();
    };

    void popOutEntity();
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
    uiStore.zenModeEntityId = id;
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
</script>

<svelte:window
  onkeydown={(e) => {
    if (!uiStore.showZenMode) return;

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
      if (!isPopout) handleClose();
    } else if (!isEditing) {
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
  }}
/>

{#if uiStore.showZenMode && entity}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 bg-black/90 backdrop-blur-md"
    transition:fade={{ duration: 200 }}
    onclick={isPopout ? undefined : handleClose}
    data-testid="zen-mode-modal"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="entity-modal-title"
      tabindex="-1"
      class="zen-dialog w-full md:max-w-6xl h-full md:h-[90vh] bg-theme-bg md:border border-theme-border shadow-2xl flex flex-col overflow-hidden relative"
      style:--local-radius="var(--theme-border-radius)"
      style:--local-width="var(--theme-border-width)"
      style:box-shadow="var(--theme-glow)"
      style="background-image: var(--bg-texture-overlay)"
      transition:fly={{ y: 20, duration: 300 }}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Decorative Corners -->
      <div
        class="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-theme-primary/30 rounded-tl-lg pointer-events-none hidden md:block"
      ></div>
      <div
        class="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-theme-primary/30 rounded-tr-lg pointer-events-none hidden md:block"
      ></div>
      <div
        class="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-theme-primary/30 rounded-bl-lg pointer-events-none hidden md:block"
      ></div>
      <div
        class="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-theme-primary/30 rounded-br-lg pointer-events-none hidden md:block"
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
        onClose={handleClose}
        onPopOut={isPopout ? undefined : handlePopOut}
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
              onShowLightbox={() => (showLightbox = true)}
              onNavigate={navigateTo}
              onDelete={handleDelete}
            />

            <ZenContent {entity} bind:editState bind:scrollContainer />
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
    </div>
  </div>

  <ZenImageLightbox
    bind:show={showLightbox}
    imageUrl={resolvedImageUrl}
    title={entity.title}
  />
{/if}

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

  .zen-dialog {
    border-radius: var(--local-radius);
    border-width: var(--local-width);
  }

  @media (max-width: 767px) {
    .zen-dialog {
      --local-radius: 0;
      --local-width: 0;
    }
  }
</style>
