<script lang="ts">
  import { navigationHistoryStore } from "$lib/stores/navigation/NavigationHistoryStore.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { browser } from "$app/environment";
  import { beforeNavigate } from "$app/navigation";

  $effect(() => {
    const id = vault?.selectedEntityId;
    if (id) {
      navigationHistoryStore.push(id);
    }
  });

  const isValidEntity = (id: string) => !!vault?.entities?.[id];

  export function tryNavigate(direction: "back" | "forward") {
    const newId =
      direction === "back"
        ? navigationHistoryStore.back(isValidEntity)
        : navigationHistoryStore.forward(isValidEntity);

    if (newId) {
      vault.selectedEntityId = newId;
    } else {
      if (browser) {
        if (direction === "back") {
          window.history.back();
        } else {
          window.history.forward();
        }
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      if (typeof document === "undefined") return;

      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement).isContentEditable);
      if (isInput) return;

      if (modalUIStore?.isAnyModalOpen && !modalUIStore?.showZenMode) {
        return;
      }

      e.preventDefault();

      if (e.key === "ArrowLeft") {
        tryNavigate("back");
      } else {
        tryNavigate("forward");
      }
    }
  }

  beforeNavigate((navigation) => {
    if (navigation.type === "popstate" && navigation.delta !== undefined) {
      if (navigation.delta < 0) {
        const newId = navigationHistoryStore.back(isValidEntity);
        if (newId) {
          navigation.cancel();
          vault.selectedEntityId = newId;
        }
      } else if (navigation.delta > 0) {
        const newId = navigationHistoryStore.forward(isValidEntity);
        if (newId) {
          navigation.cancel();
          vault.selectedEntityId = newId;
        }
      }
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />
