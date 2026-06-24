<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { fly, fade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { base } from "$app/paths";
  import { goto, beforeNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { openEntityPopout } from "$lib/utils/zen-popout";
  import ZenView from "../zen/ZenView.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  const ENTITY_ROUTE = /\/vault\/[^/]+\/entity\/[^/]+$/;

  const isPopout = $derived(ENTITY_ROUTE.test(page.url.pathname));

  // Remember the last in-app view we were on before landing on a standalone
  // entity route. Closing the entity returns the user there (e.g. the Table
  // view) instead of stranding them on the blank entity backdrop. We can't rely
  // on history.back() here: it steps only one history entry, which may itself be
  // ANOTHER standalone entity route (whose page is just a black backdrop with
  // Zen mode closed), leaving the user on a blank screen.
  let lastAppPath: string | null = null;
  beforeNavigate((nav) => {
    const fromPath = nav.from?.url.pathname;
    if (fromPath && !ENTITY_ROUTE.test(fromPath)) {
      lastAppPath = fromPath;
    }
  });

  let entityId = $derived(modalUIStore.zenModeEntityId);
  let entity = $derived(entityId ? vault.entities[entityId] : null);

  let zenViewComponent: ReturnType<typeof ZenView> | undefined = $state();

  // Close Zen Mode if the entity being viewed is deleted
  $effect(() => {
    if (modalUIStore.showZenMode && entityId && !entity) {
      modalUIStore.closeZenMode();
    }
  });

  const handleClose = () => {
    if (isPopout) {
      // window.close() only works for tabs a script opened (the "pop out"
      // action). When this route is reached by normal navigation — e.g.
      // opening an entity from the Table view, or a deep link on mobile — the
      // tab is not script-closable and window.close() is a silent no-op, which
      // would strand the user on a blank entity page. Try to close, then fall
      // back to leaving the standalone entity view.
      window.close();
      setTimeout(() => {
        if (typeof window !== "undefined" && window.closed) return;
        modalUIStore.closeZenMode();
        void goto(lastAppPath ?? `${base}/`);
      }, 50);
      return;
    }
    modalUIStore.closeZenMode();
  };

  const handleBackdropClick = () => {
    if (isPopout) return;
    if (zenViewComponent) {
      zenViewComponent.requestClose();
    } else {
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
      modalUIStore.closeZenMode();
    };

    void popOutEntity();
  };
</script>

{#if modalUIStore.showZenMode && entityId}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 bg-black/90 backdrop-blur-md"
    transition:fade={{ duration: 500 }}
    onclick={handleBackdropClick}
    data-testid="zen-mode-modal"
  >
    <div
      class="w-full md:max-w-6xl h-full md:h-[90vh] shadow-2xl overflow-hidden"
      style:box-shadow="var(--theme-glow)"
      transition:fly={{ y: 50, duration: 550, easing: quintOut }}
      onclick={(e) => e.stopPropagation()}
      role="presentation"
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
