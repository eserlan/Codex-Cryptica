<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import ZenHeader from "../zen/ZenHeader.svelte";
  import ZenSidebar from "../zen/ZenSidebar.svelte";
  import ZenContent from "../zen/ZenContent.svelte";
  import ZenImageLightbox from "../zen/ZenImageLightbox.svelte";
  import { createEditState } from "$lib/hooks/useEditState.svelte";
  import { createZenModeActions } from "$lib/hooks/useZenModeActions.svelte";
  import { clipboardService } from "$lib/services/ClipboardService";
  import { fade } from "svelte/transition";
  import { untrack } from "svelte";

  let { entityId } = $props<{ entityId: string }>();

  let entity = $derived(vault.entities[entityId] || null);
  let resolvedImageUrl = $state("");
  let showLightbox = $state(false);
  let scrollContainer = $state<HTMLDivElement>();

  // Pass initial entity state; start() will be used to sync on demand
  const editState = createEditState(null);
  const actions = createZenModeActions(editState);

  // Sync edit state when entity changes while NOT editing
  $effect(() => {
    // We only want to react to 'entity' changes
    const currentEntity = entity;

    untrack(() => {
      if (currentEntity && !editState.isEditing) {
        // Only sync metadata fields to avoid triggering incomplete async hydration
        editState.title = currentEntity.title;
        editState.type = currentEntity.type;
        editState.image = currentEntity.image || "";
      }
    });
  });

  // Load content from Dexie when entityId changes
  $effect(() => {
    if (entityId) {
      void vault.loadEntityContent(entityId);
    }
  });

  // Resolve image URL
  $effect(() => {
    let isStale = false;
    if (entity?.image) {
      void vault.resolveImageUrl(entity.image).then((url) => {
        if (!isStale) {
          resolvedImageUrl = url;
        }
      });
    } else {
      resolvedImageUrl = "";
    }
    return () => {
      isStale = true;
    };
  });

  function handleNavigate(id: string) {
    actions.handleClose(() => uiStore.focusEntity(id));
  }

  function handleCopy() {
    if (entity) {
      void clipboardService.copyEntity(entity).then(() => {
        uiStore.notify("Content copied to clipboard");
      });
    }
  }
</script>

<div
  class="flex flex-col h-full bg-theme-bg overflow-hidden relative"
  transition:fade={{ duration: 200 }}
  data-testid="embedded-entity-view"
>
  {#if entity}
    <ZenHeader
      {entity}
      {editState}
      isSaving={actions.isSaving}
      isCopied={false}
      onCopy={() => handleCopy()}
      onStartEdit={() => editState.start(entity!)}
      onCancelEdit={() => actions.handleClose(() => {})}
      onSave={() => actions.saveChanges(entityId)}
      onClose={() => actions.handleClose(() => uiStore.focusEntity(null))}
    />

    <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
      <ZenSidebar
        {entity}
        {editState}
        {resolvedImageUrl}
        onShowLightbox={() => (showLightbox = true)}
        onNavigate={handleNavigate}
        onDelete={() =>
          actions.handleDelete(entity!, () => uiStore.focusEntity(null))}
      />

      <div
        data-testid="embedded-entity-scroll"
        class="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden w-full h-full custom-scrollbar overscroll-contain"
        style="touch-action: pan-y;"
      >
        <ZenContent
          {entity}
          {editState}
          bind:scrollContainer
          showConnections={true}
        />
      </div>
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
        <button
          onclick={() => uiStore.focusEntity(null)}
          class="btnSecondary px-6 py-2"
        >
          Return to Workspace
        </button>
      </div>
    </div>
  {/if}
</div>
