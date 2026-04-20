<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { fly, fade } from "svelte/transition";
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import { openEntityPopout } from "$lib/utils/zen-popout";
  import ZenView from "../zen/ZenView.svelte";

  const isPopout = $derived(
    /\/vault\/[^/]+\/entity\/[^/]+$/.test(page.url.pathname),
  );

  let entityId = $derived(uiStore.zenModeEntityId);
  let entity = $derived(entityId ? vault.entities[entityId] : null);

  let zenViewComponent: ReturnType<typeof ZenView> | undefined = $state();

  // Close Zen Mode if the entity being viewed is deleted
  $effect(() => {
    if (uiStore.showZenMode && entityId && !entity) {
      uiStore.closeZenMode();
    }
  });

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
    uiStore.closeZenMode();
  };

  const handleBackdropClick = () => {
    if (!isPopout && zenViewComponent) {
      zenViewComponent.requestClose();
    } else if (!isPopout) {
      handleClose();
    }
  };

  const handlePopOut = () => {
    if (!entity) return;
    const popOutEntity = async () => {
      let entityForPopout = entity!;

      if (vault.isGuest && entityId && !entity!.content) {
        await vault.loadEntityContent(entityId);
        entityForPopout = vault.entities[entityId] ?? entityForPopout;
      }

      // Convert blob URL → data URL so the image survives cross-tab
      if (entityForPopout.image) {
        try {
          const resolvedImageUrl = await vault.resolveImageUrl(
            entityForPopout.image,
          );
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
          // silently skip
        }
      }

      openEntityPopout(
        vault.activeVaultId ?? "guest",
        entityForPopout,
        base,
        vault.isGuest,
      );
      uiStore.closeZenMode();
    };

    void popOutEntity();
  };
</script>

{#if uiStore.showZenMode && entityId}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 bg-black/90 backdrop-blur-md"
    transition:fade={{ duration: 200 }}
    onclick={isPopout ? undefined : handleBackdropClick}
    data-testid="zen-mode-modal"
  >
    <div
      class="w-full md:max-w-6xl h-full md:h-[90vh] shadow-2xl overflow-hidden"
      style:box-shadow="var(--theme-glow)"
      transition:fly={{ y: 20, duration: 300 }}
      onclick={(e) => e.stopPropagation()}
    >
      <ZenView
        bind:this={zenViewComponent}
        {entityId}
        {isPopout}
        onClose={handleClose}
        onPopOut={isPopout ? undefined : handlePopOut}
      />
    </div>
  </div>
{/if}
